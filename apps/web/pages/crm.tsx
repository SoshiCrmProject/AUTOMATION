import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { crmTour } from "../components/tourConfigs";
import { 
  Card, CardHeader, StatCard, Button, Badge, Input, Select,
  Table, Modal, Tabs, Alert, LoadingSpinner, EmptyState 
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

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
  phone?: string;
  address?: string;
  createdAt: string;
};

type Interaction = {
  id: string;
  customerId: string;
  type: 'PURCHASE' | 'SUPPORT' | 'COMPLAINT' | 'REFUND' | 'INQUIRY';
  description: string;
  resolved: boolean;
  createdAt: string;
};

type LoyaltyHistory = {
  id: string;
  customerId: string;
  previousTier: string;
  newTier: string;
  reason: string;
  createdAt: string;
};

type CustomerStats = {
  totalCustomers: number;
  avgLifetimeValue: number;
  loyaltyDistribution: Record<string, number>;
  blacklistedCount: number;
  newCustomersThisMonth: number;
  churnRate: number;
};

export default function CRM() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [showTour, setShowTour] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  
  // Form states
  const [interactionType, setInteractionType] = useState<string>("INQUIRY");
  const [interactionDesc, setInteractionDesc] = useState<string>("");
  const [newTier, setNewTier] = useState<string>("BRONZE");
  const [loyaltyReason, setLoyaltyReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const { data: customers, mutate: refreshCustomers } = useSWR<Customer[]>(
    shopId ? `/api/crm/${shopId}` : null,
    fetcher
  );
  
  const { data: stats, mutate: refreshStats } = useSWR<CustomerStats>(
    shopId ? `/api/crm/stats/${shopId}` : null,
    fetcher
  );
  
  const { data: interactions } = useSWR<Interaction[]>(
    selectedCustomer ? `/api/crm/${selectedCustomer.id}/interactions` : null,
    fetcher
  );
  
  const { data: loyaltyHistory } = useSWR<LoyaltyHistory[]>(
    selectedCustomer ? `/api/crm/${selectedCustomer.id}/loyalty` : null,
    fetcher
  );

  const isLoading = !customers && shopId;
  const customersArray = Array.isArray(customers) ? customers : [];
  
  // Filter customers
  const filteredCustomers = customersArray.filter(customer => {
    const matchesTier = tierFilter === "all" || customer.loyaltyTier === tierFilter;
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  // Handler functions
  const handleAddInteraction = async () => {
    if (!selectedCustomer || !interactionDesc.trim()) {
      pushToast(t("crmInteractionFieldsRequired") || "Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/crm/${selectedCustomer.id}/interactions`, {
        type: interactionType,
        description: interactionDesc,
      });
      pushToast(t("crmInteractionAddSuccess") || "Interaction added successfully", "success");
      setShowAddInteractionModal(false);
      setInteractionDesc("");
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("crmInteractionAddError") || "Failed to add interaction", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveInteraction = async (interactionId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/crm/interactions/${interactionId}/resolve`);
      pushToast(t("crmInteractionResolveSuccess") || "Interaction resolved", "success");
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("crmInteractionResolveError") || "Failed to resolve interaction", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLoyalty = async () => {
    if (!selectedCustomer || !loyaltyReason.trim()) {
      pushToast(t("crmLoyaltyReasonRequired") || "Please provide a reason", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/crm/${selectedCustomer.id}/loyalty`, {
        newTier,
        reason: loyaltyReason,
      });
      pushToast(t("crmLoyaltyUpdateSuccess") || "Loyalty tier updated", "success");
      setShowLoyaltyModal(false);
      setLoyaltyReason("");
      refreshCustomers();
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("crmLoyaltyUpdateError") || "Failed to update loyalty", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklist = async (customerId: string, blacklist: boolean) => {
    setLoading(true);
    try {
      const endpoint = blacklist ? `/api/crm/${customerId}/blacklist` : `/api/crm/${customerId}/unblacklist`;
      await api.post(endpoint);
      pushToast(
        blacklist
          ? t("crmCustomerBlacklisted") || "Customer blacklisted successfully"
          : t("crmCustomerUnblacklisted") || "Customer removed from blacklist",
        "success"
      );
      refreshCustomers();
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("crmCustomerStatusError") || "Failed to update customer status", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "PURCHASE": return "🛒";
      case "SUPPORT": return "🎧";
      case "COMPLAINT": return "⚠️";
      case "REFUND": return "💸";
      case "INQUIRY": return "❓";
      default: return "📝";
    }
  };

  const getLoyaltyLabel = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return t("loyaltyPlatinum") || "Platinum";
      case "GOLD": return t("loyaltyGold") || "Gold";
      case "SILVER": return t("loyaltySilver") || "Silver";
      case "BRONZE": return t("loyaltyBronze") || "Bronze";
      default: return tier;
    }
  };

  const getInteractionLabel = (type: Interaction["type"]) => {
    switch (type) {
      case "PURCHASE": return t("interactionPurchase") || "Purchase";
      case "SUPPORT": return t("interactionSupport") || "Support";
      case "COMPLAINT": return t("interactionComplaint") || "Complaint";
      case "REFUND": return t("interactionRefund") || "Refund";
      case "INQUIRY": return t("interactionInquiry") || "Inquiry";
      default: return type;
    }
  };

  const totalCustomers = stats?.totalCustomers ?? 0;
  const averageLtv = stats?.avgLifetimeValue ?? 0;
  const platinumMembers = stats?.loyaltyDistribution?.PLATINUM ?? 0;
  const churnRate = stats?.churnRate ?? 0;
  const newCustomers = stats?.newCustomersThisMonth ?? 0;
  const blacklisted = stats?.blacklistedCount ?? 0;

  const handleReplayTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("tour_completed_crm");
      setShowTour(true);
      window.location.reload();
    }
  };

  const handleRefresh = () => {
    if (!shopId) {
      pushToast(t("enterShopIdFirst") || "Enter a Shop ID to load data", "error");
      return;
    }
    refreshCustomers();
    refreshStats();
    pushToast(t("crmRefreshing") || "Refreshing CRM data", "success");
  };

  const heroBadge = (
    <Badge variant={shopId ? "success" : "warning"}>
      {shopId
        ? t("crmCustomersCountBadge", { count: filteredCustomers.length }) || `${filteredCustomers.length} customers`
        : t("awaitingShopId") || "Awaiting shop ID"}
    </Badge>
  );

  const heroAside = (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
      }}
    >
      {[{
        label: t("totalCustomers") || "Total customers",
        value: shopId ? totalCustomers.toLocaleString() : "--",
        helper: shopId ? (t("crmTotalCustomersHelper") || "Active contacts") : (t("crmConnectShopPrompt") || "Connect a shop to load data")
      }, {
        label: t("avgLifetimeValue") || "Avg lifetime value",
        value: shopId ? `$${averageLtv.toFixed(2)}` : "--",
        helper: shopId ? (t("crmAverageLtvHelper") || "Per customer") : (t("crmConnectShopPrompt") || "Connect a shop to load data")
      }, {
        label: t("newThisMonth") || "New this month",
        value: shopId ? newCustomers : "--",
        helper: shopId ? (t("crmNewThisMonthHelper") || "Fresh leads") : (t("crmConnectShopPrompt") || "Connect a shop to load data")
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
      {t("crmHeroFooter") || "Sync customer health daily to keep loyalty automation accurate."}
    </span>
  );

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div className="full-width-mobile" style={{ flex: "1 1 220px", minWidth: 200 }}>
        <Input
          placeholder={t("shopIdPlaceholder") || "Shop ID"}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          aria-label={t("shopId") || "Shop ID"}
        />
      </div>
      <div className="full-width-mobile" style={{ flex: "1 1 220px", minWidth: 200 }}>
        <Input
          placeholder={t("searchCustomers") || "Search customers"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={t("searchCustomers") || "Search customers"}
          disabled={!shopId}
        />
      </div>
      <div className="full-width-mobile" style={{ flex: "0 1 180px", minWidth: 180 }}>
        <Select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          options={[
            { value: "all", label: t("allTiers") || "All tiers" },
            { value: "PLATINUM", label: `💎 ${getLoyaltyLabel("PLATINUM")}` },
            { value: "GOLD", label: `🥇 ${getLoyaltyLabel("GOLD")}` },
            { value: "SILVER", label: `🥈 ${getLoyaltyLabel("SILVER")}` },
            { value: "BRONZE", label: `🥉 ${getLoyaltyLabel("BRONZE")}` }
          ]}
          disabled={!shopId}
        />
      </div>
      <Button type="button" variant="ghost" className="full-width-mobile" onClick={handleRefresh}>
        🔄 {t("refreshData") || "Refresh"}
      </Button>
    </div>
  );

  const actions = (
    <div className="stack-md wrap">
      <Button type="button" className="full-width-mobile" onClick={() => window.open("/api/crm/export", "_blank")}>
        ⬇️ {t("exportCsv") || "Export CSV"}
      </Button>
      <Button type="button" variant="ghost" className="full-width-mobile" onClick={handleReplayTour}>
        🧭 {t("replayTour") || "Replay tour"}
      </Button>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader title={t("crmQuickActions") || "Quick actions"} subtitle={t("crmShortcutsSubtitle") || "Jump into common workflows"} icon="⚡" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/notifications")}>
            🔔 {t("notifySegment") || "Notify segment"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/analytics")}>
            📈 {t("viewAnalytics") || "View analytics"}
          </Button>
          <Button type="button" onClick={() => window.open("mailto:support@automation?subject=CRM%20Insights", "_blank")}>
            📤 {t("shareInsights") || "Share insights"}
          </Button>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={t("crmPlaybooks") || "Playbooks"} subtitle={t("crmPlaybooksSubtitle") || "Recommended next steps"} icon="📘" />
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text)", display: "flex", flexDirection: "column", gap: 8 }}>
          <li>{t("crmPlaybookRetention") || "Launch win-back campaign for dormant customers."}</li>
          <li>{t("crmPlaybookLoyalty") || "Upgrade loyal buyers to the next tier automatically."}</li>
          <li>{t("crmPlaybookBlacklist") || "Audit blacklisted accounts every Friday."}</li>
        </ul>
      </Card>
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/crm"
        title={`👥 ${t("crmTitle") || "Customer Relationship Management"}`}
        description={t("crmHeroDescription") || t("crmDesc") || "Build relationships, track loyalty, and maximize customer lifetime value."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {!shopId && (
            <Alert variant="info" title={t("connectShop") || "Connect a shop"}>
              {t("crmConnectShopDescription") || "Enter your Shop ID above to load CRM data."}
            </Alert>
          )}

          {isLoading && <LoadingSpinner text={t("loadingCustomers") || "Loading customers"} />}

          {shopId && !isLoading && (
            <>
              {stats && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gap: 16,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
                    }}
                  >
                    <StatCard icon="👥" label={t("totalCustomers") || "Total customers"} value={stats.totalCustomers.toLocaleString()} color="primary" />
                    <StatCard icon="💰" label={t("avgLifetimeValue") || "Avg lifetime value"} value={`$${stats.avgLifetimeValue.toFixed(2)}`} color="success" />
                    <StatCard icon="💎" label={t("platinumMembers") || "Platinum members"} value={platinumMembers.toString()} color="info" />
                    <StatCard icon="🚫" label={t("blacklisted") || "Blacklisted"} value={blacklisted.toString()} color="error" />
                  </div>

                  <Card>
                    <CardHeader
                      title={`🏆 ${t("crmLoyaltyDistribution") || "Loyalty tier distribution"}`}
                      subtitle={t("crmLoyaltySubtitle") || "Snapshot across all tiers"}
                    />
                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                      }}
                    >
                      {Object.entries(stats.loyaltyDistribution).map(([tier, count]) => (
                        <div
                          key={tier}
                          style={{
                            padding: 20,
                            background: "var(--color-elevated)",
                            borderRadius: "var(--radius-lg)",
                            textAlign: "center",
                            border: "1px solid var(--color-border)"
                          }}
                        >
                          <div style={{ fontSize: 32, marginBottom: 8 }}>{getTierEmoji(tier)}</div>
                          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600 }}>
                            {getLoyaltyLabel(tier)}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: getTierColor(tier) }}>
                            {count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title={t("crmHealthPulse") || "Engagement pulse"} subtitle={t("crmHealthPulseSubtitle") || "Monitor churn, acquisition, and loyalty"} icon="🩺" />
                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                      }}
                    >
                      {[{
                        label: t("newThisMonth") || "New this month",
                        value: newCustomers,
                        helper: t("crmNewThisMonthHelper") || "Fresh leads added"
                      }, {
                        label: t("churnRate") || "Churn rate",
                        value: `${(churnRate * 100).toFixed(1)}%`,
                        helper: t("crmChurnHelper") || "Keep below 5%"
                      }, {
                        label: t("platinumMembers") || "Platinum members",
                        value: platinumMembers,
                        helper: t("crmLoyaltyHelper") || "Top loyalty tier"
                      }].map((stat) => (
                        <div
                          key={stat.label}
                          style={{
                            padding: 16,
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-lg)",
                            background: "var(--color-surface)"
                          }}
                        >
                          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4 }}>{stat.label}</p>
                          <div style={{ fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
                          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-light)" }}>{stat.helper}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {filteredCustomers.length > 0 ? (
                <Card>
                  <CardHeader
                    title={`📋 ${t("crmCustomerListTitle") || "Customer list"}`}
                    subtitle={t("crmCustomerListSubtitle", { count: filteredCustomers.length }) || `${filteredCustomers.length} customers`}
                  />
                  <Table
                    columns={[
                      { key: "customer", header: t("customer") || "Customer" },
                      { key: "tier", header: t("tier") || "Tier", width: "140px" },
                      { key: "orders", header: t("orders") || "Orders", width: "100px" },
                      { key: "ltv", header: t("lifetimeValue") || "Lifetime value", width: "140px" },
                      { key: "lastPurchase", header: t("lastPurchase") || "Last purchase", width: "130px" },
                      { key: "status", header: t("status") || "Status", width: "120px" },
                      { key: "actions", header: t("actions") || "Actions", width: "140px" }
                    ]}
                    data={filteredCustomers.map((customer) => ({
                      _customer: customer,
                      customer: (
                        <div>
                          <div style={{ fontWeight: 600 }}>{customer.name}</div>
                          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{customer.email}</div>
                        </div>
                      ),
                      tier: (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{getTierEmoji(customer.loyaltyTier)}</span>
                          <span style={{ fontWeight: 600, color: getTierColor(customer.loyaltyTier) }}>{getLoyaltyLabel(customer.loyaltyTier)}</span>
                        </div>
                      ),
                      orders: <Badge variant="info">{customer.totalOrders}</Badge>,
                      ltv: (
                        <span style={{ color: "var(--color-success)", fontWeight: 600 }}>
                          ${customer.lifetimeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ),
                      lastPurchase: (
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {new Date(customer.lastPurchase).toLocaleDateString()}
                        </span>
                      ),
                      status: customer.isBlacklisted ? <Badge variant="error">{t("blacklisted") || "Blacklisted"}</Badge> : <Badge variant="success">{t("active") || "Active"}</Badge>,
                      actions: (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowDetailModal(true);
                          }}
                        >
                          {t("viewDetails") || "View details"}
                        </Button>
                      )
                    }))}
                    onRowClick={(row: any) => {
                      setSelectedCustomer(row._customer);
                      setShowDetailModal(true);
                    }}
                  />
                </Card>
              ) : (
                <EmptyState
                  icon="👥"
                  title={t("noCustomersFound")}
                  description={t("descriptionAdjustFilters")}
                  action={
                    <Button type="button" variant="ghost" onClick={() => { setSearchTerm(""); setTierFilter("all"); }}>
                      {t("resetFilters") || "Reset filters"}
                    </Button>
                  }
                />
              )}
            </>
          )}
        </div>
      </PageLayout>

      {selectedCustomer && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }}
          title={`${t("customer") || "Customer"}: ${selectedCustomer.name}`}
          size="lg"
        >
          <Tabs
            defaultTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "info", label: t("info") || "Info", icon: "👤", content: <></> },
              { id: "interactions", label: t("interactions") || "Interactions", icon: "💬", badge: interactions?.length, content: <></> },
              { id: "loyalty", label: t("loyalty") || "Loyalty", icon: "🏆", content: <></> }
            ]}
          />

          {activeTab === "info" && (
            <div style={{ marginTop: 24 }}>
              <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">{t("email") || "Email"}</label>
                  <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.email}</div>
                </div>
                <div>
                  <label className="label">{t("phone") || "Phone"}</label>
                  <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.phone || (t("notAvailableShort") || "N/A")}</div>
                </div>
                <div>
                  <label className="label">{t("totalOrders") || "Total Orders"}</label>
                  <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.totalOrders}</div>
                </div>
                <div>
                  <label className="label">{t("lifetimeValue") || "Lifetime Value"}</label>
                  <div style={{ fontSize: 15, color: "var(--color-success)", fontWeight: 600 }}>
                    ${selectedCustomer.lifetimeValue.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="label">{t("loyaltyTier") || "Loyalty Tier"}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{getTierEmoji(selectedCustomer.loyaltyTier)}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: getTierColor(selectedCustomer.loyaltyTier) }}>
                      {getLoyaltyLabel(selectedCustomer.loyaltyTier)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label">{t("memberSince") || "Member Since"}</label>
                  <div style={{ fontSize: 15, color: "var(--color-text)" }}>
                    {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Button onClick={() => setShowLoyaltyModal(true)} variant="primary" fullWidth>
                  {t("updateLoyaltyTier") || "Update Loyalty Tier"}
                </Button>
                <Button
                  onClick={() => handleBlacklist(selectedCustomer.id, !selectedCustomer.isBlacklisted)}
                  variant={selectedCustomer.isBlacklisted ? "success" : "danger"}
                  fullWidth
                >
                  {selectedCustomer.isBlacklisted
                    ? t("crmUnblacklist") || "Unblacklist"
                    : t("crmBlacklist") || "Blacklist"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "interactions" && (
            <div style={{ marginTop: 24 }}>
              <Button
                onClick={() => setShowAddInteractionModal(true)}
                variant="primary"
                fullWidth
                style={{ marginBottom: 16 }}
              >
                + {t("addInteraction")}
              </Button>
              {interactions && interactions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      style={{
                        padding: 16,
                        background: "var(--color-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{getInteractionIcon(interaction.type)}</span>
                          <Badge variant={interaction.resolved ? "success" : "warning"}>{getInteractionLabel(interaction.type)}</Badge>
                        </div>
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {new Date(interaction.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: "8px 0", fontSize: 14 }}>{interaction.description}</p>
                      {!interaction.resolved && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleResolveInteraction(interaction.id)}
                          disabled={loading}
                        >
                          {t("crmMarkResolved") || "Mark resolved"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="💬" title={t("noInteractions")} description={t("addFirstInteraction")} />
              )}
            </div>
          )}

          {activeTab === "loyalty" && (
            <div style={{ marginTop: 24 }}>
              {loyaltyHistory && loyaltyHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {loyaltyHistory.map((history) => (
                    <div
                      key={history.id}
                      style={{
                        padding: 16,
                        background: "var(--color-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{getTierEmoji(history.previousTier)}</span>
                          <span style={{ color: getTierColor(history.previousTier), fontWeight: 600 }}>
                            {getLoyaltyLabel(history.previousTier)}
                          </span>
                          <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>→</span>
                          <span style={{ fontSize: 16 }}>{getTierEmoji(history.newTier)}</span>
                          <span style={{ color: getTierColor(history.newTier), fontWeight: 600 }}>
                            {getLoyaltyLabel(history.newTier)}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {new Date(history.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>{history.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="🏆" title={t("noLoyaltyHistory")} description={t("loyaltyChangesAppear")} />
              )}
            </div>
          )}
        </Modal>
      )}

      <Modal
        isOpen={showAddInteractionModal}
        onClose={() => {
          setShowAddInteractionModal(false);
          setInteractionDesc("");
        }}
        title={t("addCustomerInteraction")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label={t("interactionType") || "Interaction Type"}
            value={interactionType}
            onChange={(e) => setInteractionType(e.target.value)}
            options={[
              { value: "PURCHASE", label: `🛒 ${getInteractionLabel("PURCHASE")}` },
              { value: "SUPPORT", label: `🎧 ${getInteractionLabel("SUPPORT")}` },
              { value: "COMPLAINT", label: `⚠️ ${getInteractionLabel("COMPLAINT")}` },
              { value: "REFUND", label: `💸 ${getInteractionLabel("REFUND")}` },
              { value: "INQUIRY", label: `❓ ${getInteractionLabel("INQUIRY")}` }
            ]}
          />
          <div>
            <label className="label">{t("description") || "Description"}</label>
            <textarea
              className="input"
              value={interactionDesc}
              onChange={(e) => setInteractionDesc(e.target.value)}
              placeholder={t("describeInteraction")}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={handleAddInteraction} variant="primary" fullWidth disabled={loading}>
              {t("addInteraction")}
            </Button>
            <Button onClick={() => setShowAddInteractionModal(false)} variant="ghost" fullWidth>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showLoyaltyModal}
        onClose={() => {
          setShowLoyaltyModal(false);
          setLoyaltyReason("");
        }}
        title={t("updateLoyaltyTier")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label={t("crmNewTierLabel") || "New tier"}
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            options={[
              { value: "BRONZE", label: `🥉 ${getLoyaltyLabel("BRONZE")}` },
              { value: "SILVER", label: `🥈 ${getLoyaltyLabel("SILVER")}` },
              { value: "GOLD", label: `🥇 ${getLoyaltyLabel("GOLD")}` },
              { value: "PLATINUM", label: `💎 ${getLoyaltyLabel("PLATINUM")}` }
            ]}
          />
          <div>
            <label className="label">{t("tierChangeReason") || t("reason") || "Reason"}</label>
            <textarea
              className="input"
              value={loyaltyReason}
              onChange={(e) => setLoyaltyReason(e.target.value)}
              placeholder={t("whyTierChanged")}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={handleUpdateLoyalty} variant="primary" fullWidth disabled={loading}>
              {t("updateLoyaltyTier") || "Update tier"}
            </Button>
            <Button onClick={() => setShowLoyaltyModal(false)} variant="ghost" fullWidth>
              {t("cancel") || "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast />

      <OnboardingTour
        pageName="crm"
        steps={crmTour}
        onComplete={() => setShowTour(false)}
      />
      {!showTour && <HelpButton onClick={handleReplayTour} />}
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
