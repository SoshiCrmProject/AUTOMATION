import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { analyticsTour } from "../components/tourConfigs";
import { 
  Card, 
  CardHeader, 
  StatCard, 
  Button, 
  Alert, 
  LoadingSpinner,
  Badge,
  Select
} from "../components/ui/index";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type DashboardData = {
  week: {
    _sum: {
      totalOrders: number | null;
      successfulOrders: number | null;
      failedOrders: number | null;
      totalRevenue: number | null;
      totalProfit: number | null;
      totalShippingCost?: number | null;
    };
    _avg: {
      errorRate: number | null;
      conversionRate: number | null;
    };
  };
  month: {
    _sum: {
      totalOrders: number | null;
      totalRevenue: number | null;
      totalProfit: number | null;
    };
  };
  alerts?: {
    lowStock?: number;
    errors?: number;
    returns?: number;
  };
};

type ProfitTrend = {
  date: string | Date;
  totalRevenue: number;
  totalProfit: number;
  avgProfit: number | null;
  totalOrders: number;
  successfulOrders: number;
};

const FALLBACK_DASHBOARD: DashboardData = {
  week: {
    _sum: {
      totalOrders: 72,
      successfulOrders: 65,
      failedOrders: 7,
      totalRevenue: 985000,
      totalProfit: 286000,
      totalShippingCost: 82000
    },
    _avg: {
      errorRate: 0.07,
      conversionRate: 0.92
    }
  },
  month: {
    _sum: {
      totalOrders: 288,
      totalRevenue: 4125000,
      totalProfit: 1214000
    }
  },
  alerts: {
    lowStock: 3,
    errors: 4,
    returns: 2
  }
};

const buildFallbackTrends = (days: number): ProfitTrend[] => {
  return Array.from({ length: days }, (_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - idx - 1));
    const baseRevenue = 40000 + idx * 1200;
    const variance = Math.sin(idx / 3) * 6000;
    const totalRevenue = baseRevenue + variance;
    const totalProfit = totalRevenue * 0.28;
    const orders = 24 + (idx % 5) * 3;
    const successfulOrders = Math.max(orders - 2, 1);
    return {
      date: date.toISOString(),
      totalRevenue,
      totalProfit,
      avgProfit: totalProfit / orders,
      totalOrders: orders,
      successfulOrders
    };
  });
};

const PERIOD_DAY_MAP: Record<'7' | '30' | '90', number> = {
  '7': 7,
  '30': 30,
  '90': 90
};

