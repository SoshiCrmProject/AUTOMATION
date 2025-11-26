import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import { 
  Card, CardHeader, StatCard, Button, Badge, Input, Table, 
  Alert, LoadingSpinner, EmptyState, Modal, Select, Tabs
} from "../components/ui";
import Toast, { pushToast } from "../components/Toast";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

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
  conditions: any;
  template: string;
  priority: string;
  createdAt: string;
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
      pushToast("Test notification sent successfully", "success");
      refreshHistory();
    } catch (err) {
      pushToast("Failed to send test notification", "error");
    }
  };

  const handleAddChannel = async () => {
    if (!shopId || !newChannel.name) {
      pushToast("Please fill in required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/notifications/channels', {
        shopId,
        ...newChannel
      });
      pushToast("Channel created successfully", "success");
      setShowAddChannelModal(false);
      setNewChannel({ name: "", type: "EMAIL", config: {} });
      refreshChannels();
    } catch (err: any) {
      pushToast(err.response?.data?.error || "Failed to create channel", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!shopId || !newRule.name || !newRule.channelId) {
      pushToast("Please fill in required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/notifications/rules', {
        shopId,
        ...newRule
      });
      pushToast("Rule created successfully", "success");
      setShowAddRuleModal(false);
      setNewRule({ name: "", event: "ORDER_PLACED", channelId: "", priority: "MEDIUM", template: "" });
      refreshRules();
    } catch (err: any) {
      pushToast(err.response?.data?.error || "Failed to create rule", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channelId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/notifications/channels/${channelId}`, { isActive });
      pushToast(`Channel ${isActive ? 'activated' : 'deactivated'}`, "success");
      refreshChannels();
    } catch (err) {
      pushToast("Failed to update channel", "error");
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await api.patch(`/api/notifications/rules/${ruleId}`, { isActive });
      pushToast(`Rule ${isActive ? 'activated' : 'deactivated'}`, "success");
      refreshRules();
    } catch (err) {
      pushToast("Failed to update rule", "error");
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    
    try {
      await api.delete(`/api/notifications/channels/${channelId}`);
      pushToast("Channel deleted", "success");
      refreshChannels();
    } catch (err) {
      pushToast("Failed to delete channel", "error");
    }
  };

  const channelsArray = Array.isArray(channels) ? channels : [];
  const rulesArray = Array.isArray(rules) ? rules : [];
  const historyArray = Array.isArray(history) ? history : [];

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

  return (
    <div className="shell">
      <AppNav activeHref="/notifications" />
      <Toast />
      
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          padding: '48px 32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: 36, margin: 0, color: '#fff' }}>
                🔔 Notification Center
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 16 }}>
                Multi-channel notifications, automation rules, and delivery tracking
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={() => setShowAddChannelModal(true)} disabled={!shopId} variant="ghost">
                ➕ Add Channel
              </Button>
              <Button onClick={() => setShowAddRuleModal(true)} disabled={!shopId} variant="ghost">
                ⚙️ Add Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Shop ID Input */}
        <div style={{ marginBottom: 24 }}>
          <Card>
            <Input
              label="Shop ID"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder="Enter Shop ID to manage notifications"
            />
          </Card>
        </div>

        {!shopId && (
          <Alert variant="info" title="Get Started">
            Enter your Shop ID above to configure notification channels and rules
          </Alert>
        )}        {shopId && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <StatCard
                icon="📡"
                label="Total Channels"
                value={stats.totalChannels.toString()}
                color="primary"
                trend={stats.activeChannels}
              />
              <StatCard
                icon="⚙️"
                label="Active Rules"
                value={stats.activeRules.toString()}
                color="info"
              />
              <StatCard
                icon="📤"
                label="Sent Today"
                value={stats.sentToday.toString()}
                color="success"
              />
              <StatCard
                icon="⚠️"
                label="Failed Today"
                value={stats.failedToday.toString()}
                color="error"
              />
            </div>

            {/* Tabs */}
            <Card>
              <Tabs
                tabs={[
                  {
                    id: 'channels',
                    label: 'Channels',
                    icon: '📡',
                    badge: channelsArray.length,
                    content: (
                      <div style={{ padding: '24px' }}>
                        {channelsArray.length > 0 ? (
                          <div className="grid grid-3" style={{ gap: '20px' }}>
                            {channelsArray.map((channel) => (
                              <div
                                key={channel.id}
                                style={{
                                  padding: '24px',
                                  background: 'var(--color-elevated)',
                                  borderRadius: 'var(--radius-lg)',
                                  border: `2px solid ${channel.isActive ? 'var(--color-success)' : 'var(--color-border)'}`,
                                  transition: 'all 0.2s',
                                  opacity: channel.isActive ? 1 : 0.7
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '32px' }}>{getChannelIcon(channel.type)}</span>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '16px' }}>{channel.name}</h4>
                                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                        {channel.type}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant={channel.isActive ? 'success' : 'error'}>
                                    {channel.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                                  Created: {new Date(channel.createdAt).toLocaleDateString()}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => testChannel(channel.id)}
                                    disabled={!channel.isActive}
                                    fullWidth
                                  >
                                    Test
                                  </Button>
                                  <Button
                                    variant={channel.isActive ? 'warning' : 'success'}
                                    size="sm"
                                    onClick={() => toggleChannel(channel.id, !channel.isActive)}
                                    fullWidth
                                  >
                                    {channel.isActive ? 'Disable' : 'Enable'}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => deleteChannel(channel.id)}
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
                            title="No Channels Configured"
                            description="Add your first notification channel to start sending alerts"
                            action={
                              <Button onClick={() => setShowAddChannelModal(true)}>
                                ➕ Add Channel
                              </Button>
                            }
                          />
                        )}
                      </div>
                    )
                  },
                  {
                    id: 'rules',
                    label: 'Rules',
                    icon: '⚙️',
                    badge: rulesArray.length,
                    content: (
                      <div style={{ padding: '24px' }}>
                        {rulesArray.length > 0 ? (
                          <Table
                            columns={[
                              { key: 'name', header: 'Rule Name' },
                              { key: 'event', header: 'Event', width: '150px' },
                              { 
                                key: 'channel', 
                                header: 'Channel',
                                width: '150px',
                                render: (row: any) => {
                                  const channel = channelsArray.find(c => c.id === row.channelId);
                                  return channel ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>{getChannelIcon(channel.type)}</span>
                                      <span style={{ fontSize: '13px' }}>{channel.name}</span>
                                    </div>
                                  ) : 'Unknown';
                                }
                              },
                              { 
                                key: 'priority', 
                                header: 'Priority',
                                width: '120px',
                                render: (row: any) => (
                                  <Badge variant={getPriorityColor(row.priority) as any}>
                                    {row.priority}
                                  </Badge>
                                )
                              },
                              { 
                                key: 'status', 
                                header: 'Status',
                                width: '100px',
                                render: (row: any) => (
                                  <Badge variant={row.isActive ? 'success' : 'error'}>
                                    {row.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                )
                              },
                              {
                                key: 'actions',
                                header: 'Actions',
                                width: '120px',
                                render: (row: any) => (
                                  <Button
                                    variant={row.isActive ? 'warning' : 'success'}
                                    size="sm"
                                    onClick={() => toggleRule(row.id, !row.isActive)}
                                  >
                                    {row.isActive ? 'Disable' : 'Enable'}
                                  </Button>
                                )
                              }
                            ]}
                            data={rulesArray}
                          />
                        ) : (
                          <EmptyState
                            icon="⚙️"
                            title="No Notification Rules"
                            description="Create automation rules to send notifications based on events"
                            action={
                              <Button onClick={() => setShowAddRuleModal(true)}>
                                ⚙️ Add Rule
                              </Button>
                            }
                          />
                        )}
                      </div>
                    )
                  },
                  {
                    id: 'history',
                    label: 'History',
                    icon: '📜',
                    badge: historyArray.length,
                    content: (
                      <div style={{ padding: '24px' }}>
                        {historyArray.length > 0 ? (
                          <Table
                            columns={[
                              { 
                                key: 'subject', 
                                header: 'Subject',
                                render: (row: any) => (
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{row.subject}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                      {row.message.substring(0, 80)}...
                                    </div>
                                  </div>
                                )
                              },
                              { 
                                key: 'priority', 
                                header: 'Priority',
                                width: '100px',
                                render: (row: any) => (
                                  <Badge variant={getPriorityColor(row.priority) as any}>
                                    {row.priority}
                                  </Badge>
                                )
                              },
                              { 
                                key: 'status', 
                                header: 'Status',
                                width: '100px',
                                render: (row: any) => (
                                  <Badge variant={getStatusColor(row.status) as any}>
                                    {row.status}
                                  </Badge>
                                )
                              },
                              { 
                                key: 'channel', 
                                header: 'Channel',
                                width: '120px',
                                render: (row: any) => {
                                  const channel = channelsArray.find(c => c.id === row.channelId);
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>{getChannelIcon(channel?.type || 'UNKNOWN')}</span>
                                      <span style={{ fontSize: '12px' }}>{channel?.type || 'Unknown'}</span>
                                    </div>
                                  );
                                }
                              },
                              { 
                                key: 'sentAt', 
                                header: 'Sent At',
                                width: '160px',
                                render: (row: any) => (
                                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                    {new Date(row.sentAt).toLocaleString()}
                                  </span>
                                )
                              },
                              {
                                key: 'error',
                                header: 'Error',
                                width: '80px',
                                render: (row: any) => row.errorMessage ? (
                                  <span 
                                    style={{ fontSize: '12px', color: 'var(--color-error)', cursor: 'pointer' }}
                                    title={row.errorMessage}
                                  >
                                    ⚠️ Error
                                  </span>
                                ) : null
                              }
                            ]}
                            data={historyArray}
                          />
                        ) : (
                          <EmptyState
                            icon="📜"
                            title="No Notification History"
                            description="Sent notifications will appear here"
                          />
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          </>
        )}
      </div>

      {/* Add Channel Modal */}
      <Modal
        isOpen={showAddChannelModal}
        onClose={() => {
          setShowAddChannelModal(false);
          setNewChannel({ name: "", type: "EMAIL", config: {} });
        }}
        title="Add Notification Channel"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Channel Name"
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            placeholder="e.g., Primary Email"
          />
          <Select
            label="Channel Type"
            value={newChannel.type}
            onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
            options={[
              { value: "EMAIL", label: "📧 Email" },
              { value: "SMS", label: "📱 SMS" },
              { value: "SLACK", label: "💬 Slack" },
              { value: "DISCORD", label: "🎮 Discord" },
              { value: "WEBHOOK", label: "🔗 Webhook" }
            ]}
          />
          <Alert variant="info">
            Channel configuration can be set after creation
          </Alert>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button onClick={handleAddChannel} disabled={loading} fullWidth>
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
            <Button onClick={() => setShowAddChannelModal(false)} variant="ghost" fullWidth>
              Cancel
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
        title="Create Notification Rule"
        size="lg"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Rule Name"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            placeholder="e.g., Order Confirmation"
          />
          <Select
            label="Trigger Event"
            value={newRule.event}
            onChange={(e) => setNewRule({ ...newRule, event: e.target.value })}
            options={[
              { value: "ORDER_PLACED", label: "Order Placed" },
              { value: "ORDER_PAID", label: "Order Paid" },
              { value: "ORDER_SHIPPED", label: "Order Shipped" },
              { value: "ORDER_FAILED", label: "Order Failed" },
              { value: "LOW_STOCK", label: "Low Stock Alert" },
              { value: "PRICE_CHANGE", label: "Price Changed" },
              { value: "ERROR_OCCURRED", label: "Error Occurred" }
            ]}
          />
          <Select
            label="Notification Channel"
            value={newRule.channelId}
            onChange={(e) => setNewRule({ ...newRule, channelId: e.target.value })}
            options={[
              { value: "", label: "Select channel..." },
              ...channelsArray.filter(c => c.isActive).map(c => ({
                value: c.id,
                label: `${getChannelIcon(c.type)} ${c.name} (${c.type})`
              }))
            ]}
          />
          <Select
            label="Priority"
            value={newRule.priority}
            onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
            options={[
              { value: "LOW", label: "🟢 Low" },
              { value: "MEDIUM", label: "🟡 Medium" },
              { value: "HIGH", label: "🟠 High" },
              { value: "CRITICAL", label: "🔴 Critical" }
            ]}
          />
          <div>
            <label className="label">Message Template</label>
            <textarea
              className="input"
              value={newRule.template}
              onChange={(e) => setNewRule({ ...newRule, template: e.target.value })}
              placeholder="Use {{variables}} for dynamic content"
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              Available variables: {'{'}{'{'} orderId {'}'}{'}'}, {'{'}{'{'} customerName {'}'}{'}'}, {'{'}{'{'} amount {'}'}{'}'}, {'{'}{'{'} status {'}'}{'}'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button onClick={handleAddRule} disabled={loading || !newRule.channelId} fullWidth>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
            <Button onClick={() => setShowAddRuleModal(false)} variant="ghost" fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
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
