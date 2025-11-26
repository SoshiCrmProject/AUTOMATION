import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type DailyMetric = {
  id: string;
  date: string;
  revenue: number;
  ordersCount: number;
  avgProfit: number;
  totalCost: number;
};

type ProductPerformance = {
  productId: string;
  title: string;
  salesCount: number;
  totalRevenue: number;
  avgMargin: number;
};

export default function Analytics() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [dateRange, setDateRange] = useState(30);
  
  const { data: dailyMetrics } = useSWR<DailyMetric[]>(
    shopId ? `/api/analytics/daily?shopId=${shopId}&days=${dateRange}` : null,
    fetcher
  );
  
  const { data: dashboard } = useSWR<any>(
    shopId ? `/api/analytics/dashboard?shopId=${shopId}` : null,
    fetcher
  );
  
  const { data: productPerf } = useSWR<ProductPerformance[]>(
    shopId ? `/api/analytics/products/performance?shopId=${shopId}&limit=10` : null,
    fetcher
  );

  const totalRevenue = dailyMetrics?.reduce((sum, m) => sum + m.revenue, 0) || 0;
  const totalOrders = dailyMetrics?.reduce((sum, m) => sum + m.ordersCount, 0) || 0;
  const avgMargin = dailyMetrics && dailyMetrics.length > 0
    ? dailyMetrics.reduce((sum, m) => sum + m.avgProfit, 0) / dailyMetrics.length
    : 0;

  return (
    <div className="shell">
      <AppNav activeHref="/analytics" />
      <div className="container">
        <div className="hero" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>📊 Analytics & Insights</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
              Track performance, monitor trends, and optimize your dropshipping operations
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <div>
              <label className="label">Shop ID</label>
              <input
                className="input"
                type="text"
                placeholder="Enter Shop ID"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Date Range</label>
              <select
                className="select"
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {shopId && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>💰</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    TOTAL REVENUE
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-success)" }}>
                  ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 8 }}>
                  Last {dateRange} days
                </p>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>📦</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    TOTAL ORDERS
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-primary)" }}>
                  {totalOrders.toLocaleString()}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 8 }}>
                  Fulfilled orders
                </p>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>📈</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    AVG MARGIN
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-secondary)" }}>
                  {avgMargin.toFixed(2)}%
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 8 }}>
                  Profit margin
                </p>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>⚡</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    AVG ORDER VALUE
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-warning)" }}>
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 8 }}>
                  Per order
                </p>
              </div>
            </div>

            {/* Daily Metrics Table */}
            {dailyMetrics && dailyMetrics.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>📅 Daily Performance</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                        <th>Total Cost</th>
                        <th>Avg Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMetrics.slice(0, 10).map((metric) => (
                        <tr key={metric.id}>
                          <td>{new Date(metric.date).toLocaleDateString()}</td>
                          <td>
                            <span className="badge">{metric.ordersCount}</span>
                          </td>
                          <td style={{ color: "var(--color-success)", fontWeight: 600 }}>
                            ${metric.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ color: "var(--color-error)" }}>
                            ${metric.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className="pill pill-success">
                              {metric.avgProfit.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Performance */}
            {productPerf && productPerf.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>🏆 Top Performing Products</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Sales</th>
                        <th>Revenue</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerf.map((product, idx) => (
                        <tr key={product.productId}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span className="badge badge-success">#{idx + 1}</span>
                              <span style={{ fontWeight: 500 }}>{product.title}</span>
                            </div>
                          </td>
                          <td>
                            <span className="pill">{product.salesCount} orders</span>
                          </td>
                          <td style={{ color: "var(--color-success)", fontWeight: 600 }}>
                            ${product.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className="pill pill-success">
                              {product.avgMargin.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!shopId && (
          <div className="alert alert-info">
            <span style={{ fontSize: 20 }}>ℹ️</span>
            <div>
              <strong>Get Started</strong>
              <p style={{ marginTop: 4 }}>Enter your Shop ID above to view analytics and insights</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
