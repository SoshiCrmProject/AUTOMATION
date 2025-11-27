import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
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
  Modal
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

  const trendData = generateTrendData();

  // Bar chart data
  const statusChartData = [
    { label: t("statusProcessed") || 'Processed', value: processedCount, color: 'var(--color-success)' },
    { label: t("statusError") || 'Errors', value: errorCount, color: 'var(--color-error)' },
    { label: t("statusPending") || 'Pending', value: pendingCount, color: 'var(--color-warning)' },
  ];

  const selectedOrder = ordersArray.find(o => o.id === selectedOrderId);

  return (
    <div className="shell">
      <AppNav activeHref="/dashboard" />
      <div className="container">
        {/* Enhanced Hero Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          marginBottom: '32px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', fontWeight: 900, background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🎯 {t("navDashboard") || "Dashboard"}
              </h1>
              <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: '16px' }}>
                Monitor your dropshipping operations in real-time
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="select"
                style={{ width: 'auto', marginBottom: 0 }}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button onClick={() => window.location.reload()}>
                🔄 {t("refreshData")}
              </Button>
            </div>
          </div>
        </div>

        {/* System Health Alert */}
        {health && (
          <Alert variant="success" title={t("systemOperational")}>
            All services are running normally. Queue: {queue?.waiting || 0} waiting, {queue?.active || 0} active, {queue?.failed || 0} failed
          </Alert>
        )}

        {!health && (
          <Alert variant="error" title={t("systemIssuesDetected")}>
            Unable to connect to backend services. Please check your connection.
          </Alert>
        )}

        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading dashboard data..." />
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
              <StatCard 
                label={t("statusProcessed") || "Processed Orders"}
                value={processedCount}
                trend={12}
                icon="✅"
                color="success"
              />
              <StatCard 
                label={t("totalRevenue") || "Total Revenue"}
                value={`¥${totalRevenue.toLocaleString()}`}
                trend={8}
                icon="💰"
                color="primary"
              />
              <StatCard 
                label={t("statusError") || "Errors"}
                value={errorCount}
                trend={-5}
                icon="⚠️"
                color="error"
              />
              <StatCard 
                label="Success Rate"
                value={`${successRate}%`}
                trend={3}
                icon="📊"
                color="info"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-2" style={{ marginBottom: '32px' }}>
              <Card>
                <CardHeader title={t("orderStatusDistribution")} icon="📊" />
                <SimpleBarChart data={statusChartData} height="250px" />
              </Card>

              <Card>
                <CardHeader title={t("ordersTrend")} icon="📈" />
                <TrendLine data={trendData} height="250px" showDots />
              </Card>
            </div>

            {/* Tabs Section */}
            <div style={{ marginBottom: '32px' }}>
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
                            render: (row) => <Badge variant={
                              row.processingStatus === 'FULFILLED' ? 'success' :
                              row.processingStatus === 'FAILED' ? 'error' :
                              row.processingStatus === 'SKIPPED' ? 'warning' : 'info'
                            }>{row.processingStatus}</Badge>
                          },
                          { 
                            key: 'orderTotal', 
                            header: 'Amount',
                            render: (row) => `¥${(row.orderTotal || 0).toLocaleString()}`
                          },
                          { 
                            key: 'createdAt', 
                            header: 'Date',
                            render: (row) => new Date(row.createdAt).toLocaleDateString()
                          },
                          {
                            key: 'actions',
                            header: 'Actions',
                            render: (row) => (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedOrderId(row.id)}
                              >
                                View
                              </Button>
                            )
                          }
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
          </>
        )}

        {/* Order Detail Modal */}
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

        <OnboardingTour 
          pageName="dashboard" 
          steps={dashboardTour} 
          onComplete={() => setShowTour(false)} 
        />
        {!showTour && <HelpButton onClick={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem("tour_completed_dashboard");
            setShowTour(true);
            window.location.reload();
          }
        }} />}
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
