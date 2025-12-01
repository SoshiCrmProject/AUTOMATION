import { useMemo, useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import ErrorTable from "../components/ErrorTable";
import api from "../lib/apiClient";
import { 
  Card,
  CardHeader,
  Button,
  Badge,
  Input,
  Alert,
  LoadingSpinner,
  EmptyState
} from "../components/ui";
import { pushToast } from "../components/Toast";

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

  const totalErrors = data?.length ?? 0;
  const hasSelection = selected.size > 0;
  const isLoading = !data && !error;

  const clearSelection = () => setSelected(new Set());

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

  const selectionBadge = (
    <Badge variant={hasSelection ? "warning" : "default"} size="sm">
      {hasSelection ? `${selected.size} ${t("selected") || "selected"}` : t("noSelection") || "No rows selected"}
    </Badge>
  );

  const heroAside = (
    <div className="grid grid-2" style={{ width: "100%" }}>
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(6px)"
        }}
      >
        <p className="label" style={{ marginBottom: 4 }}>
          {t("trackedErrors") || "Tracked errors"}
        </p>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{totalErrors.toLocaleString()}</div>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
          {(filtered[0]?.createdAt && new Date(filtered[0].createdAt).toLocaleString()) || t("noRecentData") || "No recent data"}
        </p>
      </div>
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
          background: "rgba(59,130,246,0.08)",
          color: "var(--color-text)"
        }}
      >
        <p className="label" style={{ marginBottom: 4 }}>
          {t("triageQueue") || "Triage queue"}
        </p>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{hasSelection ? selected.size : 0}</div>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
          {hasSelection ? t("readyToRetry") || "Ready to retry" : t("selectRowsHint") || "Select rows to enable batch actions"}
        </p>
      </div>
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", width: "100%" }}>
      <Input
        placeholder={t("search") || "Search"}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<span role="img" aria-label="search">🔍</span>}
        style={{ marginBottom: 0, maxWidth: 320 }}
      />
      <Button
        variant="ghost"
        type="button"
        onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
      >
        {(t("createdAt") || "Created") + (sortDir === "asc" ? " ↑" : " ↓")}
      </Button>
      {selectionBadge}
    </div>
  );

  const sidebar = (
    <div>
      <Card hover={false}>
        <CardHeader
          title={t("errorPlaybook") || "Triage playbook"}
          subtitle={t("errorPlaybookDesc") || "Quick tips for resolving high volume failures."}
          icon="🧭"
        />
        <ul style={{ paddingLeft: 18, margin: "0 0 16px", color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
          <li>{t("errorTipFilter") || "Filter for the same reason code to spot systemic issues."}</li>
          <li>{t("errorTipRetry") || "Retry small batches before bulk replays."}</li>
          <li>{t("errorTipExport") || "Export logs if you need to escalate to support."}</li>
        </ul>
        <Button
          variant="ghost"
          fullWidth
          type="button"
          onClick={clearSelection}
          disabled={!hasSelection}
        >
          {t("clearSelection") || "Clear selection"}
        </Button>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("needExport") || "Need a full export?"} icon="⬇️" />
        <p style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>
          {t("errorExportHint") || "Download the full CSV to share with your ops team."}
        </p>
        <Button
          type="button"
          onClick={downloadFile}
          loading={downloading}
          fullWidth
          variant="primary"
        >
          {t("openFile") || "Download CSV"}
        </Button>
      </Card>
    </div>
  );

  return (
    <PageLayout
      activeHref="/errors"
      title={t("errorFile")}
      description={t("errorFileDesc") || "Realtime automation issues from Shopee and Amazon"}
      heroBadge={<Badge variant={totalErrors > 0 ? "warning" : "success"} size="sm">{t("liveFeed") || "Live feed"}</Badge>}
      actions={
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button type="button" variant="ghost" onClick={downloadFile} loading={downloading}>
            {downloading ? t("loading") || "Loading" : t("openFile") || "Download CSV"}
          </Button>
          {hasSelection && (
            <Button type="button" onClick={retrySelected} loading={retrying}>
              {retrying ? t("loading") || "Loading" : t("retrySelectedLabel", { count: selected.size })}
            </Button>
          )}
        </div>
      }
      heroAside={heroAside}
      heroFooter={
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
          <span>{t("errorHeroFooter") || "Use the filters below to narrow down chronic issues before exporting."}</span>
        </div>
      }
      toolbar={toolbar}
      sidebar={sidebar}
    >
      {error && (
        <Alert variant="error" title={t("genericError") || "Something went wrong"}>
          {t("errorPageLoadFailed") || "We couldn't load the latest error runs. Please refresh and try again."}
        </Alert>
      )}
      <Card hover={false}>
        <CardHeader
          title={t("errorTableTitle") || "Failed automation runs"}
          subtitle={t("errorTableSubtitle") || "Review, filter, and retry problematic orders."}
          icon="⚠️"
          action={selectionBadge}
        />
        {isLoading && <LoadingSpinner text={t("loading") || "Loading"} />}
        {!isLoading && (!data || data.length === 0) && !error && (
          <EmptyState
            icon="🎉"
            title={t("noErrorsTitle") || "All clear"}
            description={t("noErrorsDesc") || "There are no failed runs right now."}
            action={
              <Button type="button" variant="ghost" onClick={downloadFile}>
                {t("downloadLatestReport") || "Download latest report"}
              </Button>
            }
          />
        )}
        {!isLoading && data && data.length > 0 && (
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
      </Card>
    </PageLayout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
