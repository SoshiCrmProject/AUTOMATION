import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import ErrorTable from "../components/ErrorTable";
import { useMemo, useState } from "react";
import api from "../lib/apiClient";
import { 
  Card, CardHeader, Button, Badge, Input, Table, 
  Alert, LoadingSpinner, EmptyState 
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

type ErrorItem = {
  id: string;
  shopeeOrderId?: string | null;
  amazonProductUrl?: string | null;
  errorCode?: string | null;
  reason: string;
  filterFailureType?: string | null;
  profitValue?: number | null;
  shippingDays?: number | null;
  createdAt: string;
  metadata?: { screenshot?: string };
};

const fetcher = (url: string) => api.get(url).then((res) => res.data as ErrorItem[]);

export default function ErrorsPage() {
  const { t } = useTranslation("common");
  const { data, error } = useSWR<ErrorItem[]>("/api/orders/errors", fetcher, { revalidateOnFocus: false });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const downloadFile = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/api/orders/errors/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", t("errorItemsFile") as string);
      document.body.appendChild(link);
      link.click();
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("downloadError"), "error");
    } finally {
      setDownloading(false);
    }
  };

  const retrySelected = async () => {
    setRetrying(true);
    try {
      await Promise.all(Array.from(selected).map((orderId) => api.post(`/api/orders/retry/${orderId}`)));
      setSelected(new Set());
      pushToast(t("actionRetrySelectedSuccess"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("actionRetrySelectedError"), "error");
    } finally {
      setRetrying(false);
    }
  };

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((item) => {
          const term = search.toLowerCase();
          return (
            (item.reason ?? "").toLowerCase().includes(term) ||
            (item.errorCode ?? "").toLowerCase().includes(term) ||
            (item.amazonProductUrl ?? "").toLowerCase().includes(term) ||
            (item.shopeeOrderId ?? "").toLowerCase().includes(term)
          );
        })
        .sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return sortDir === "asc" ? aDate - bDate : bDate - aDate;
        }),
    [data, search, sortDir]
  );

  return (
    <div className="container">
      <AppNav activeHref="/errors" />
      <h1>{t("errorFile")}</h1>
      <p>{t("errorFileDesc")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-ghost" onClick={downloadFile} disabled={downloading}>
          {downloading ? t("loading") : t("openFile")}
        </button>
        {selected.size > 0 && (
          <button className="btn" onClick={retrySelected} disabled={retrying}>
            {retrying ? t("loading") : t("retrySelectedLabel", { count: selected.size })}
          </button>
        )}
      </div>
      <div className="card" style={{ marginTop: "16px" }}>
        <input
          className="input"
            placeholder={t("search") || "Search"}
            style={{ maxWidth: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
            {t("createdAt")} {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
        {!data && !error && <p>{t("loading")}</p>}
        {error && <p style={{ color: "#ef4444" }}>{t("genericError")}</p>}
        {data && (
          <div className="table-responsive">
            <ErrorTable
              selectable
              selected={selected}
              onToggle={(id: string, orderId?: string) => {
                const key = orderId ?? id;
                const next = new Set(selected);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                setSelected(next);
              }}
              items={filtered}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
