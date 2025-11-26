import { useEffect, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import StatusBadge from "../components/StatusBadge";
import api from "../lib/apiClient";
import { 
  Card, CardHeader, StatCard, Button, Input, Badge, Alert 
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

type QueueHealth = { waiting: number; active: number; failed: number; delayed: number };
type StatusSummary = { lastOrder: string | null; lastAmazon: { createdAt: string; status: string } | null; lastError: { createdAt: string; reason: string } | null };

export default function OpsPage() {
  const { t } = useTranslation("common");
  const [queue, setQueue] = useState<QueueHealth | null>(null);
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);

  const load = async () => {
    setLoadingQueue(true);
    try {
      const [q, s, h] = await Promise.allSettled([api.get("/api/ops/queue"), api.get("/api/ops/status"), api.get("/health")]);
      if (q.status === "fulfilled") setQueue(q.value.data);
      if (s.status === "fulfilled") setStatus(s.value.data);
      if (h.status === "fulfilled") setHealth(h.value.data);
    } catch (e: any) {
      setMessage(e?.response?.data?.error ?? t("genericError"));
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const testScrape = async () => {
    setMessage("");
    setTesting(true);
    try {
      await api.post("/api/ops/amazon-test", { productUrl });
      setMessage(t("testScrapeQueued"));
    } catch (e: any) {
      setMessage(e?.response?.data?.error ?? t("genericError"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container">
      <AppNav activeHref="/ops" />
      <div className="card">
        <h1>{t("ops")}</h1>
        <p>{t("opsDesc")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge
            status={health ? "FULFILLED" : "FAILED"}
            labels={{ success: t("statusProcessed"), error: t("statusError"), pending: t("statusPending"), manual: t("ordersTableManual") }}
          />
          <span style={{ color: "#475569" }}>{health ? t("statusHealthy") ?? "Healthy" : t("genericError")}</span>
        </div>
      </div>
      <div className="card">
        <h3>{t("queueHealth")}</h3>
        {queue ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Chip label={t("waiting")} value={queue.waiting} />
            <Chip label={t("active")} value={queue.active} />
            <Chip label={t("failed")} value={queue.failed} />
            <Chip label={t("delayed")} value={queue.delayed} />
          </div>
        ) : (
          <p>{loadingQueue ? t("loading") : t("genericError")}</p>
        )}
      </div>
      <div className="card">
        <h3>{t("opsStatusSummary") ?? "Recent activity"}</h3>
        {status ? (
          <ul style={{ color: "#475569" }}>
            <li>
              {t("lastOrderLabel") ?? "Last Shopee order"}:{" "}
              {status.lastOrder ? new Date(status.lastOrder).toLocaleString() : t("none")}
            </li>
            <li>
              {t("lastAmazonLabel") ?? "Last Amazon action"}:{" "}
              {status.lastAmazon ? `${new Date(status.lastAmazon.createdAt).toLocaleString()} (${status.lastAmazon.status})` : t("none")}
            </li>
            <li>
              {t("lastErrorLabel") ?? "Last error"}:{" "}
              {status.lastError ? `${new Date(status.lastError.createdAt).toLocaleString()} - ${status.lastError.reason}` : t("none")}
            </li>
          </ul>
        ) : (
          <p>{loadingQueue ? t("loading") : t("genericError")}</p>
        )}
      </div>
      <div className="card">
        <h3>{t("testScrape")}</h3>
        <input
          className="input"
          placeholder={t("productUrl")}
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
        />
        <button className="button" onClick={testScrape} disabled={!productUrl || testing}>
          {testing ? t("loading") : t("run")}
        </button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 8, padding: "8px 12px", minWidth: 80 }}>
      <div style={{ fontSize: 12, color: "#475569" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
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
