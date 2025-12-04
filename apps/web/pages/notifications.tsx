import { useMemo, useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import {
  Card,
  CardHeader,
  StatCard,
  Button,
  Badge,
  Input,
  Table,
  Alert,
  LoadingSpinner,
  EmptyState,
  Modal,
  Select,
  Tabs,
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string, locale: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value));

const formatDateTime = (value: string, locale: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(value));

type NotificationChannel = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config: any;
  createdAt: string;
};

type NotificationRule = {
  id: string;
  name: string;
  event: string;
  channelId: string;
  isActive: boolean;
  conditions?: any;
  template: string;
  priority: string;
  createdAt: string;
};

type SentNotification = {
  id: string;
  channelId: string;
  channelName?: string;
  channelType?: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
};

export default function Notifications() {
  const { t, i18n } = useTranslation("common");
  const localeForDisplay = i18n.language === "ja" ? "ja-JP" : "en-US";
  const [shopId, setShopId] = useState<string>("");
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newChannel, setNewChannel] = useState({
    name: "",
    type: "EMAIL",
    config: {}
  });
  
  const [newRule, setNewRule] = useState({
    name: "",
    event: "ORDER_PLACED",
    channelId: "",
    priority: "MEDIUM",
    template: ""
  });

  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [ruleSearch, setRuleSearch] = useState<string>("");
  const [historySearch, setHistorySearch] = useState<string>("");
  
  const { data: channels, mutate: refreshChannels } = useSWR<NotificationChannel[]>(
    shopId ? `/api/notifications/channels/${shopId}` : null,
    fetcher
  );
  
  const { data: rules, mutate: refreshRules } = useSWR<NotificationRule[]>(
    shopId ? `/api/notifications/rules?shopId=${shopId}` : null,
    fetcher
  );
  
  const { data: history, mutate: refreshHistory } = useSWR<SentNotification[]>(
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

  const getChannelLabel = (type: string) => {
    switch (type) {
      case "EMAIL": return t("channelEmail") || "Email";
      case "SMS": return t("channelSMS") || "SMS";
      case "SLACK": return t("channelSlack") || "Slack";
      case "DISCORD": return t("channelDiscord") || "Discord";
      case "WEBHOOK": return t("channelWebhook") || "Webhook";
      default: return type;
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return t("priorityCritical") || "Critical";
      case "HIGH": return t("priorityHigh") || "High";
      case "MEDIUM": return t("priorityMedium") || "Medium";
      case "LOW": return t("priorityLow") || "Low";
      default: return priority;
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SENT": return t("notificationStatusSent") || "Sent";
      case "FAILED": return t("notificationStatusFailed") || "Failed";
      case "PENDING": return t("notificationStatusPending") || "Pending";
      default: return t("notificationStatusUnknown") || status || "Unknown";
    }
  };

  const testChannel = async (channelId: string) => {
    try {
      await api.post(`/api/notifications/test/${channelId}`);
      pushToast(t("toastTestNotificationSuccess") || "Test notification sent", "success");
      refreshHistory();
    } catch (err) {
      pushToast(t("toastTestNotificationFailed") || "Failed to send test notification", "error");
    }
  };

  const handleAddChannel = async () => {
    if (!shopId || !newChannel.name) {
      pushToast(t("toastPleaseFilLRequiredFields") || "Please fill in all required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/notifications/channels', {
        shopId,
        ...newChannel
      });
      pushToast(t("toastChannelCreated") || "Channel created", "success");
      setShowAddChannelModal(false);
      setNewChannel({ name: "", type: "EMAIL", config: {} });
      refreshChannels();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("toastChannelCreateFailed") || "Failed to create channel", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!shopId || !newRule.name || !newRule.channelId) {
      pushToast(t("toastPleaseFilLRequiredFields") || "Please fill in all required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/notifications/rules', {
        shopId,
        ...newRule
      });
      pushToast(t("toastRuleCreated") || "Notification rule created", "success");
      setShowAddRuleModal(false);
      setNewRule({ name: "", event: "ORDER_PLACED", channelId: "", priority: "MEDIUM", template: "" });
      refreshRules();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("toastRuleCreateFailed") || "Failed to create rule", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channelId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/notifications/channels/${channelId}`, { isActive });
      pushToast(
        isActive
          ? t("toastChannelActivated") || "Channel activated"
          : t("toastChannelDeactivated") || "Channel deactivated",
        "success"
      );
      refreshChannels();
    } catch (err) {
      pushToast(t("toastChannelUpdateFailed") || "Failed to update channel", "error");
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/notifications/rules/${ruleId}`, { isActive });
      pushToast(
        isActive
          ? t("toastRuleActivated") || "Rule activated"
          : t("toastRuleDeactivated") || "Rule deactivated",
        "success"
      );
      refreshRules();
    } catch (err) {
      pushToast(t("toastRuleUpdateFailed") || "Failed to update rule", "error");
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm(t("confirmDeleteChannel") || "Delete this channel?")) return;
    
    try {
      await api.delete(`/api/notifications/channels/${channelId}`);
      pushToast(t("toastChannelDeleted") || "Channel deleted", "success");
      refreshChannels();
    } catch (err) {
      pushToast(t("toastChannelDeleteFailed") || "Failed to delete channel", "error");
    }
  };

  const channelsArray = Array.isArray(channels) ? channels : [];
  const rulesArray = Array.isArray(rules) ? rules : [];
  const historyArray = Array.isArray(history) ? history : [];
  const isLoadingData = Boolean(shopId.trim()) && (!channels || !rules || !history);

  const stats = {
    totalChannels: channelsArray.length,
    activeChannels: channelsArray.filter(c => c.isActive).length,
    totalRules: rulesArray.length,
    activeRules: rulesArray.filter(r => r.isActive).length,
    sentToday: historyArray.filter(h => {
      const sent = new Date(h.sentAt);
      const today = new Date();
      return sent.toDateString() === today.toDateString();
    }).length,
    failedToday: historyArray.filter(h => {
      const sent = new Date(h.sentAt);
      const today = new Date();
      return sent.toDateString() === today.toDateString() && h.status === 'FAILED';
    }).length
  };

  const filteredChannels = useMemo(() => {
    if (channelFilter === "all") return channelsArray;
    return channelsArray.filter((channel) => channel.type === channelFilter);
  }, [channelFilter, channelsArray]);

  const filteredRules = useMemo(() => {
    if (!ruleSearch.trim()) return rulesArray;
    const term = ruleSearch.toLowerCase();
    return rulesArray.filter((rule) => {
      const channel = channelsArray.find((c) => c.id === rule.channelId);
      return (
        rule.name.toLowerCase().includes(term) ||
        rule.event.toLowerCase().includes(term) ||
        (channel?.name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [ruleSearch, rulesArray, channelsArray]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyArray;
    const term = historySearch.toLowerCase();
    return historyArray.filter((entry) =>
      entry.subject.toLowerCase().includes(term) ||
      entry.message.toLowerCase().includes(term) ||
      entry.status.toLowerCase().includes(term)
    );
  }, [historySearch, historyArray]);

  const recentFailures = useMemo(() => historyArray.filter((entry) => entry.status === "FAILED").slice(0, 3), [historyArray]);

  const hasShopContext = Boolean(shopId.trim());

  const heroBadge = (
    <Badge variant={hasShopContext ? "success" : "warning"}>
      {hasShopContext ? t("liveData") || "Live data" : t("awaitingShopId") || "Awaiting shop ID"}
    </Badge>
  );

  const heroHighlights = [
    {
      label: t("notificationsChannels") || "Channels",
      value: formatNumber(stats.totalChannels, localeForDisplay),
      helper: t("notificationsChannelsHelper") || "Configured endpoints",
    },
    {
      label: t("notificationsRules") || "Rules",
      value: formatNumber(stats.totalRules, localeForDisplay),
      helper: t("notificationsRulesHelper") || "Automation recipes",
    },
    {
      label: t("notificationsSentToday") || "Sent today",
      value: formatNumber(stats.sentToday, localeForDisplay),
      helper: t("notificationsSentHelper") || "24h deliveries",
    },
  ];

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.4)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", textTransform: "uppercase" }}>{stat.label}</span>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)" }}>{stat.value}</div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {t("notificationsHeroFooter") || "Provide a shop ID to synchronize rules and delivery logs."}
    </span>
  );

  const handleRefreshAll = () => {
    if (!hasShopContext) return;
    refreshChannels();
    refreshRules();
    refreshHistory();
    pushToast(t("notificationsRefreshing") || "Refreshing notification data", "success");
  };

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <Input
          label={t("shopId") || "Shop ID"}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          placeholder={t("enterShopIDNotifications") || "Enter Shop ID"}
        />
      </div>
      <Select
        label={t("channelType") || "Channel type"}
        value={channelFilter}
        onChange={(e) => setChannelFilter(e.target.value)}
        options={[
          { value: "all", label: t("allChannels") || "All channels" },
          { value: "EMAIL", label: t("channelEmail") || "Email" },
          { value: "SMS", label: t("channelSMS") || "SMS" },
          { value: "SLACK", label: t("channelSlack") || "Slack" },
          { value: "DISCORD", label: t("channelDiscord") || "Discord" },
          { value: "WEBHOOK", label: t("channelWebhook") || "Webhook" },
        ]}
        style={{ minWidth: 180 }}
      />
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <Input
          label={t("search") || "Search"}
          placeholder={t("searchNotifications") || "Search rules or history"}
          value={ruleSearch}
          onChange={(e) => setRuleSearch(e.target.value)}
        />
      </div>
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <Input
          label={t("historySearch") || "History filter"}
          placeholder={t("searchHistory") || "Filter delivery history"}
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
        />
      </div>
    </div>
  );

  const actions = (
    <div className="stack-md wrap">
      <Button type="button" className="full-width-mobile" onClick={() => setShowAddChannelModal(true)} disabled={!hasShopContext}>
        ➕ {t("addChannel") || "Add channel"}
      </Button>
      <Button type="button" className="full-width-mobile" onClick={() => setShowAddRuleModal(true)} disabled={!hasShopContext}>
        ⚙️ {t("addRule") || "Add rule"}
      </Button>
      <Button type="button" variant="ghost" className="full-width-mobile" onClick={handleRefreshAll} disabled={!hasShopContext}>
        ♻️ {t("refreshData") || "Refresh"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="full-width-mobile"
        onClick={() => {
          setHistorySearch("");
          setRuleSearch("");
          setChannelFilter("all");
        }}
        disabled={!historySearch && !ruleSearch && channelFilter === "all"}
      >
        🧼 {t("clearFilters") || "Clear"}
      </Button>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("notificationsHealth") || "Channel health"}
          subtitle={t("notificationsHealthSubtitle") || "Live status"}
          icon="🩺"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{
            label: t("activeChannels") || "Active channels",
            value: `${formatNumber(stats.activeChannels, localeForDisplay)}/${formatNumber(stats.totalChannels, localeForDisplay)}`,
            variant: "success" as const,
          }, {
            label: t("activeRules") || "Active rules",
            value: `${formatNumber(stats.activeRules, localeForDisplay)}/${formatNumber(stats.totalRules, localeForDisplay)}`,
            variant: "info" as const,
          }, {
            label: t("failedToday") || "Failures today",
            value: formatNumber(stats.failedToday, localeForDisplay),
            variant: stats.failedToday > 0 ? ("error" as const) : ("default" as const),
          }].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{item.label}</span>
              <Badge variant={item.variant}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card hover={false}>
        <CardHeader
          title={t("notificationsBestPractices") || "Best practices"}
          subtitle={t("notificationsBestPracticesSubtitle") || "Keep alerts helpful"}
          icon="💡"
        />
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {[t("notificationsTipDedupe") || "Deduplicate alerts per channel to avoid spam.",
            t("notificationsTipPriority") || "Reserve critical priority for blocking events.",
            t("notificationsTipTesting") || "Test channels weekly to verify credentials."]
            .map((tip) => (
              <li key={tip} style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{tip}</li>
            ))}
        </ul>
      </Card>

      {recentFailures.length > 0 && (
        <Card hover={false}>
          <CardHeader
            title={t("notificationsRecentFailures") || "Recent failures"}
            subtitle={t("notificationsRecentFailuresSubtitle") || "Last few delivery errors"}
            icon="🚨"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentFailures.map((entry) => (
              <div key={entry.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 12, background: "var(--color-surface)" }}>
                <strong style={{ display: "block", fontSize: 13 }}>{entry.subject}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {formatDateTime(entry.sentAt, localeForDisplay)}
                </span>
                {entry.errorMessage && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-error)" }}>{entry.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/notifications"
        title={`🔔 ${t("notificationsTitle") || "Notification Center"}`}
        description={t("notificationsHeroSubtitle") || "Multi-channel alerts, automation rules, and delivery tracking"}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, #fef9c3 0%, #dbeafe 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {!hasShopContext && (
            <Alert variant="info" title={t("getStarted") || "Get started"}>
              {t("notificationsProvideShop") || "Enter a Shop ID to load channels, rules, and delivery history."}
            </Alert>
          )}

          {hasShopContext && (
            <>
              {isLoadingData && <LoadingSpinner text={t("loadingNotifications") || "Loading notification data"} />}

              <Card>
                <CardHeader
                  title={t("notificationsStatsTitle") || "Operations pulse"}
                  subtitle={t("notificationsStatsSubtitle") || "Quick look at live automation"}
                  icon="📊"
                />
                <div className="grid grid-4" style={{ gap: 16 }}>
                  <StatCard
                    icon="📡"
                    label={t("totalChannels") || "Total channels"}
                    value={formatNumber(stats.totalChannels, localeForDisplay)}
                    color="primary"
                    trend={stats.activeChannels}
                  />
                  <StatCard
                    icon="⚙️"
                    label={t("activeRules") || "Active rules"}
                    value={formatNumber(stats.activeRules, localeForDisplay)}
                    color="info"
                  />
                  <StatCard
                    icon="📤"
                    label={t("sentToday") || "Sent today"}
                    value={formatNumber(stats.sentToday, localeForDisplay)}
                    color="success"
                  />
                  <StatCard
                    icon="⚠️"
                    label={t("failedToday") || "Failed today"}
                    value={formatNumber(stats.failedToday, localeForDisplay)}
                    color="error"
                  />
                </div>
              </Card>

              <Card>
                <Tabs
                  tabs={[
                    {
                      id: "channels",
                      label: t("channels") || "Channels",
                      icon: "📡",
                      badge: channelsArray.length,
                      content: (
                        <div style={{ padding: 24 }}>
                          {filteredChannels.length > 0 ? (
                            <div className="grid grid-3" style={{ gap: 20 }}>
                              {filteredChannels.map((channel) => (
                                <div
                                  key={channel.id}
                                  style={{
                                    padding: 20,
                                    background: "rgba(255, 255, 255, 0.9)",
                                    borderRadius: "var(--radius-lg)",
                                    border: channel.isActive ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid var(--color-border)",
                                    boxShadow: "var(--shadow-sm)",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                      <span style={{ fontSize: 28 }}>{getChannelIcon(channel.type)}</span>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: 16 }}>{channel.name}</h4>
                                        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>{getChannelLabel(channel.type)}</p>
                                      </div>
                                    </div>
                                    <Badge variant={channel.isActive ? "success" : "error"}>
                                      {channel.isActive ? t("active") || "Active" : t("inactive") || "Inactive"}
                                    </Badge>
                                  </div>
                                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
                                    {t("created") || "Created"}: {formatDate(channel.createdAt, localeForDisplay)}
                                  </div>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <Button variant="primary" size="sm" onClick={() => testChannel(channel.id)} disabled={!channel.isActive} fullWidth>
                                      {t("test") || "Test"}
                                    </Button>
                                    <Button
                                      variant={channel.isActive ? "warning" : "success"}
                                      size="sm"
                                      onClick={() => toggleChannel(channel.id, !channel.isActive)}
                                      fullWidth
                                    >
                                      {channel.isActive ? t("disable") || "Disable" : t("enable") || "Enable"}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => deleteChannel(channel.id)}
                                      aria-label={t("deleteChannelAction") || "Delete channel"}
                                      title={t("deleteChannelAction") || "Delete channel"}
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState
                              icon="📡"
                              title={t("noChannelsConfigured") || "No channels configured"}
                              description={t("descriptionAddFirstChannel") || "Connect email, SMS, or webhooks to start sending alerts."}
                              action={
                                <Button type="button" onClick={() => setShowAddChannelModal(true)}>
                                  ➕ {t("addChannel") || "Add channel"}
                                </Button>
                              }
                            />
                          )}
                        </div>
                      ),
                    },
                    {
                      id: "rules",
                      label: t("rules") || "Rules",
                      icon: "⚙️",
                      badge: rulesArray.length,
                      content: (
                        <div style={{ padding: 24 }}>
                          {filteredRules.length > 0 ? (
                            <Table
                              columns={[
                                { key: "name", header: t("ruleName") || "Rule name" },
                                { key: "event", header: t("event") || "Event", width: "160px" },
                                {
                                  key: "channel",
                                  header: t("channel") || "Channel",
                                  width: "160px",
                                  render: (row: any) => {
                                    const channel = channelsArray.find((c) => c.id === row.channelId);
                                    return channel ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>{getChannelIcon(channel.type)}</span>
                                        <div>
                                          <div style={{ fontSize: 13, fontWeight: 600 }}>{channel.name}</div>
                                          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{getChannelLabel(channel.type)}</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("unknown") || "Unknown"}</span>
                                    );
                                  },
                                },
                                {
                                  key: "priority",
                                  header: t("priority") || "Priority",
                                  width: "120px",
                                  render: (row: any) => <Badge variant={getPriorityColor(row.priority) as any}>{getPriorityLabel(row.priority)}</Badge>,
                                },
                                {
                                  key: "status",
                                  header: t("status") || "Status",
                                  width: "110px",
                                  render: (row: any) => <Badge variant={row.isActive ? "success" : "error"}>{row.isActive ? t("active") || "Active" : t("inactive") || "Inactive"}</Badge>,
                                },
                                {
                                  key: "actions",
                                  header: t("actions") || "Actions",
                                  width: "140px",
                                  render: (row: any) => (
                                    <Button variant={row.isActive ? "warning" : "success"} size="sm" onClick={() => toggleRule(row.id, !row.isActive)}>
                                      {row.isActive ? t("disable") || "Disable" : t("enable") || "Enable"}
                                    </Button>
                                  ),
                                },
                              ]}
                              data={filteredRules}
                            />
                          ) : (
                            <EmptyState
                              icon="⚙️"
                              title={t("noNotificationRules") || "No notification rules"}
                              description={t("descriptionCreateAutomationRules") || "Automate alerts by adding rules for each event."}
                              action={
                                <Button type="button" onClick={() => setShowAddRuleModal(true)}>
                                  ⚙️ {t("addRule") || "Add rule"}
                                </Button>
                              }
                            />
                          )}
                        </div>
                      ),
                    },
                    {
                      id: "history",
                      label: t("history") || "History",
                      icon: "📜",
                      badge: historyArray.length,
                      content: (
                        <div style={{ padding: 24 }}>
                          {filteredHistory.length > 0 ? (
                            <Table
                              columns={[
                                {
                                  key: "subject",
                                  header: t("subject") || "Subject",
                                  render: (row: any) => (
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{row.subject}</div>
                                      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                                        {row.message.substring(0, 80)}...
                                      </div>
                                    </div>
                                  ),
                                },
                                {
                                  key: "priority",
                                  header: t("priority") || "Priority",
                                  width: "110px",
                                  render: (row: any) => <Badge variant={getPriorityColor(row.priority) as any}>{getPriorityLabel(row.priority)}</Badge>,
                                },
                                {
                                  key: "status",
                                  header: t("status") || "Status",
                                  width: "110px",
                                  render: (row: any) => <Badge variant={getStatusColor(row.status) as any}>{getStatusLabel(row.status)}</Badge>,
                                },
                                {
                                  key: "channel",
                                  header: t("channel") || "Channel",
                                  width: "140px",
                                  render: (row: any) => {
                                    const channel = channelsArray.find((c) => c.id === row.channelId);
                                    const channelType = channel?.type || row.channelType || "UNKNOWN";
                                    return (
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>{getChannelIcon(channelType)}</span>
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 600 }}>{channel?.name || row.channelName || t("unknown") || "Unknown"}</div>
                                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{getChannelLabel(channelType)}</div>
                                        </div>
                                      </div>
                                    );
                                  },
                                },
                                {
                                  key: "sentAt",
                                  header: t("sentAt") || "Sent at",
                                  width: "180px",
                                  render: (row: any) => (
                                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                                      {formatDateTime(row.sentAt, localeForDisplay)}
                                    </span>
                                  ),
                                },
                                {
                                  key: "error",
                                  header: t("error") || "Error",
                                  width: "100px",
                                  render: (row: any) =>
                                    row.errorMessage ? (
                                      <span style={{ fontSize: 12, color: "var(--color-error)", cursor: "pointer" }} title={row.errorMessage}>
                                        ⚠️ {t("error") || "Error"}
                                      </span>
                                    ) : null,
                                },
                              ]}
                              data={filteredHistory}
                            />
                          ) : (
                            <EmptyState
                              icon="📜"
                              title={t("noNotificationHistory") || "No notification history"}
                              description={t("descriptionSentNotifications") || "Recent delivery attempts will appear here."}
                            />
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          )}
        </div>
      </PageLayout>

      <Toast />

      {/* Add Channel Modal */}
      <Modal
        isOpen={showAddChannelModal}
        onClose={() => {
          setShowAddChannelModal(false);
          setNewChannel({ name: "", type: "EMAIL", config: {} });
        }}
        title={t("addNotificationChannel") || "Add Notification Channel"}
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={t("channelName") || "Channel Name"}
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            placeholder={t("channelNamePlaceholder")}
          />
          <Select
            label={t("channelType") || "Channel Type"}
            value={newChannel.type}
            onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
            options={[
              { value: "EMAIL", label: `📧 ${t("channelEmail") || "Email"}` },
              { value: "SMS", label: `📱 ${t("channelSMS") || "SMS"}` },
              { value: "SLACK", label: `💬 ${t("channelSlack") || "Slack"}` },
              { value: "DISCORD", label: `🎮 ${t("channelDiscord") || "Discord"}` },
              { value: "WEBHOOK", label: `🔗 ${t("channelWebhook") || "Webhook"}` }
            ]}
          />
          <Alert variant="info">
            {t("channelConfigHint") || "Channel configuration can be set after creation"}
          </Alert>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button onClick={handleAddChannel} disabled={loading} fullWidth>
              {loading ? t("creatingChannel") || "Creating..." : t("createChannel") || "Create Channel"}
            </Button>
            <Button onClick={() => setShowAddChannelModal(false)} variant="ghost" fullWidth>
              {t("cancel") || "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Rule Modal */}
      <Modal
        isOpen={showAddRuleModal}
        onClose={() => {
          setShowAddRuleModal(false);
          setNewRule({ name: "", event: "ORDER_PLACED", channelId: "", priority: "MEDIUM", template: "" });
        }}
        title={t("createNotificationRule") || "Create Notification Rule"}
        size="lg"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={t("ruleName") || "Rule Name"}
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            placeholder={t("ruleNamePlaceholder")}
          />
          <Select
            label={t("eventTrigger") || "Trigger Event"}
            value={newRule.event}
            onChange={(e) => setNewRule({ ...newRule, event: e.target.value })}
            options={[
              { value: "ORDER_PLACED", label: t("eventOrderPlaced") || "Order Placed" },
              { value: "ORDER_PAID", label: t("eventOrderPaid") || "Order Paid" },
              { value: "ORDER_SHIPPED", label: t("eventOrderShipped") || "Order Shipped" },
              { value: "ORDER_FAILED", label: t("eventOrderFailed") || "Order Failed" },
              { value: "LOW_STOCK", label: t("eventLowStock") || "Low Stock" },
              { value: "PRICE_CHANGE", label: t("eventPriceChange") || "Price Change" },
              { value: "ERROR_OCCURRED", label: t("eventError") || "Error" }
            ]}
          />
          <Select
            label={t("notificationChannel") || "Notification Channel"}
            value={newRule.channelId}
            onChange={(e) => setNewRule({ ...newRule, channelId: e.target.value })}
            options={[
              { value: "", label: t("selectChannelPlaceholder") || "Select channel..." },
              ...channelsArray.filter(c => c.isActive).map(c => ({
                value: c.id,
                label: `${getChannelIcon(c.type)} ${c.name} (${getChannelLabel(c.type)})`
              }))
            ]}
          />
          <Select
            label={t("priority") || "Priority"}
            value={newRule.priority}
            onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
            options={[
              { value: "LOW", label: `🟢 ${t("priorityLow") || "Low"}` },
              { value: "MEDIUM", label: `🟡 ${t("priorityMedium") || "Medium"}` },
              { value: "HIGH", label: `🟠 ${t("priorityHigh") || "High"}` },
              { value: "CRITICAL", label: `🔴 ${t("priorityCritical") || "Critical"}` }
            ]}
          />
          <div>
            <label className="label">{t("messageTemplate") || "Message Template"}</label>
            <textarea
              className="input"
              value={newRule.template}
              onChange={(e) => setNewRule({ ...newRule, template: e.target.value })}
              placeholder={t("messageTemplatePlaceholder")}
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              {t("messageTemplateVariablesHint") || "Available variables: {{ orderId }}, {{ customerName }}, {{ amount }}, {{ status }}"}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button onClick={handleAddRule} disabled={loading || !newRule.channelId} fullWidth>
              {loading ? t("creatingRule") || "Creating..." : t("createRule") || "Create Rule"}
            </Button>
            <Button onClick={() => setShowAddRuleModal(false)} variant="ghost" fullWidth>
              {t("cancel") || "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
