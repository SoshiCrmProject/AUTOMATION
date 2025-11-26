import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import Link from "next/link";
import OnboardingChecklist from "../components/OnboardingChecklist";
import AppNav from "../components/AppNav";
import AutomationStatus from "../components/AutomationStatus";
import StatusBadge from "../components/StatusBadge";

type Order = {
  id: string;
  processingStatus: string;
  amazonOrder?: { amazonOrderId: string | null } | null;
  errorItems: any[];
};

type QueueHealth = { waiting: number; active: number; failed: number; delayed: number };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function Dashboard() {
  const { t } = useTranslation("common");
  const { data: orders } = useSWR<Order[]>("/api/orders/recent", fetcher);
  const { data: queue } = useSWR<QueueHealth>("/api/ops/queue", fetcher, { shouldRetryOnError: false });
  const { data: health } = useSWR("/health", fetcher, { shouldRetryOnError: false });

  const processedCount = orders ? orders.filter((o) => o.processingStatus === "FULFILLED").length : "—";
  const errorCount = orders ? orders.filter((o) => o.processingStatus === "FAILED" || o.processingStatus === "SKIPPED" || o.errorItems.length).length : "—";
  const pendingCount = orders
    ? orders.filter((o) => o.processingStatus === "QUEUED" || o.processingStatus === "PROCESSING" || o.processingStatus === "UNPROCESSED").length
    : "—";

  const cards = [
    {
      title: t("statusProcessed"),
      value: processedCount,
      desc: t("metricSuccessDesc"),
      color: "var(--color-success)",
      icon: "✅"
    },
    {
      title: t("statusError"),
      value: errorCount,
      desc: t("metricErrorsDesc"),
      color: "var(--color-error)",
      icon: "⚠️"
    },
    {
      title: t("metricQueueLabel"),
      value: queue ? `${queue.waiting} ${t("waiting")} / ${queue.active} ${t("active")}` : "—",
      desc: t("metricQueueDesc"),
      color: "var(--color-secondary)",
      icon: "⚡"
    },
    {
      title: t("statusPending"),
      value: pendingCount,
      desc: t("statusDecisionPending"),
      color: "var(--color-info)",
      icon: "⏳"
    }
  ];

  return (
    <div className="shell">
      <AppNav activeHref="/dashboard" />
      <div className="container">
        <div className="hero" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>🎯 Dashboard</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
              Monitor your dropshipping operations in real-time
            </p>
          </div>
        </div>

        {/* System Health */}
        <div className="alert alert-success" style={{ marginBottom: 24, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>
            {health ? "✅" : "❌"}
          </span>
          <div style={{ flex: 1 }}>
            <strong>{health ? t("statusHealthy") ?? "System Healthy" : t("genericError")}</strong>
            {queue && (
              <p style={{ marginTop: 4, opacity: 0.9 }}>
                Queue: {queue.waiting} {t("waiting")} / {queue.active} {t("active")} / {queue.failed} failed
              </p>
            )}
          </div>
          <StatusBadge
            status={health ? "FULFILLED" : "FAILED"}
            labels={{
              success: t("statusProcessed"),
              error: t("statusError"),
              pending: t("statusPending"),
              manual: t("ordersTableManual")
            }}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          {cards.map((c) => (
            <div key={c.title} className="stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {c.title.toUpperCase()}
                </span>
              </div>
              <h2 style={{ fontSize: 32, margin: 0, color: c.color }}>{c.value}</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 8 }}>{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Automation Status & Onboarding */}
        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          <AutomationStatus />
          <OnboardingChecklist />
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>⚡ {t("quickActions")}</h3>
          <div className="grid grid-4">
            <Link className="btn" href="/analytics">
              📈 Analytics
            </Link>
            <Link className="btn" href="/inventory">
              📦 Inventory
            </Link>
            <Link className="btn" href="/crm">
              👥 CRM
            </Link>
            <Link className="btn" href="/notifications">
              🔔 Notifications
            </Link>
            <Link className="btn btn-ghost" href="/settings">
              {t("ctaConfigure")}
            </Link>
            <Link className="btn btn-ghost" href="/orders">
              {t("navOrders")}
            </Link>
            <Link className="btn btn-ghost" href="/errors">
              {t("navErrors")}
            </Link>
            <Link className="btn btn-ghost" href="/ops">
              {t("opsCenter")}
            </Link>
          </div>
        </div>
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
