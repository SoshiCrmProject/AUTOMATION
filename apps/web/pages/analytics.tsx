import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { analyticsTour } from "../components/tourConfigs";
import { 
  Card, 
  CardHeader, 
  StatCard, 
  Button, 
  Alert, 
  LoadingSpinner,
  Badge
} from "../components/ui/index";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
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
  alerts: {
    lowStock: number;
    errors: number;
    returns: number;
  };
};

type ProfitTrend = {
  date: Date;
  totalRevenue: number;
  totalProfit: number;
  avgProfit: number | null;
  totalOrders: number;
  successfulOrders: number;
};

export default function Analytics() {
  const { t } = useTranslation("common");
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [showTour, setShowTour] = useState(false);
  
  const { data: dashboard, error: dashError } = useSWR<DashboardData>("/api/analytics/dashboard", fetcher);
  const { data: profitTrends, error: trendError } = useSWR<ProfitTrend[]>(
    `/api/analytics/profit-trends?days=${selectedPeriod}`, 
    fetcher
  );

  const isLoading = !dashboard && !dashError;

  // Calculate metrics
  const weekRevenue = dashboard?.week?._sum?.totalRevenue || 0;
  const weekOrders = dashboard?.week?._sum?.totalOrders || 0;
  const weekProfit = dashboard?.week?._sum?.totalProfit || 0;
  const monthOrders = dashboard?.month?._sum?.totalOrders || 0;
  const monthRevenue = dashboard?.month?._sum?.totalRevenue || 0;
  const monthProfit = dashboard?.month?._sum?.totalProfit || 0;
  const weekConversionRate = dashboard?.week?._avg?.conversionRate || 0;

  const trendsArray = Array.isArray(profitTrends) ? profitTrends : [];

  // Prepare chart data
  const chartData = trendsArray.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(trend.totalRevenue),
    profit: Number(trend.totalProfit),
    orders: trend.totalOrders,
    successRate: trend.totalOrders > 0 ? (trend.successfulOrders / trend.totalOrders) * 100 : 0
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="shell">
      <AppNav activeHref="/analytics" />
      <div className="container">
        {/* Hero Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          marginBottom: '32px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', fontWeight: 900, background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                📊 {t("navAnalytics") || "Analytics & Insights"}
              </h1>
              <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: '16px' }}>
                Track performance, monitor trends, and optimize your dropshipping operations
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="select"
                style={{ width: 'auto', marginBottom: 0 }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Button onClick={() => window.location.reload()} variant="ghost">
                🔄 Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {dashboard?.alerts && (dashboard.alerts.lowStock > 0 || dashboard.alerts.errors > 0) && (
          <Alert variant="warning" title="Attention Required">
            {dashboard.alerts.lowStock > 0 && `${dashboard.alerts.lowStock} products low on stock. `}
            {dashboard.alerts.errors > 0 && `${dashboard.alerts.errors} errors in the last 7 days. `}
            {dashboard.alerts.returns > 0 && `${dashboard.alerts.returns} pending returns.`}
          </Alert>
        )}

        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading analytics data..." />
        ) : dashError ? (
          <Alert variant="error" title="Failed to Load Data">
            Unable to fetch analytics. Please try again later.
          </Alert>
        ) : (
          <div>
            {/* Key Metrics Cards */}
            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
              <StatCard 
                label="Weekly Revenue"
                value={`¥${Number(weekRevenue).toLocaleString()}`}
                trend={8}
                icon="💰"
                color="success"
              />
              <StatCard 
                label="Weekly Orders"
                value={weekOrders}
                trend={12}
                icon="📦"
                color="primary"
              />
              <StatCard 
                label="Weekly Profit"
                value={`¥${Number(weekProfit).toLocaleString()}`}
                trend={6}
                icon="📈"
                color="info"
              />
              <StatCard 
                label="Conversion Rate"
                value={`${(weekConversionRate * 100).toFixed(1)}%`}
                trend={-2}
                icon="⚡"
                color="warning"
              />
            </div>

            {/* Monthly Overview */}
            <Card>
              <CardHeader 
                title="Monthly Overview" 
                subtitle="Last 30 days performance"
                icon="📅" 
              />
              <div className="grid grid-3" style={{ gap: '24px', padding: '16px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Total Orders
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {monthOrders.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-success)' }}>
                    ¥{Number(monthRevenue).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-info)' }}>
                    ¥{Number(monthProfit).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Profit Trends */}
            {trendsArray.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <Card>
                  <CardHeader 
                    title="📈 Revenue & Profit Analytics" 
                    subtitle={`Interactive charts for last ${selectedPeriod} days`}
                    icon="📊" 
                  />
                  
                  {/* Revenue & Profit Line Chart */}
                  <div style={{ padding: '20px 0', marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      Revenue vs Profit Trend
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

                  {/* Orders Bar Chart */}
                  <div style={{ padding: '20px 0', marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      Daily Order Volume
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

                  {/* Success Rate Chart */}
                  <div style={{ padding: '20px 0' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '16px', paddingLeft: '20px' }}>
                      Order Success Rate Trend
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

                  {/* Data Table */}
                  <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                      Detailed Breakdown
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Orders</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Revenue</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Profit</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Success Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.slice(0, 10).map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
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

            {/* AI Insights */}
            <div style={{ marginTop: '32px' }}>
              <Card>
                <CardHeader 
                  title="AI-Powered Insights" 
                  subtitle="Data-driven recommendations"
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
                    {dashboard?.alerts?.lowStock && dashboard.alerts.lowStock > 0 && (
                      <li style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-warning)' }}>
                        <strong>⚠️ Stock Alert:</strong> {dashboard.alerts.lowStock} products need restocking to avoid fulfillment delays.
                      </li>
                    )}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        )}

        <OnboardingTour 
          pageName="analytics" 
          steps={analyticsTour} 
          onComplete={() => setShowTour(false)} 
        />
        {!showTour && <HelpButton onClick={() => {
          localStorage.removeItem("tour_completed_analytics");
          setShowTour(true);
          window.location.reload();
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
