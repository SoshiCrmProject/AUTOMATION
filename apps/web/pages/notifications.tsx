import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type NotificationChannel = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: any;
};

type SentNotification = {
  id: string;
  channelId: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
};

export default function Notifications() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  
  const { data: channels } = useSWR<NotificationChannel[]>(
    shopId ? `/api/notifications/channels/${shopId}` : null,
    fetcher
  );
  
  const { data: history } = useSWR<SentNotification[]>(
    shopId ? `/api/notifications/history?shopId=${shopId}&limit=50` : null,
    fetcher
  );

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "EMAIL": return "📧";
      case "SMS": return "📱";
      case "SLACK": return "💬";
      case "DISCORD": return "🎮";
      case "WEBHOOK": return "🔗";
      default: return "🔔";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "error";
      case "HIGH": return "warning";
      case "MEDIUM": return "info";
      case "LOW": return "success";
      default: return "info";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT": return "success";
      case "FAILED": return "error";
      case "PENDING": return "warning";
      default: return "info";
    }
  };

  const testChannel = async (channelId: string) => {
    try {
      await api.post(`/api/notifications/test/${channelId}`);
      alert("Test notification sent!");
    } catch (err) {
      alert("Failed to send test notification");
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/notifications" />
      <div className="container">
        <div className="hero" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>🔔 Notification Center</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
              Manage notification channels, rules, and view delivery history
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

        {shopId && (
          <>
            {/* Channels */}
            {channels && channels.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>📡 Notification Channels</h3>
                <div className="grid grid-3">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="card"
                      style={{
                        background: channel.isActive
                          ? "linear-gradient(135deg, var(--color-surface), var(--color-elevated))"
                          : "var(--color-hover)",
                        opacity: channel.isActive ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 32 }}>{getChannelIcon(channel.type)}</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0 }}>{channel.name}</h4>
                          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                            {channel.type}
                          </div>
                        </div>
                        {channel.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge">Inactive</span>
                        )}
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ width: "100%" }}
                        onClick={() => testChannel(channel.id)}
                        disabled={!channel.isActive}
                      >
                        Send Test
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notification History */}
            {history && history.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>📜 Notification History</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Channel</th>
                        <th>Sent At</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((notif) => (
                        <tr key={notif.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{notif.subject}</div>
                            <div style={{ fontSize: 13, color: "var(--color-text-light)", marginTop: 4 }}>
                              {notif.message.substring(0, 60)}...
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${getPriorityColor(notif.priority)}`}>
                              {notif.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${getStatusColor(notif.status)}`}>
                              {notif.status}
                            </span>
                          </td>
                          <td>
                            <span className="pill">
                              {channels?.find((c) => c.id === notif.channelId)?.type || "Unknown"}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                            {new Date(notif.sentAt).toLocaleString()}
                          </td>
                          <td>
                            {notif.errorMessage && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--color-error)",
                                  cursor: "pointer",
                                }}
                                title={notif.errorMessage}
                              >
                                ⚠️ Error
                              </span>
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
              <p style={{ marginTop: 4 }}>Enter your Shop ID above to manage notifications</p>
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
