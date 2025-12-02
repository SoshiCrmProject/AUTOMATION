import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import useSWR from "swr";
import PageLayout from "../../components/PageLayout";
import Toast, { pushToast } from "../../components/Toast";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/apiClient";
import { Card, CardHeader, Button, Badge, Textarea, Alert, LoadingSpinner } from "../../components/ui/index";

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

  const statusLabels = useMemo(
    () => ({
      success: t("statusProcessed"),
      error: t("statusError"),
      pending: t("statusPending"),
      manual: t("ordersTableManual")
    }),
    [t]
  );

  const heroHighlights = useMemo(
    () => {
      if (!data) {
        return [] as Array<{ label: string; value: string; helper: string }>;
      }
      return [
        {
          label: t("total") || "Total",
          value: data.orderTotal !== undefined && data.orderTotal !== null ? `${data.currency || ""} ${data.orderTotal.toLocaleString()}` : "—",
          helper: t("orderDetailTotalHelper") || "Shopee order amount"
        },
        {
          label: t("profit") || "Profit",
          value:
            data.expectedProfit !== undefined && data.expectedProfit !== null
              ? `${data.expectedProfitCurrency || data.currency || ""} ${data.expectedProfit.toLocaleString()}`
              : "—",
          helper: t("orderDetailProfitHelper") || "Projected margin"
        },
        {
          label: t("shippingDaysLabel") || "Shipping days",
          value: data.shippingDays !== undefined && data.shippingDays !== null ? `${data.shippingDays}` : "—",
          helper: t("orderDetailShippingHelper") || "Estimated delivery time"
        }
      ];
    },
    [data, t]
  );

  const heroBadge = data ? (
    <StatusBadge status={data.processingStatus} labels={statusLabels} />
  ) : (
    <Badge variant="info" size="lg">
      {t("loading")}
    </Badge>
  );

  const heroAside = data ? (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(148,163,184,0.4)",
            boxShadow: "var(--shadow-xs)"
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", letterSpacing: 0.6, textTransform: "uppercase" }}>{stat.label}</p>
          <strong style={{ display: "block", fontSize: 26, marginTop: 4 }}>{stat.value}</strong>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{stat.helper}</span>
        </div>
      ))}
    </div>
  ) : null;

  const heroFooter = useMemo(() => {
    if (!data) return t("loading");
    const timestamp = data.amazonOrder?.placedAt || data.rawPayload?.createdAt;
    return timestamp
      ? `${t("lastUpdated") || "Last updated"}: ${new Date(timestamp).toLocaleString()}`
      : t("ordersTableStatus");
  }, [data, t]);

  const toolbar = data ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Badge variant="info">{`${t("shop")}: ${data.shop?.name ?? t("unknown")}`}</Badge>
      <Badge variant="warning">{`${t("ordersTableStatus")}: ${data.processingStatus}`}</Badge>
      {data.processingMode && <Badge variant="success">{`${t("processingMode") || "Mode"}: ${data.processingMode}`}</Badge>}
      {amazonUrl && (
        <Button variant="ghost" onClick={() => window.open(amazonUrl, "_blank")}
          >
          🔗 {t("viewOnAmazon")}
        </Button>
      )}
    </div>
  ) : null;

  const actions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {amazonUrl && (
        <Button variant="ghost" onClick={() => window.open(amazonUrl, "_blank")}
          >
          🔗 {t("viewOnAmazon")}
        </Button>
      )}
      <Button variant="ghost" onClick={() => router.push("/orders")}>
        ← {t("back")}
      </Button>
    </div>
  );

  const sidebar = data ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("orderQuickFacts") || "Quick facts"}
          subtitle={t("orderQuickFactsSubtitle") || "Key metadata for troubleshooting"}
          icon="🗂️"
        />
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("ordersTableStatus")}</span>
            <strong>{data.processingStatus}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("processingMode") || "Mode"}</span>
            <strong>{data.processingMode || "—"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("shippingDaysLabel") || "Shipping"}</span>
            <strong>{data.shippingDays ?? "—"}</strong>
          </div>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader
          title={t("amazonOrderId")}
          subtitle={t("amazonOrderStatus") || "Amazon fulfillment status"}
          icon="📦"
        />
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          {data.amazonOrder ? (
            <>
              <div><strong>{data.amazonOrder.amazonOrderId ?? t("statusPending")}</strong></div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{data.amazonOrder.status}</div>
              {data.amazonOrder.purchasePrice !== undefined && (
                <div>
                  {t("total")}: {data.amazonOrder.purchasePrice ?? "—"}
                </div>
              )}
              {data.amazonOrder.placedAt && (
                <div>
                  {t("createdAt")}: {new Date(data.amazonOrder.placedAt).toLocaleString()}
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
              {t("amazonOrderMissing") || "No Amazon order has been created yet."}
            </p>
          )}
        </div>
      </Card>
    </div>
  ) : null;

  if (!data) {
    return (
      <>
        <PageLayout
          activeHref="/orders"
          title={t("orders")}
          description={t("loading")}
          heroBadge={<Badge variant="info" size="lg">{t("loading")}</Badge>}
          heroBackground="linear-gradient(135deg, rgba(226,232,240,0.8) 0%, rgba(248,250,252,0.9) 100%)"
        >
          <LoadingSpinner text={t("loading") || "Loading"} />
        </PageLayout>
        <Toast />
      </>
    );
  }

  const handleRetry = async () => {
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
  };

  const handleManualFulfill = async () => {
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
  };

  const errorCard = data.errorItems?.length ? (
    <Card>
      <CardHeader
        title={t("error")}
        subtitle={t("errorTimeline") || "Latest automation issues"}
        icon="🚨"
      />
      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {data.errorItems.map((error) => (
          <div key={error.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
            <strong>{error.reason || error.errorCode}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
              {error.errorCode}
              {error.filterFailureType ? ` • ${error.filterFailureType}` : ""}
              {error.profitValue !== null && error.profitValue !== undefined ? ` • profit=${error.profitValue}` : ""}
              {error.shippingDays !== null && error.shippingDays !== undefined ? ` • days=${error.shippingDays}` : ""}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{new Date(error.createdAt).toLocaleString()}</div>
            {error.metadata?.screenshot && (
              <div style={{ marginTop: 8 }}>
                <a href={error.metadata.screenshot} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                  {t("openLink")}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  ) : null;

  const manualActionsCard = (
    <Card>
      <CardHeader
        title={t("manualActions")}
        subtitle={t("manualActionsSubtitle") || "Override automation and leave context for teammates"}
        icon="🛠️"
      />
      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Textarea
          label={t("manualNote") || "Manual note"}
          placeholder={t("manualNotePlaceholder") || t("manualNote") || "Add operator note"}
          value={manualNote}
          onChange={(e) => setManualNote(e.target.value)}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={handleRetry} loading={retrying}>
            {retrying ? t("loading") : t("retry")}
          </Button>
          <Button onClick={handleManualFulfill} loading={fulfilling}>
            {fulfilling ? t("loading") : t("manualFulfill")}
          </Button>
        </div>
      </div>
    </Card>
  );

  const summaryCard = (
    <Card>
      <CardHeader
        title={`${t("orders")} ${data.shopeeOrderSn}`}
        subtitle={t("orderSummarySubtitle") || "Shopee payload and linked assets"}
        icon="📄"
      />
      <div style={{ padding: "0 24px 24px", display: "grid", gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("shop")}</p>
          <strong>{data.shop?.name ?? "—"}</strong>
        </div>
        <div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("amazon")}</p>
          {amazonUrl ? (
            <a href={amazonUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
              {amazonUrl}
            </a>
          ) : (
            <span>—</span>
          )}
        </div>
        <div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("expectedProfit") || t("profit")}</p>
          <strong>
            {data.expectedProfit !== undefined && data.expectedProfit !== null
              ? `${data.expectedProfitCurrency || data.currency || ""} ${data.expectedProfit.toLocaleString()}`
              : "—"}
          </strong>
        </div>
        <div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("shippingDaysLabel") || "Shipping days"}</p>
          <strong>{data.shippingDays ?? "—"}</strong>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <PageLayout
        activeHref="/orders"
        title={`🧾 ${t("orders")} ${data.shopeeOrderSn}`}
        description={t("orderDetailSubtitle") || "Detailed automation context for this order"}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(224,242,254,0.9) 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {data.errorItems?.length ? (
            <Alert variant="warning" title={t("errorsDetected") || "Errors detected"}>
              {t("orderHasErrors") || "Automation flagged issues for this order. Review the timeline below before retrying."}
            </Alert>
          ) : null}

          {summaryCard}
          {manualActionsCard}
          {errorCard}
        </div>
      </PageLayout>
      <Toast />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale || "en", ["common"]))
  }
});
