import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type Customer = {
  id: string;
  email: string;
  name: string;
  totalOrders: number;
  lifetimeValue: number;
  loyaltyTier: string;
  lastPurchase: string;
  isBlacklisted: boolean;
};

type CustomerStats = {
  totalCustomers: number;
  avgLifetimeValue: number;
  loyaltyDistribution: Record<string, number>;
  blacklistedCount: number;
};

export default function CRM() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  
  const { data: customers } = useSWR<Customer[]>(
    shopId ? `/api/crm/${shopId}` : null,
    fetcher
  );
  
  const { data: stats } = useSWR<CustomerStats>(
    shopId ? `/api/crm/stats/${shopId}` : null,
    fetcher
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "var(--color-secondary)";
      case "GOLD": return "#f59e0b";
      case "SILVER": return "#94a3b8";
      case "BRONZE": return "#a16207";
      default: return "var(--color-text-muted)";
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "💎";
      case "GOLD": return "🥇";
      case "SILVER": return "🥈";
      case "BRONZE": return "🥉";
      default: return "👤";
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/crm" />
      <div className="container">
        <div className="hero" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>👥 Customer Relationship Management</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
              Build relationships, track loyalty, and maximize customer lifetime value
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="card" style={{ marginBottom: 24 }}>
          <label className="label">Shop ID</label>
          <input
            className="input"
            type="text"
            placeholder="Enter Shop ID"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          />
        </div>

        {shopId && stats && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>👥</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    TOTAL CUSTOMERS
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-primary)" }}>
                  {stats.totalCustomers.toLocaleString()}
                </h2>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>💰</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    AVG LIFETIME VALUE
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-success)" }}>
                  ${stats.avgLifetimeValue.toFixed(2)}
                </h2>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>💎</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    PLATINUM MEMBERS
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-secondary)" }}>
                  {stats.loyaltyDistribution.PLATINUM || 0}
                </h2>
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>🚫</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    BLACKLISTED
                  </span>
                </div>
                <h2 style={{ fontSize: 32, margin: 0, color: "var(--color-error)" }}>
                  {stats.blacklistedCount}
                </h2>
              </div>
            </div>

            {/* Loyalty Distribution */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>🏆 Loyalty Tier Distribution</h3>
              <div className="grid grid-4">
                {Object.entries(stats.loyaltyDistribution).map(([tier, count]) => (
                  <div
                    key={tier}
                    style={{
                      padding: 20,
                      background: "var(--color-elevated)",
                      borderRadius: "var(--radius-lg)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{getTierEmoji(tier)}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4 }}>
                      {tier}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: getTierColor(tier) }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customers Table */}
            {customers && customers.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>📋 Customer List</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Tier</th>
                        <th>Orders</th>
                        <th>Lifetime Value</th>
                        <th>Last Purchase</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id}>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600 }}>{customer.name}</div>
                              <div style={{ fontSize: 13, color: "var(--color-text-light)" }}>
                                {customer.email}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 20 }}>{getTierEmoji(customer.loyaltyTier)}</span>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: getTierColor(customer.loyaltyTier),
                                }}
                              >
                                {customer.loyaltyTier}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge">{customer.totalOrders}</span>
                          </td>
                          <td style={{ color: "var(--color-success)", fontWeight: 600 }}>
                            ${customer.lifetimeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                            {new Date(customer.lastPurchase).toLocaleDateString()}
                          </td>
                          <td>
                            {customer.isBlacklisted ? (
                              <span className="badge badge-error">Blacklisted</span>
                            ) : (
                              <span className="badge badge-success">Active</span>
                            )}
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
              <p style={{ marginTop: 4 }}>Enter your Shop ID above to view customer data</p>
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
