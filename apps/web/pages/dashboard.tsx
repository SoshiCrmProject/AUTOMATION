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

const ensureNumber = (value: number | null | undefined) =>
  typeof value === "number" && !Number.isNaN(value) ? value : 0;

const formatNumber = (
  value: number | null | undefined,
  locale = "en-US",
  options: Intl.NumberFormatOptions = {}
) => new Intl.NumberFormat(locale, options).format(ensureNumber(value));

const formatCurrency = (
  value: number | null | undefined,
  locale = "en-US",
  currency: string = "JPY",
  options: Intl.NumberFormatOptions = {}
) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0, ...options }).format(
    ensureNumber(value)
  );

const formatDate = (
  value: string | number | Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {}
) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", ...options }).format(
  new Date(value)
);

const formatDateTime = (
  value: string | number | Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {}
) =>
  new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", ...options }).format(
    new Date(value)
  );

const formatTime = (
  value: string | number | Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {}
) => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", ...options }).format(new Date(value));

export default function Dashboard() {
  const { t, i18n } = useTranslation("common");
  const localeForDisplay = i18n.language === "ja" ? "ja-JP" : "en-US";
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
  const successRateValue = ordersArray.length > 0 ? (processedCount / ordersArray.length) * 100 : 0;
  const successRateDisplay = formatNumber(successRateValue, localeForDisplay, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
      value: formatNumber(processedCount, localeForDisplay),
      helper: t("ordersProcessedTodayHelper") || "Completed in the selected window",
      color: "var(--color-success)"
    },
    {
      label: t("statusPending") || "Pending",
      value: formatNumber(pendingCount, localeForDisplay),
      helper: t("ordersAwaitingAction") || "Queued or processing",
      color: "var(--color-warning)"
    },
    {
      label: t("statusError") || "Errors",
      value: formatNumber(errorCount, localeForDisplay),
      helper: t("ordersNeedReview") || "Requires manual review",
      color: "var(--color-error)"
    }
  ];

  const heroBadge = (
    <Badge variant={health ? "success" : "error"} size="lg">
      {health ? t("systemOperational") || "System operational" : t("systemIssuesDetected") || "Issues detected"}
    </Badge>
  );

  const quickLinkTargets = useMemo(
    () => [
      { label: t("navAnalytics") || "Analytics", href: "/analytics", icon: "📈" },
      { label: t("navInventory") || "Inventory", href: "/inventory", icon: "📦" },
      { label: t("navCRM") || "CRM", href: "/crm", icon: "👥" },
      { label: t("navNotifications") || "Notifications", href: "/notifications", icon: "🔔" }
    ],
    [t]
  );

  const quickActionTargets = useMemo(
    () => [
      { label: t("navAnalytics") || "Analytics", href: "/analytics", icon: "📈", variant: undefined },
      { label: t("navInventory") || "Inventory", href: "/inventory", icon: "📦", variant: undefined },
      { label: t("navCRM") || "CRM", href: "/crm", icon: "👥", variant: undefined },
      { label: t("navNotifications") || "Notifications", href: "/notifications", icon: "🔔", variant: undefined },
      { label: t("navSettings") || "Settings", href: "/settings", icon: "⚙️", variant: "ghost" as const },
      { label: t("navOrders") || "Orders", href: "/orders", icon: "🛒", variant: "ghost" as const },
      { label: t("viewErrors") || "Errors", href: "/errors", icon: "⚠️", variant: "ghost" as const },
      { label: t("viewOperations") || "Operations", href: "/ops", icon: "🔧", variant: "ghost" as const }
    ],
    [t]
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
      {t("successRate") || "Success rate"}: {successRateDisplay}% · {t("totalRevenue") || "Total revenue"}: {formatCurrency(totalRevenue, localeForDisplay)}
    </span>
  );

  const heroActions = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div className="full-width-mobile" style={{ minWidth: 200 }}>
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
        className="full-width-mobile"
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
    { label: t("active") || "Active", value: queue?.active ?? 0, variant: "info" },
    { label: t("failed") || "Failed", value: queue?.failed ?? 0, variant: "error" }
  ];

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "FULFILLED":
        return t("statusProcessed") || "Processed";
      case "FAILED":
        return t("statusError") || "Error";
      case "SKIPPED":
        return t("statusSkipped") || "Skipped";
      case "QUEUED":
      case "PROCESSING":
      case "UNPROCESSED":
        return t("statusPending") || "Pending";
      default:
        return status?.replace(/_/g, " ") || "-";
    }
  };

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div className="stack-sm" style={{ flexWrap: "wrap", gap: 8 }}>
        {queueMetrics.map((metric) => (
          <Badge key={metric.label} variant={metric.variant as any}>
            {metric.label}: {formatNumber(metric.value, localeForDisplay)}
          </Badge>
        ))}
      </div>
      <span className="full-width-mobile" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        {t("lastUpdated") || "Last updated"}: {formatTime(new Date(), localeForDisplay)}
      </span>
      <div
        className="stack-sm full-width-mobile"
        style={{ marginLeft: "auto", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}
      >
        <Button
          type="button"
          variant="ghost"
          className="full-width-mobile"
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
          className="full-width-mobile"
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
              <Badge variant={metric.variant as any}>{formatNumber(metric.value, localeForDisplay)}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("quickLinks") || "Quick links"} subtitle={t("dailyWorkflows") || "Daily workflows"} icon="⚡" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quickLinkTargets.map((link) => (
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
            {t("systemsRunningSmoothly") || "All services operating normally."} {t("queue") || "Queue"}: {formatNumber(queue?.waiting ?? 0, localeForDisplay)} {t("waiting") || "waiting"}, {formatNumber(queue?.active ?? 0, localeForDisplay)} {t("active") || "active"}, {formatNumber(queue?.failed ?? 0, localeForDisplay)} {t("failed") || "failed"}
          </Alert>
        )}

        {!health && (
          <Alert variant="error" title={t("systemIssuesDetected") || "Issues detected"}>
            {t("checkConnection") || "Unable to connect to backend services. Please check your connection."}
          </Alert>
        )}

        {isLoading ? (
          <LoadingSpinner size="lg" text={t("loadingDashboardData") || "Loading dashboard data..."} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="grid grid-4">
              <StatCard
                label={t("statusProcessed") || "Processed Orders"}
                value={formatNumber(processedCount, localeForDisplay)}
                trend={12}
                icon="✅"
                color="success"
              />
              <StatCard
                label={t("totalRevenue") || "Total Revenue"}
                value={formatCurrency(totalRevenue, localeForDisplay)}
                trend={8}
                icon="💰"
                color="primary"
              />
              <StatCard
                label={t("statusError") || "Errors"}
                value={formatNumber(errorCount, localeForDisplay)}
                trend={-5}
                icon="⚠️"
                color="error"
              />
              <StatCard
                label={t("successRate") || "Success Rate"}
                value={`${successRateDisplay}%`}
                trend={3}
                icon="📊"
                color="info"
              />
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
                    label: t("dashboardTabOverview") || 'Overview',
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
                    label: t("dashboardTabRecent") || 'Recent Orders',
                    icon: '🛒',
                    badge: ordersArray.length,
                    content: (
                      <Table
                        columns={[
                          { key: 'shopeeOrderSn', header: t("ordersTableOrderId") || 'Order ID', width: '150px' },
                          {
                            key: 'processingStatus',
                            header: t("ordersTableStatus") || 'Status',
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
                                {getOrderStatusLabel(row.processingStatus)}
                              </Badge>
                            ),
                          },
                          {
                            key: 'orderTotal',
                            header: t("ordersTableAmount") || 'Amount',
                            render: (row) => formatCurrency(row.orderTotal || 0, localeForDisplay),
                          },
                          {
                            key: 'createdAt',
                            header: t("ordersTableDate") || 'Date',
                            render: (row) => formatDate(row.createdAt, localeForDisplay),
                          },
                          {
                            key: 'actions',
                            header: t("ordersTableActions") || 'Actions',
                            render: (row) => (
                              <Button size="sm" variant="ghost" onClick={() => setSelectedOrderId(row.id)}>
                                {t("viewOrder") || 'View'}
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
                    label: t("dashboardTabQuickActions") || 'Quick Actions',
                    icon: '⚡',
                    content: (
                      <div className="grid grid-4">
                        {quickActionTargets.map((link) => (
                          <Link href={link.href} key={link.href}>
                            <Button fullWidth variant={link.variant}>{`${link.icon} ${link.label}`}</Button>
                          </Link>
                        ))}
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
          title={`${t("orderDetailsTitle") || "Order details"}: ${selectedOrder.shopeeOrderSn || selectedOrder.id}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="grid grid-2">
              <div>
                <label className="label">{t("ordersTableOrderId") || "Order ID"}</label>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{selectedOrder.shopeeOrderSn || selectedOrder.id}</p>
              </div>
              <div>
                <label className="label">{t("ordersTableStatus") || "Status"}</label>
                <Badge variant={
                  selectedOrder.processingStatus === 'FULFILLED' ? 'success' :
                  selectedOrder.processingStatus === 'FAILED' ? 'error' : 'warning'
                }>
                  {selectedOrder.processingStatus}
                </Badge>
              </div>
              <div>
                <label className="label">{t("orderAmountLabel") || "Amount"}</label>
                <p style={{ margin: '4px 0', fontWeight: 600, fontSize: '18px', color: 'var(--color-primary)' }}>
                  {formatCurrency(selectedOrder.orderTotal || 0, localeForDisplay)}
                </p>
              </div>
              <div>
                <label className="label">{t("orderDateLabel") || "Date"}</label>
                <p style={{ margin: '4px 0' }}>{formatDateTime(selectedOrder.createdAt, localeForDisplay)}</p>
              </div>
            </div>

            {selectedOrder.amazonOrder && (
              <Alert variant="success" title={t("amazonOrder")}>
                {t("amazonOrderId") || "Amazon Order ID"}: {selectedOrder.amazonOrder.amazonOrderId || t("processingPlaceholder") || 'Processing...'}
              </Alert>
            )}

            {selectedOrder.errorItems && selectedOrder.errorItems.length > 0 && (
              <Alert variant="error" title={t("errorsDetected")}>
                {t("errorsFoundForOrder", { count: selectedOrder.errorItems.length }) || `${selectedOrder.errorItems.length} error(s) found for this order`}
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
