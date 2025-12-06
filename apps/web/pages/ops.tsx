import { useEffect, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import StatusBadge from "../components/StatusBadge";
import api from "../lib/apiClient";
import {
  Card,
  CardHeader,
  StatCard,
  Button,
  Input,
  Badge,
  Alert,
  LoadingSpinner
} from "../components/ui";

type QueueHealth = { waiting: number; active: number; failed: number; delayed: number };
type StatusSummary = { lastOrder: string | null; lastAmazon: { createdAt: string; status: string } | null; lastError: { createdAt: string; reason: string } | null };

type Feedback = {
  type: "success" | "error" | "info" | "warning";
  text: string;
};

const LAST_TEST_URL_KEY = "lastOpsProductUrl";

export default function OpsPage() {
  const { t } = useTranslation("common");
  const [queue, setQueue] = useState<QueueHealth | null>(null);
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastQueuedUrl, setLastQueuedUrl] = useState<string | null>(null);

  const load = async () => {
    setLoadingQueue(true);
    try {
      const [q, s, h] = await Promise.allSettled([api.get("/api/ops/queue"), api.get("/api/ops/status"), api.get("/health")]);
      if (q.status === "fulfilled") setQueue(q.value.data);
      if (s.status === "fulfilled") setStatus(s.value.data);
      if (h.status === "fulfilled") setHealth(h.value.data);
    } catch (e: any) {
      setFeedback({ type: "error", text: e?.response?.data?.error ?? (t("genericError") || "Something went wrong") });
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(LAST_TEST_URL_KEY);
      if (cached) {
        setLastQueuedUrl(cached);
      }
    }
  }, []);

  const testScrape = async () => {
    setFeedback(null);
    const normalizedUrl = productUrl.trim();
    if (!normalizedUrl || !/amazon\./i.test(normalizedUrl)) {
      setFeedback({ type: "warning", text: t("pleaseEnterValidAmazonURL") || "Enter a valid Amazon URL" });
      return;
    }
    setTesting(true);
    try {
      const response = await api.post("/api/ops/amazon-scrape", { productUrl: normalizedUrl });
      const details = response.data?.result;
      const summary = details
        ? `${t("testScrapeQueued") || "Amazon scrape queued"} · ¥${details.price.toLocaleString()}`
        : t("testScrapeQueued") || "Amazon scrape queued";
      setFeedback({ type: "success", text: summary });
      localStorage.setItem(LAST_TEST_URL_KEY, normalizedUrl);
      setLastQueuedUrl(normalizedUrl);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const message = e?.response?.data?.error ?? (t("genericError") || "Unable to queue test");
      setFeedback({ type: "error", text: code ? `${code}: ${message}` : message });
    } finally {
      setTesting(false);
    }
  };

  const queueMetrics = [
    { key: "waiting", label: t("waiting") || "Waiting", value: queue?.waiting ?? "—", helper: t("queueWaitingHelper") || "Jobs queued" },
    { key: "active", label: t("active") || "Active", value: queue?.active ?? "—", helper: t("queueActiveHelper") || "Currently processing" },
    { key: "failed", label: t("failed") || "Failed", value: queue?.failed ?? "—", helper: t("queueFailedHelper") || "Need attention" },
    { key: "delayed", label: t("delayed") || "Delayed", value: queue?.delayed ?? "—", helper: t("queueDelayedHelper") || "Scheduled retries" }
  ];

  const heroAside = (
    <div className="grid grid-2" style={{ width: "100%" }}>
      {queueMetrics.map((metric) => (
        <div
          key={metric.key}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "16px",
            background: "rgba(255,255,255,0.7)",
            minHeight: 100
          }}
        >
          <p className="label" style={{ marginBottom: 6 }}>
            {metric.label}
          </p>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{metric.value}</div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>{metric.helper}</p>
        </div>
      ))}
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", width: "100%" }}>
      <Button type="button" onClick={load} loading={loadingQueue}>
        {t("refreshData") || "Refresh metrics"}
      </Button>
      <Badge variant={health ? "success" : "warning"}>
        {(t("lastPing") || "Last ping") + ": "}
        {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : t("noRecentData") || "N/A"}
      </Badge>
    </div>
  );

  const sidebar = (
    <div>
      <Card hover={false}>
        <CardHeader title={t("opsGuardrail") || "Ops guardrails"} icon="🛡️" />
        <ul style={{ paddingLeft: 18, margin: 0, color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: 14 }}>
          <li>{t("opsGuardrailWorkflows") || "Pause syncs if failed jobs spike above 50."}</li>
          <li>{t("opsGuardrailEscalate") || "Escalate to engineering if heartbeat fails twice."}</li>
          <li>{t("opsGuardrailDocs") || "Log every manual test in your on-call doc."}</li>
        </ul>
      </Card>
    </div>
  );

  const heroBadge = (
    <Badge variant={health ? "success" : "error"}>
      {health ? t("systemOperational") || "Systems nominal" : t("systemIssuesDetected") || "Issues detected"}
    </Badge>
  );

  const heroActions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" onClick={load} loading={loadingQueue}>
        {t("refreshData") || "Refresh"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.href = "mailto:ops@automation.local";
          }
        }}
      >
        {t("contactOps") || "Contact ops"}
      </Button>
    </div>
  );

  const renderQueueSection = () => {
    if (loadingQueue && !queue) {
      return <LoadingSpinner text={t("loading") || "Loading"} />;
    }

    if (!queue) {
      return (
        <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
          {t("queueUnavailable") || "Queue metrics are unavailable. Refresh to try again."}
        </p>
      );
    }

    return (
      <div className="grid grid-2">
        {queueMetrics.map((metric) => (
          <div
            key={metric.key}
            style={{
              background: "var(--color-elevated)",
              borderRadius: "var(--radius-lg)",
              padding: "16px",
              border: "1px solid var(--color-border)"
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              {metric.label}
            </span>
            <div style={{ fontSize: 32, fontWeight: 900, margin: "8px 0" }}>{metric.value}</div>
            <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{metric.helper}</span>
          </div>
        ))}
      </div>
    );
  };

  const summaryItems = [
    {
      label: t("lastOrderLabel") || "Last Shopee order",
      value: status?.lastOrder ? new Date(status.lastOrder).toLocaleString() : t("none") || "None"
    },
    {
      label: t("lastAmazonLabel") || "Last Amazon action",
      value: status?.lastAmazon
        ? `${new Date(status.lastAmazon.createdAt).toLocaleString()} (${status.lastAmazon.status})`
        : t("none") || "None"
    },
    {
      label: t("lastErrorLabel") || "Last error",
      value: status?.lastError
        ? `${new Date(status.lastError.createdAt).toLocaleString()} - ${status.lastError.reason}`
        : t("none") || "None"
    }
  ];

  const supportCard = (
    <Card hover={false}>
      <CardHeader title={t("testScrape") || "Run manual scrape"} icon="🧪" />
      <p style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>
        {t("testScrapeDesc") || "Queue a real Amazon product URL to validate your connector."}
      </p>
      <Input
        placeholder={t("productUrl") || "Amazon product URL"}
        value={productUrl}
        onChange={(e) => setProductUrl(e.target.value)}
        icon={<span role="img" aria-label="link">🔗</span>}
        style={{ marginBottom: 0 }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <Button type="button" onClick={testScrape} disabled={!productUrl} loading={testing}>
          {testing ? t("loading") || "Loading" : t("run") || "Run test"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!lastQueuedUrl}
          onClick={() => {
            if (!lastQueuedUrl) return;
            setProductUrl(lastQueuedUrl);
            setFeedback({ type: "info", text: t("lastTestUrlApplied") || "Loaded last tested URL" });
          }}
        >
          {lastQueuedUrl ? t("reuseLastTestUrl") || "Reuse last tested URL" : t("noRecentTestUrl") || "No recent test saved"}
        </Button>
      </div>
    </Card>
  );

  return (
    <PageLayout
      activeHref="/ops"
      title={t("ops")}
      description={t("opsDesc") || "Monitor workers, queues, and manual validation"}
      heroBadge={heroBadge}
      heroAside={heroAside}
      heroFooter={<span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("opsHeroFooter") || "Realtime queue data refreshes every 60 seconds."}</span>}
      actions={heroActions}
      toolbar={toolbar}
      sidebar={sidebar}
    >
      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : feedback.type === "warning" ? "warning" : feedback.type === "info" ? "info" : "error"}>
          {feedback.text}
        </Alert>
      )}

      <div className="grid grid-2">
        <Card hover={false}>
          <CardHeader
            title={t("queueHealth") || "Queue health"}
            subtitle={t("queueHealthDesc") || "Understand automation backlog"}
            icon="📦"
            action={
              <Badge variant="info">
                {t("jobsTracked") || "Jobs tracked"}: {queue ? queue.waiting + queue.active : "—"}
              </Badge>
            }
          />
          {renderQueueSection()}
        </Card>

        <Card hover={false}>
          <CardHeader
            title={t("systemHealth") || "System health"}
            subtitle={t("systemHealthDesc") || "Track service uptime and incidents"}
            icon="🩺"
            action={
              <Badge variant={health ? "success" : "error"}>
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : t("noRecentData") || "No data"}
              </Badge>
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <StatusBadge
                status={health ? "FULFILLED" : "FAILED"}
                labels={{
                  success: t("statusProcessed"),
                  error: t("statusError"),
                  pending: t("statusPending"),
                  manual: t("ordersTableManual")
                }}
              />
              <span style={{ color: "var(--color-text-muted)" }}>
                {health ? t("statusHealthy") || "Healthy" : t("systemIssuesDetected") || "Issues detected"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <StatCard
                label={t("uptime") || "Uptime"}
                value={health ? "99.9%" : "--"}
                icon="🚀"
                color={health ? "success" : "warning"}
              />
              <StatCard
                label={t("alertsToday") || "Alerts"}
                value={queue?.failed ?? 0}
                icon="⚠️"
                color="error"
              />
            </div>
          </div>
        </Card>
      </div>

      <Card hover={false}>
        <CardHeader title={t("opsStatusSummary") || "Recent activity"} icon="📝" />
        {status ? (
          <ul style={{ color: "var(--color-text-muted)", lineHeight: 1.8, margin: 0 }}>
            {summaryItems.map((item) => (
              <li key={item.label} style={{ listStyle: "disc", marginLeft: 18 }}>
                <strong style={{ color: "var(--color-text)" }}>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            {loadingQueue ? t("loading") || "Loading" : t("genericError") || "Unable to load activity"}
          </p>
        )}
      </Card>

      {supportCard}
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
