import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import AutomationStatus from "../components/AutomationStatus";
import OnboardingChecklist from "../components/OnboardingChecklist";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { dashboardTour } from "../components/tourConfigs";
import { 
  Card, 
  CardHeader, 
  StatCard, 
  Button, 
  Alert, 
  LoadingSpinner,
  Tabs,
  SimpleBarChart,
  TrendLine,
  Table,
  Badge,
  Modal,
  Select
} from "../components/ui/index";

type Order = {
  id: string;
  processingStatus: string;
  shopeeOrderSn?: string;
  orderTotal?: number;
  createdAt: string;
  amazonOrder?: { amazonOrderId: string | null; status?: string } | null;
  errorItems: any[];
};

type QueueHealth = { waiting: number; active: number; failed: number; delayed: number };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function Dashboard() {
  const { t } = useTranslation("common");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [showTour, setShowTour] = useState(false);
  
  const { data: orders, error: ordersError } = useSWR<Order[]>("/orders/recent", fetcher);
  const { data: queue } = useSWR<QueueHealth>("/ops/queue", fetcher, { shouldRetryOnError: false });
  const { data: health } = useSWR("/health", fetcher, { shouldRetryOnError: false });

  const isLoading = !orders && !ordersError;

  // Ensure orders is an array
  const ordersArray = Array.isArray(orders) ? orders : [];

  // Calculate metrics
  const processedCount = ordersArray.filter((o) => o.processingStatus === "FULFILLED").length;
  const errorCount = ordersArray.filter((o) => o.processingStatus === "FAILED" || o.processingStatus === "SKIPPED" || o.errorItems.length > 0).length;
  const pendingCount = ordersArray.filter((o) => o.processingStatus === "QUEUED" || o.processingStatus === "PROCESSING" || o.processingStatus === "UNPROCESSED").length;
  const totalRevenue = ordersArray.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
  const successRate = ordersArray.length > 0 ? ((processedCount / ordersArray.length) * 100).toFixed(1) : '0';

  // Generate trend data (mock data for now - replace with real API)
  const generateTrendData = () => {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 50) + 10
    }));
  };

  const trendData = useMemo(() => generateTrendData(), [selectedPeriod]);

  // Bar chart data
  const statusChartData = [
    { label: t("statusProcessed") || 'Processed', value: processedCount, color: 'var(--color-success)' },
    { label: t("statusError") || 'Errors', value: errorCount, color: 'var(--color-error)' },
    { label: t("statusPending") || 'Pending', value: pendingCount, color: 'var(--color-warning)' },
  ];

  const selectedOrder = ordersArray.find(o => o.id === selectedOrderId);
  const heroHighlights = [
    {
      label: t("statusProcessed") || "Processed",
      value: processedCount.toLocaleString(),
      helper: t("ordersProcessedTodayHelper") || "Completed in the selected window",
      color: "var(--color-success)"
    },
    {
      label: t("statusPending") || "Pending",
      value: pendingCount.toLocaleString(),
      helper: t("ordersAwaitingAction") || "Queued or processing",
      color: "var(--color-warning)"
    },
    {
      label: t("statusError") || "Errors",
      value: errorCount.toLocaleString(),
      helper: t("ordersNeedReview") || "Requires manual review",
      color: "var(--color-error)"
    }
  ];

  const heroBadge = (
    <Badge variant={health ? "success" : "error"} size="lg">
      {health ? t("systemOperational") || "System operational" : t("systemIssuesDetected") || "Issues detected"}
    </Badge>
  );

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(15,23,42,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(15,23,42,0.7)" }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {t("successRate") || "Success rate"}: {successRate}% · {t("totalRevenue") || "Total revenue"}: ¥{totalRevenue.toLocaleString()}
    </span>
  );

  const heroActions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ minWidth: 200 }}>
        <Select
          label={t("timeRange") || "Time range"}
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
          options={[
            { value: "7d", label: t("last7Days") || "Last 7 days" },
            { value: "30d", label: t("last30Days") || "Last 30 days" },
            { value: "90d", label: t("last90Days") || "Last 90 days" },
          ]}
        />
      </div>
      <Button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      >
        🔄 {t("refreshData")}
      </Button>
    </div>
  );

  const queueMetrics = [
    { label: t("waiting") || "Waiting", value: queue?.waiting ?? 0, variant: "warning" },
    { label: t("statusProcessed") || "Active", value: queue?.active ?? 0, variant: "info" },
    { label: t("statusError") || "Failed", value: queue?.failed ?? 0, variant: "error" },
  ];

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      {queueMetrics.map((metric) => (
        <Badge key={metric.label} variant={metric.variant as any}>
          {metric.label}: {metric.value.toLocaleString()}
        </Badge>
      ))}
      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        {t("lastUpdated") || "Last updated"}: {new Date().toLocaleTimeString()}
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open("/ops", "_self");
            }
          }}
        >
          🔧 {t("viewOperations") || "Operations"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open("/errors", "_self");
            }
          }}
        >
          ⚠️ {t("viewErrors") || "Errors"}
        </Button>
      </div>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("queueHealth") || "Queue health"}
          subtitle={t("ordersHeroDescription") || "Live automation status"}
          icon="🩺"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queueMetrics.map((metric) => (
            <div key={metric.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{metric.label}</span>
              <Badge variant={metric.variant as any}>{metric.value.toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("quickLinks") || "Quick links"} subtitle={t("dailyWorkflows") || "Daily workflows"} icon="⚡" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[{
            label: "Analytics",
            href: "/analytics",
            icon: "📈"
          },
          { label: "Inventory", href: "/inventory", icon: "📦" },
          { label: "CRM", href: "/crm", icon: "👥" },
          { label: "Notifications", href: "/notifications", icon: "🔔" }].map((link) => (
            <Button
              key={link.href}
              type="button"
              variant="ghost"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(link.href, "_self");
                }
              }}
            >
              {`${link.icon} ${link.label}`}
            </Button>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("proTips") || "Pro tips"} subtitle={t("stayAhead") || "Stay ahead of alerts"} icon="💡" />
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          <li>{t("keepSuccessRateHigh") || "Keep success rate above 90% before enabling auto-fulfillment."}</li>
          <li>{t("dailyHealthCheck") || "Run the automation health check every morning."}</li>
          <li>{t("triageErrorsQuickly") || "Triage failed orders within 2 hours to avoid backlog."}</li>
        </ul>
      </Card>
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/dashboard"
        title={`🎯 ${t("navDashboard") || "Dashboard"}`}
        description={t("dashboardHeroSubtitle") || "Monitor fulfillment, revenue, and system health in one place."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        actions={heroActions}
        toolbar={toolbar}
        sidebar={sidebar}
        heroBackground="linear-gradient(120deg, #fef9c3 0%, #fde68a 35%, #e0f2fe 100%)"
      >
        {health && (
          <Alert variant="success" title={t("systemOperational")}>
            {t("systemsRunningSmoothly") || "All services operating normally."} {t("queue") || "Queue"}: {queue?.waiting || 0} {t("waiting") || "waiting"}, {queue?.active || 0} {t("active") || "active"}, {queue?.failed || 0} {t("failed") || "failed"}
          </Alert>
        )}

        {!health && (
          <Alert variant="error" title={t("systemIssuesDetected") || "Issues detected"}>
            {t("checkConnection") || "Unable to connect to backend services. Please check your connection."}
          </Alert>
        )}

        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading dashboard data..." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="grid grid-4">
              <StatCard label={t("statusProcessed") || "Processed Orders"} value={processedCount} trend={12} icon="✅" color="success" />
              <StatCard label={t("totalRevenue") || "Total Revenue"} value={`¥${totalRevenue.toLocaleString()}`} trend={8} icon="💰" color="primary" />
              <StatCard label={t("statusError") || "Errors"} value={errorCount} trend={-5} icon="⚠️" color="error" />
              <StatCard label={t("successRate") || "Success Rate"} value={`${successRate}%`} trend={3} icon="📊" color="info" />
            </div>

            <div className="grid grid-2">
              <Card>
                <CardHeader title={t("orderStatusDistribution") || "Order status distribution"} icon="📊" />
                <SimpleBarChart data={statusChartData} height="250px" />
              </Card>
              <Card>
                <CardHeader title={t("ordersTrend") || "Orders trend"} icon="📈" />
                <TrendLine data={trendData} height="250px" showDots />
              </Card>
            </div>

            <Card>
              <Tabs
                tabs={[
                  {
                    id: 'overview',
                    label: 'Overview',
                    icon: '📋',
                    content: (
                      <div className="grid grid-2">
                        <AutomationStatus />
                        <OnboardingChecklist />
                      </div>
                    ),
                  },
                  {
                    id: 'recent',
                    label: 'Recent Orders',
                    icon: '🛒',
                    badge: ordersArray.length,
                    content: (
                      <Table
                        columns={[
                          { key: 'shopeeOrderSn', header: 'Order ID', width: '150px' },
                          {
                            key: 'processingStatus',
                            header: 'Status',
                            render: (row) => (
                              <Badge
                                variant={
                                  row.processingStatus === 'FULFILLED'
                                    ? 'success'
                                    : row.processingStatus === 'FAILED'
                                      ? 'error'
                                      : row.processingStatus === 'SKIPPED'
                                        ? 'warning'
                                        : 'info'
                                }
                              >
                                {row.processingStatus}
                              </Badge>
                            ),
                          },
                          {
                            key: 'orderTotal',
                            header: 'Amount',
                            render: (row) => `¥${(row.orderTotal || 0).toLocaleString()}`,
                          },
                          {
                            key: 'createdAt',
                            header: 'Date',
                            render: (row) => new Date(row.createdAt).toLocaleDateString(),
                          },
                          {
                            key: 'actions',
                            header: 'Actions',
                            render: (row) => (
                              <Button size="sm" variant="ghost" onClick={() => setSelectedOrderId(row.id)}>
                                View
                              </Button>
                            ),
                          },
                        ]}
                        data={ordersArray}
                        emptyMessage={t("emptyNoRecentOrders")}
                        onRowClick={(row) => setSelectedOrderId(row.id)}
                      />
                    ),
                  },
                  {
                    id: 'quick-actions',
                    label: 'Quick Actions',
                    icon: '⚡',
                    content: (
                      <div className="grid grid-4">
                        <Link href="/analytics">
                          <Button fullWidth>📈 Analytics</Button>
                        </Link>
                        <Link href="/inventory">
                          <Button fullWidth>📦 Inventory</Button>
                        </Link>
                        <Link href="/crm">
                          <Button fullWidth>👥 CRM</Button>
                        </Link>
                        <Link href="/notifications">
                          <Button fullWidth>🔔 Notifications</Button>
                        </Link>
                        <Link href="/settings">
                          <Button fullWidth variant="ghost">⚙️ Settings</Button>
                        </Link>
                        <Link href="/orders">
                          <Button fullWidth variant="ghost">🛒 Orders</Button>
                        </Link>
                        <Link href="/errors">
                          <Button fullWidth variant="ghost">⚠️ Errors</Button>
                        </Link>
                        <Link href="/ops">
                          <Button fullWidth variant="ghost">🔧 Operations</Button>
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </PageLayout>

      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          title={`Order Details: ${selectedOrder.shopeeOrderSn || selectedOrder.id}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="grid grid-2">
              <div>
                <label className="label">Order ID</label>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{selectedOrder.shopeeOrderSn || selectedOrder.id}</p>
              </div>
              <div>
                <label className="label">Status</label>
                <Badge variant={
                  selectedOrder.processingStatus === 'FULFILLED' ? 'success' :
                  selectedOrder.processingStatus === 'FAILED' ? 'error' : 'warning'
                }>
                  {selectedOrder.processingStatus}
                </Badge>
              </div>
              <div>
                <label className="label">Amount</label>
                <p style={{ margin: '4px 0', fontWeight: 600, fontSize: '18px', color: 'var(--color-primary)' }}>
                  ¥{(selectedOrder.orderTotal || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="label">Date</label>
                <p style={{ margin: '4px 0' }}>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {selectedOrder.amazonOrder && (
              <Alert variant="success" title={t("amazonOrder")}>
                Amazon Order ID: {selectedOrder.amazonOrder.amazonOrderId || 'Processing...'}
              </Alert>
            )}

            {selectedOrder.errorItems && selectedOrder.errorItems.length > 0 && (
              <Alert variant="error" title={t("errorsDetected")}>
                {selectedOrder.errorItems.length} error(s) found for this order
              </Alert>
            )}
          </div>
        </Modal>
      )}

      <OnboardingTour pageName="dashboard" steps={dashboardTour} onComplete={() => setShowTour(false)} />
      {!showTour && (
        <HelpButton
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem("tour_completed_dashboard");
              setShowTour(true);
              window.location.reload();
            }
          }}
        />
      )}
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
