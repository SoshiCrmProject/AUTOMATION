import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../../components/AppNav";
import api from "../../lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { pushToast } from "../../components/Toast";
import StatusBadge from "../../components/StatusBadge";

type ErrorItem = {
  id: string;
  errorCode?: string | null;
  reason: string;
  filterFailureType?: string | null;
  amazonProductUrl?: string | null;
  profitValue?: number | null;
  shippingDays?: number | null;
  createdAt: string;
  metadata?: { screenshot?: string };
};

type OrderDetail = {
  id: string;
  shopeeOrderSn: string;
  processingStatus: string;
  processingMode?: string | null;
  orderTotal?: number;
  currency?: string;
  expectedProfit?: number | null;
  expectedProfitCurrency?: string | null;
  shippingDays?: number | null;
  rawPayload?: any;
  shop?: { name: string };
  amazonOrder?: { amazonOrderId: string | null; status: string; purchasePrice?: number | null; placedAt?: string | null } | null;
  errorItems: ErrorItem[];
};

const fetcher = (url: string) => api.get(url).then((res) => res.data as OrderDetail);

export default function OrderDetail() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data, mutate } = useSWR(id ? `/api/orders/${id}` : null, fetcher);
  const [manualNote, setManualNote] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);

  const amazonUrl = useMemo(
    () => data?.rawPayload?.amazonProductUrl || data?.errorItems?.[0]?.amazonProductUrl || null,
    [data]
  );

  if (!data) return <div className="container"><AppNav activeHref="/orders" /><p>{t("loading")}</p></div>;

  return (
    <div className="container">
      <AppNav activeHref="/orders" />
      <div className="card">
        <h1>{t("orders")} {data.shopeeOrderSn}</h1>
        <p>{t("shop")}: {data.shop?.name ?? "—"}</p>
        <p style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {t("ordersTableStatus")}:{" "}
          <StatusBadge
            status={data.processingStatus}
            labels={{
              success: t("statusProcessed"),
              error: t("statusError"),
              pending: t("statusPending"),
              manual: t("ordersTableManual")
            }}
          />{" "}
          {data.processingMode ? <span style={{ color: "#475569" }}>({data.processingMode})</span> : null}
        </p>
        <p>{t("total")}: {data.orderTotal ?? "—"} {data.currency}</p>
        <p>{t("profit")}: {data.expectedProfit ?? "—"} {data.expectedProfitCurrency ?? data.currency}</p>
        <p>{t("shippingDaysLabel") ?? "Shipping days"}: {data.shippingDays ?? "—"}</p>
        <p>
          {t("amazon")}:{" "}
          {amazonUrl ? (
            <a href={amazonUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
              {amazonUrl}
            </a>
          ) : (
            "—"
          )}
        </p>
        {data.amazonOrder && (
          <div className="card" style={{ marginTop: 12 }}>
            <h4>{t("amazonOrderId")}</h4>
            <p>{data.amazonOrder.amazonOrderId ?? t("statusPending")} ({data.amazonOrder.status})</p>
            <p>{t("total")}: {data.amazonOrder.purchasePrice ?? "—"}</p>
            {data.amazonOrder.placedAt && <p>{t("createdAt")}: {new Date(data.amazonOrder.placedAt).toLocaleString()}</p>}
          </div>
        )}
        {data.errorItems?.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <h4>{t("error")}</h4>
            <ul>
              {data.errorItems.map((e) => (
                <li key={e.id} style={{ marginBottom: 8 }}>
                  <div>{e.reason || e.errorCode}</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>
                    {e.errorCode} {e.filterFailureType ? `• ${e.filterFailureType}` : ""}
                    {e.profitValue !== null && e.profitValue !== undefined ? ` • profit=${e.profitValue}` : ""}
                    {e.shippingDays !== null && e.shippingDays !== undefined ? ` • days=${e.shippingDays}` : ""}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(e.createdAt).toLocaleString()}</div>
                  {e.metadata?.screenshot && (
                    <div>
                      <a href={e.metadata.screenshot} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                        {t("openLink")}
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="card" style={{ marginTop: 12 }}>
          <h4>{t("manualActions")}</h4>
          <textarea
            className="input"
            style={{ minHeight: 80 }}
            placeholder={t("manualNote") as string}
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                setRetrying(true);
                try {
                  await api.post(`/api/orders/retry/${data.id}`);
                  pushToast(t("retrySuccess"));
                  mutate();
                } catch (e: any) {
                  pushToast(e?.response?.data?.error ?? t("actionRetryError"), "error");
                } finally {
                  setRetrying(false);
                }
              }}
              disabled={retrying}
            >
              {retrying ? t("loading") : t("retry")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                setFulfilling(true);
                try {
                  await api.post(`/api/orders/manual/${data.id}`, { manualNote });
                  setManualNote("");
                  pushToast(t("actionManualFulfillSuccess"));
                  mutate();
                } catch (e: any) {
                  pushToast(e?.response?.data?.error ?? t("actionManualFulfillError"), "error");
                } finally {
                  setFulfilling(false);
                }
              }}
              disabled={fulfilling}
            >
              {fulfilling ? t("loading") : t("manualFulfill")}
            </button>
            <Link className="btn btn-ghost" href="/orders">{t("back")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale || "en", ["common"]))
  }
});