export default function Analytics() {
  const { t } = useTranslation("common");
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [showTour, setShowTour] = useState(false);
  const [useFallbackData, setUseFallbackData] = useState(false);
  
  const { data: dashboard, error: dashError } = useSWR<DashboardData>("/api/analytics/dashboard", fetcher);
  const { data: profitTrends, error: trendError } = useSWR<ProfitTrend[]>(
    `/api/analytics/profit-trends?days=${selectedPeriod}`, 
    fetcher
  );

  useEffect(() => {
    if (dashError || trendError) {
      setUseFallbackData(true);
    }
  }, [dashError, trendError]);

  useEffect(() => {
    if (!dashError && dashboard && !trendError && profitTrends) {
      setUseFallbackData(false);
    }
  }, [dashboard, dashError, profitTrends, trendError]);

  const fallbackTrends = useMemo(
    () => buildFallbackTrends(PERIOD_DAY_MAP[selectedPeriod]),
    [selectedPeriod]
  );
  const effectiveDashboard = useFallbackData ? FALLBACK_DASHBOARD : dashboard;
  const hasTrendData = Array.isArray(profitTrends) && profitTrends.length > 0;
  const trendsArray = useFallbackData ? fallbackTrends : hasTrendData ? (profitTrends as ProfitTrend[]) : [];
  const isLoading = !useFallbackData && !effectiveDashboard && !dashError;

  // Calculate metrics
  const weekRevenue = effectiveDashboard?.week?._sum?.totalRevenue || 0;
  const weekOrders = effectiveDashboard?.week?._sum?.totalOrders || 0;
  const weekProfit = effectiveDashboard?.week?._sum?.totalProfit || 0;
  const monthOrders = effectiveDashboard?.month?._sum?.totalOrders || 0;
  const monthRevenue = effectiveDashboard?.month?._sum?.totalRevenue || 0;
  const monthProfit = effectiveDashboard?.month?._sum?.totalProfit || 0;
  const weekConversionRate = effectiveDashboard?.week?._avg?.conversionRate || 0;

  const alertLowStock = effectiveDashboard?.alerts?.lowStock ?? 0;
  const alertErrors = effectiveDashboard?.alerts?.errors ?? 0;
  const alertReturns = effectiveDashboard?.alerts?.returns ?? 0;

  const handleReplayTour = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tour_completed_analytics");
      setShowTour(true);
      window.location.reload();
    }
  };

  // Prepare chart data
  const chartData = trendsArray.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(trend.totalRevenue),
    profit: Number(trend.totalProfit),
    orders: trend.totalOrders,
    successRate: trend.totalOrders > 0 ? (trend.successfulOrders / trend.totalOrders) * 100 : 0
  }));
  const heroBadge = (
    <Badge variant={useFallbackData ? "warning" : "info"}>
      {useFallbackData ? t("analyticsSampleDataTitle") : t("liveMetrics") || "Live metrics"}
    </Badge>
  );

  const heroAside = (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
      }}
    >
      {[{
        label: t("weeklyRevenue"),
        value: `¥${Number(weekRevenue).toLocaleString()}`,
        helper: t("last7DaysPerformance") || "Last 7 days"
      }, {
        label: t("weeklyOrders"),
        value: weekOrders,
        helper: t("ordersPastWeek") || "Orders past week"
      }, {
        label: t("conversionRate"),
        value: `${(weekConversionRate * 100).toFixed(1)}%`,
        helper: t("conversionHelper") || "Storewide conversion"
      }].map((stat) => (
        <div key={stat.label} className="stat-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, textTransform: "uppercase", color: "var(--color-text-light)", marginBottom: 6 }}>{stat.label}</p>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {useFallbackData
        ? t("analyticsSampleDataDesc")
        : t("analyticsLiveDataHint") || "Data refreshes every 15 minutes from the analytics API."}
    </span>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Select
        fullWidth={false}
        value={selectedPeriod}
        onChange={(event) => setSelectedPeriod(event.target.value as '7' | '30' | '90')}
        options={[
          { value: "7", label: t("last7Days") || "Last 7 days" },
          { value: "30", label: t("last30Days") || "Last 30 days" },
          { value: "90", label: t("last90Days") || "Last 90 days" }
        ]}
        style={{ marginBottom: 0, minWidth: 180 }}
      />
      <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
        🔄 {t("refreshData") || "Refresh"}
      </Button>
      <Badge variant={useFallbackData ? "warning" : "success"}>
        {useFallbackData ? t("sampleData") || "Sample data" : t("liveData") || "Live data"}
      </Badge>
    </div>
  );

  const actions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" onClick={() => window.open("/api/analytics/export", "_blank")}>
        ⬇️ {t("exportCsv") || "Export CSV"}
      </Button>
      <Button type="button" variant="ghost" onClick={handleReplayTour}>
        🧭 {t("replayTour") || "Replay tour"}
      </Button>
    </div>
  );

  type BadgeVariant = "success" | "error" | "warning" | "info" | "default";
  const liveAlerts: Array<{ label: string; value: number; variant: BadgeVariant }> = [
    {
      label: t("lowStock") || "Low stock",
      value: alertLowStock,
      variant: alertLowStock > 0 ? "warning" : "default"
    },
    {
      label: t("navErrors") || "Errors",
      value: alertErrors,
      variant: alertErrors > 0 ? "error" : "default"
    },
    {
      label: t("returns") || "Returns",
      value: alertReturns,
      variant: alertReturns > 0 ? "info" : "default"
    }
  ];

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader title={t("liveAlerts") || "Live alerts"} subtitle={t("alertSummary") || "Operational signals"} icon="🚨" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {liveAlerts.map((alert) => (
            <div key={alert.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--color-text)" }}>{alert.label}</span>
              <Badge variant={alert.variant}>{alert.value}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("analyticsQuickActions") || "Quick actions"} subtitle={t("automationShortcuts") || "Jump into automations"} icon="⚙️" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/ops")}>
            🛠️ {t("navOps") || "Operations"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/errors")}>
            ❗ {t("navErrors") || "Errors"}
          </Button>
          <Button type="button" onClick={() => window.open("mailto:data@automation?subject=Analytics%20Report", "_blank")}>
            📧 {t("scheduleDigest") || "Schedule digest"}
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/analytics"
        title={`📊 ${t("navAnalytics") || "Analytics & Insights"}`}
        description={t("analyticsHeroDesc") || "Track performance, monitor trends, and optimize your operations."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        actions={actions}
        toolbar={toolbar}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)"
      >
        {(alertLowStock > 0 || alertErrors > 0 || alertReturns > 0) && (
          <Alert variant="warning" title={t("attentionRequired")}>
            {alertLowStock > 0 && `${alertLowStock} ${t("productsLowStock") || "products low on stock"}. `}
            {alertErrors > 0 && `${alertErrors} ${t("errorsInPeriod") || "errors in the last 7 days"}. `}
            {alertReturns > 0 && `${alertReturns} ${t("pendingReturns") || "pending returns"}.`}
          </Alert>
        )}

        {useFallbackData && (
          <Alert variant="info" title={t("analyticsSampleDataTitle")}>
            {t("analyticsSampleDataDesc")}
          </Alert>
        )}

        {isLoading ? (
          <LoadingSpinner size="lg" text={t("loadingAnalyticsData")} />
        ) : !useFallbackData && (dashError || trendError) ? (
          <Alert variant="error" title={t("failedToLoadData")}>
            {t("unableToFetchAnalytics")}
          </Alert>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginBottom: 32
              }}
            >
              <StatCard
                label={t("weeklyRevenue")}
                value={`¥${Number(weekRevenue).toLocaleString()}`}
                trend={8}
                icon="💰"
                color="success"
              />
              <StatCard
                label={t("weeklyOrders")}
                value={weekOrders}
                trend={12}
                icon="📦"
                color="primary"
              />
              <StatCard
                label={t("weeklyProfit")}
                value={`¥${Number(weekProfit).toLocaleString()}`}
                trend={6}
                icon="📈"
                color="info"
              />
              <StatCard
                label={t("conversionRate")}
                value={`${(weekConversionRate * 100).toFixed(1)}%`}
                trend={-2}
                icon="⚡"
                color="warning"
              />
            </div>

            <Card>
              <CardHeader
                title={t("monthlyOverview")}
                subtitle={t("last30DaysPerformance")}
                icon="📅"
              />
              <div
                style={{
                  display: "grid",
                  gap: 24,
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  padding: "16px 0"
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {t("totalOrders")}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {monthOrders.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {t("totalRevenue")}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-success)' }}>
                    ¥{Number(monthRevenue).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {t("totalProfit")}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-info)' }}>
                    ¥{Number(monthProfit).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {trendsArray.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <Card>
                  <CardHeader
                    title={t("revenueAndProfitAnalytics")}
                    subtitle={t("interactiveCharts").replace('{days}', selectedPeriod)}
                    icon="📊"
                  />

                  <div style={{ padding: '20px 0', marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      {t("revenueVsProfitTrend")}
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            padding: '12px'
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                          name="Revenue (¥)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                          name="Profit (¥)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: '20px 0', marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      {t("dailyOrderVolume")}
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="orders" fill="#8b5cf6" name="Total Orders" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: '20px 0' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      {t("orderSuccessRateTrend")}
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: any) => `${value.toFixed(1)}%`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="successRate"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          name="Success Rate (%)"
                          dot={{ fill: '#f59e0b', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                      {t("detailedBreakdown")}
                    </h4>
                    <div className="table-responsive">
                      <table className="table" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left' }}>{t("date")}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t("orders")}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t("revenue")}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t("profit")}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t("successRate")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '12px' }}>{row.date}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <Badge variant="info">{row.orders}</Badge>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                                ¥{row.revenue.toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', color: 'var(--color-info)', fontWeight: 600 }}>
                                ¥{row.profit.toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <Badge variant={row.successRate > 90 ? 'success' : row.successRate > 70 ? 'warning' : 'error'}>
                                  {row.successRate.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div style={{ marginTop: '32px' }}>
              <Card>
                <CardHeader
                  title={t("aiPoweredInsights")}
                  subtitle={t("dataDrivenRecommendations")}
                  icon="💡"
                />
                <div style={{ padding: '16px 0' }}>
                  <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text)' }}>
                      <strong>Revenue Growth:</strong> Your weekly revenue is trending {weekRevenue > 10000 ? 'positively' : 'steadily'}.
                      {weekRevenue > 10000 ? ' Consider scaling your operations.' : ' Focus on marketing and product optimization.'}
                    </li>
                    <li style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text)' }}>
                      <strong>Conversion Rate:</strong> At {(weekConversionRate * 100).toFixed(1)}%, your conversion is {weekConversionRate > 0.05 ? 'excellent' : 'good'}.
                      {weekConversionRate <= 0.05 ? ' Try improving product descriptions and pricing.' : ' Maintain current strategies.'}
                    </li>
                    <li style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text)' }}>
                      <strong>Order Volume:</strong> {weekOrders} orders this week.
                      {weekOrders > 50 ? ' High volume detected - ensure inventory levels are adequate.' : ' Consider promotional campaigns to boost orders.'}
                    </li>
                    {alertLowStock > 0 && (
                      <li style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-warning)' }}>
                        <strong>⚠️ Stock Alert:</strong> {alertLowStock} products need restocking to avoid fulfillment delays.
                      </li>
                    )}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        )}
      </PageLayout>

      <OnboardingTour
        pageName="analytics"
        steps={analyticsTour}
        onComplete={() => setShowTour(false)}
      />
      {!showTour && <HelpButton onClick={handleReplayTour} />}
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
