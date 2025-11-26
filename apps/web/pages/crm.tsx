import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
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
  
  const { data: stats } = useSWR<CustomerStats>(
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
      pushToast("Please fill in all required fields", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/api/crm/${selectedCustomer.id}/interactions`, {
        type: interactionType,
        description: interactionDesc,
      });
      pushToast("Interaction added successfully", "success");
      setShowAddInteractionModal(false);
      setInteractionDesc("");
      // Refresh interactions
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to add interaction", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveInteraction = async (interactionId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/crm/interactions/${interactionId}/resolve`);
      pushToast("Interaction resolved", "success");
      // Refresh interactions
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to resolve interaction", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLoyalty = async () => {
    if (!selectedCustomer || !loyaltyReason.trim()) {
      pushToast("Please provide a reason", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/api/crm/${selectedCustomer.id}/loyalty`, {
        newTier,
        reason: loyaltyReason,
      });
      pushToast("Loyalty tier updated", "success");
      setShowLoyaltyModal(false);
      setLoyaltyReason("");
      refreshCustomers();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to update loyalty", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklist = async (customerId: string, blacklist: boolean) => {
    setLoading(true);
    try {
      const endpoint = blacklist ? `/api/crm/${customerId}/blacklist` : `/api/crm/${customerId}/unblacklist`;
      await api.post(endpoint);
      pushToast(`Customer ${blacklist ? 'blacklisted' : 'unblacklisted'} successfully`, "success");
      refreshCustomers();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to update customer status", "error");
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

  return (
    <div className="shell">
      <AppNav activeHref="/crm" />
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '48px 32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 36, margin: 0, color: '#fff' }}>
                👥 Customer Relationship Management
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 16 }}>
                Build relationships, track loyalty, and maximize customer lifetime value
              </p>
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
              placeholder="Enter Shop ID to view customer data"
            />
          </Card>
        </div>

        {!shopId && (
          <Alert variant="info">
            <strong>Get Started</strong>
            <p style={{ marginTop: 4 }}>Enter your Shop ID above to view customer data</p>
          </Alert>
        )}

        {isLoading && <LoadingSpinner />}

        {shopId && stats && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <StatCard
                icon="👥"
                label="Total Customers"
                value={stats.totalCustomers.toLocaleString()}
                color="primary"
              />
              <StatCard
                icon="💰"
                label="Avg Lifetime Value"
                value={`$${stats.avgLifetimeValue.toFixed(2)}`}
                color="success"
              />
              <StatCard
                icon="💎"
                label="Platinum Members"
                value={(stats.loyaltyDistribution.PLATINUM || 0).toString()}
                color="info"
              />
              <StatCard
                icon="🚫"
                label="Blacklisted"
                value={stats.blacklistedCount.toString()}
                color="error"
              />
            </div>

            {/* Loyalty Distribution */}
            <div style={{ marginBottom: 24 }}>
              <Card>
                <CardHeader title="🏆 Loyalty Tier Distribution" />
              <div className="grid grid-4" style={{ gap: 16 }}>
                {Object.entries(stats.loyaltyDistribution).map(([tier, count]) => (
                  <div
                    key={tier}
                    style={{
                      padding: 20,
                      background: "var(--color-elevated)",
                      borderRadius: "var(--radius-lg)",
                      textAlign: "center",
                      border: "2px solid var(--color-border)"
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{getTierEmoji(tier)}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600 }}>
                      {tier}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: getTierColor(tier) }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 24 }}>
              <Card>
                <div className="grid grid-2" style={{ gap: 16 }}>
                <Input
                  label="Search Customers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                />
                <Select
                  label="Filter by Tier"
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Tiers" },
                    { value: "PLATINUM", label: "💎 Platinum" },
                    { value: "GOLD", label: "🥇 Gold" },
                    { value: "SILVER", label: "🥈 Silver" },
                    { value: "BRONZE", label: "🥉 Bronze" }
                  ]}
                 />
               </div>
             </Card>
             </div>            {/* Customers Table */}
            {filteredCustomers.length > 0 ? (
              <Card>
                <CardHeader title="📋 Customer List" subtitle={`${filteredCustomers.length} customers`} />
                <Table
                  columns={[
                    { key: "customer", header: "Customer" },
                    { key: "tier", header: "Tier", width: "140px" },
                    { key: "orders", header: "Orders", width: "100px" },
                    { key: "ltv", header: "Lifetime Value", width: "140px" },
                    { key: "lastPurchase", header: "Last Purchase", width: "130px" },
                    { key: "status", header: "Status", width: "120px" },
                    { key: "actions", header: "Actions", width: "140px" }
                  ]}
                  data={filteredCustomers.map(customer => ({
                    _customer: customer,
                    customer: (
                      <div>
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {customer.email}
                        </div>
                      </div>
                    ),
                    tier: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{getTierEmoji(customer.loyaltyTier)}</span>
                        <span style={{ fontWeight: 600, color: getTierColor(customer.loyaltyTier) }}>
                          {customer.loyaltyTier}
                        </span>
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
                    status: customer.isBlacklisted ? (
                      <Badge variant="error">Blacklisted</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    ),
                    actions: (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDetailModal(true);
                        }}
                      >
                        View Details
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
                title="No Customers Found"
                description="Try adjusting your filters or search term"
              />
            )}
          </>
        )}

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <Modal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedCustomer(null);
            }}
            title={`Customer: ${selectedCustomer.name}`}
            size="lg"
          >
            <Tabs
              defaultTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "info", label: "Info", icon: "👤", content: <></> },
                { id: "interactions", label: "Interactions", icon: "💬", badge: interactions?.length, content: <></> },
                { id: "loyalty", label: "Loyalty", icon: "🏆", content: <></> }
              ]}
            />

            {activeTab === "info" && (
              <div style={{ marginTop: 24 }}>
                <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
                  <div>
                    <label className="label">Email</label>
                    <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.email}</div>
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.phone || "N/A"}</div>
                  </div>
                  <div>
                    <label className="label">Total Orders</label>
                    <div style={{ fontSize: 15, color: "var(--color-text)" }}>{selectedCustomer.totalOrders}</div>
                  </div>
                  <div>
                    <label className="label">Lifetime Value</label>
                    <div style={{ fontSize: 15, color: "var(--color-success)", fontWeight: 600 }}>
                      ${selectedCustomer.lifetimeValue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="label">Loyalty Tier</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{getTierEmoji(selectedCustomer.loyaltyTier)}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: getTierColor(selectedCustomer.loyaltyTier) }}>
                        {selectedCustomer.loyaltyTier}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Member Since</label>
                    <div style={{ fontSize: 15, color: "var(--color-text)" }}>
                      {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button onClick={() => setShowLoyaltyModal(true)} variant="primary" fullWidth>
                    Update Loyalty Tier
                  </Button>
                  <Button
                    onClick={() => handleBlacklist(selectedCustomer.id, !selectedCustomer.isBlacklisted)}
                    variant={selectedCustomer.isBlacklisted ? "success" : "danger"}
                    fullWidth
                  >
                    {selectedCustomer.isBlacklisted ? "Unblacklist" : "Blacklist"}
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
                  + Add Interaction
                </Button>
                {interactions && interactions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {interactions.map(interaction => (
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
                            <Badge variant={interaction.resolved ? "success" : "warning"}>
                              {interaction.type}
                            </Badge>
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
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="💬" title="No Interactions" description="Add the first interaction" />
                )}
              </div>
            )}

            {activeTab === "loyalty" && (
              <div style={{ marginTop: 24 }}>
                {loyaltyHistory && loyaltyHistory.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {loyaltyHistory.map(history => (
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
                              {history.previousTier}
                            </span>
                            <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>→</span>
                            <span style={{ fontSize: 16 }}>{getTierEmoji(history.newTier)}</span>
                            <span style={{ color: getTierColor(history.newTier), fontWeight: 600 }}>
                              {history.newTier}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                            {new Date(history.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
                          {history.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🏆" title="No Loyalty History" description="Loyalty changes will appear here" />
                )}
              </div>
            )}
          </Modal>
        )}

        {/* Add Interaction Modal */}
        <Modal
          isOpen={showAddInteractionModal}
          onClose={() => {
            setShowAddInteractionModal(false);
            setInteractionDesc("");
          }}
          title="Add Customer Interaction"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Select
              label="Interaction Type"
              value={interactionType}
              onChange={(e) => setInteractionType(e.target.value)}
              options={[
                { value: "PURCHASE", label: "🛒 Purchase" },
                { value: "SUPPORT", label: "🎧 Support" },
                { value: "COMPLAINT", label: "⚠️ Complaint" },
                { value: "REFUND", label: "💸 Refund" },
                { value: "INQUIRY", label: "❓ Inquiry" }
              ]}
            />
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={interactionDesc}
                onChange={(e) => setInteractionDesc(e.target.value)}
                placeholder="Describe the interaction..."
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={handleAddInteraction} variant="primary" fullWidth disabled={loading}>
                Add Interaction
              </Button>
              <Button onClick={() => setShowAddInteractionModal(false)} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Update Loyalty Modal */}
        <Modal
          isOpen={showLoyaltyModal}
          onClose={() => {
            setShowLoyaltyModal(false);
            setLoyaltyReason("");
          }}
          title="Update Loyalty Tier"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Select
              label="New Tier"
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              options={[
                { value: "BRONZE", label: "🥉 Bronze" },
                { value: "SILVER", label: "🥈 Silver" },
                { value: "GOLD", label: "🥇 Gold" },
                { value: "PLATINUM", label: "💎 Platinum" }
              ]}
            />
            <div>
              <label className="label">Reason</label>
              <textarea
                className="input"
                value={loyaltyReason}
                onChange={(e) => setLoyaltyReason(e.target.value)}
                placeholder="Why is the tier being changed?"
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={handleUpdateLoyalty} variant="primary" fullWidth disabled={loading}>
                Update Tier
              </Button>
              <Button onClick={() => setShowLoyaltyModal(false)} variant="ghost" fullWidth>
                Cancel
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
        {!showTour && <HelpButton onClick={() => {
          localStorage.removeItem("tour_completed_crm");
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
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
