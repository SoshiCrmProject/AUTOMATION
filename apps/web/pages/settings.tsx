import { useState, useEffect } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import useSWR from "swr";
import AppNav from "../components/AppNav";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { settingsTour } from "../components/tourConfigs";
import { 
  Card, CardHeader, Button, Input, Alert, LoadingSpinner, Badge 
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";
import api from "../lib/apiClient";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type Settings = {
  includeAmazonPoints: boolean;
  includeDomesticShipping: boolean;
  domesticShippingCost: number;
  maxShippingDays: number;
  minExpectedProfit: number;
  shopIds: string[];
  isActive: boolean;
  isDryRun: boolean;
  reviewBandPercent: number;
};

export default function SettingsPage() {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<string>("general");
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [includeAmazonPoints, setIncludeAmazonPoints] = useState(false);
  const [includeDomesticShipping, setIncludeDomesticShipping] = useState(false);
  const [domesticShippingCost, setDomesticShippingCost] = useState(0);
  const [maxShippingDays, setMaxShippingDays] = useState(7);
  const [minExpectedProfit, setMinExpectedProfit] = useState(0);
  const [reviewBandPercent, setReviewBandPercent] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  
  // Shopee/Amazon credentials
  const [shopeePartnerId, setShopeePartnerId] = useState("");
  const [shopeePartnerKey, setShopeePartnerKey] = useState("");
  const [shopeeShopId, setShopeeShopId] = useState("");
  const [amazonEmail, setAmazonEmail] = useState("");
  const [amazonPassword, setAmazonPassword] = useState("");
  const [amazonShippingLabel, setAmazonShippingLabel] = useState("Shopee Warehouse");
  
  // Alert webhook
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  
  const { data: settings, mutate: refreshSettings } = useSWR<Settings>("/settings", fetcher);

  useEffect(() => {
    if (settings) {
      setIncludeAmazonPoints(settings.includeAmazonPoints);
      setIncludeDomesticShipping(settings.includeDomesticShipping);
      setDomesticShippingCost(settings.domesticShippingCost);
      setMaxShippingDays(settings.maxShippingDays);
      setMinExpectedProfit(settings.minExpectedProfit);
      setReviewBandPercent(settings.reviewBandPercent);
      setIsActive(settings.isActive);
      setIsDryRun(settings.isDryRun);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.post("/settings", {
        includeAmazonPoints,
        includeDomesticShipping,
        domesticShippingCost,
        maxShippingDays,
        minExpectedProfit,
        reviewBandPercent,
        isActive,
        isDryRun,
      });
      pushToast("Settings saved successfully", "success");
      refreshSettings();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to save settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!alertWebhookUrl.trim()) {
      pushToast("Please enter a webhook URL", "error");
      return;
    }
    
    setLoading(true);
    try {
      await api.post(alertWebhookUrl, {
        text: "🧪 Test notification from Shopee→Amazon Automation"
      });
      pushToast("Webhook test sent successfully", "success");
    } catch (error: any) {
      pushToast("Webhook test failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/settings" />
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "48px 32px",
          borderRadius: "var(--radius-xl)",
          marginBottom: 32,
          boxShadow: "var(--shadow-lg)"
        }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0, color: "#fff" }}>
              ⚙️ Settings & Configuration
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", marginTop: 8, fontSize: 16 }}>
              Configure automation rules, platform credentials, and system preferences
            </p>
          </div>
        </div>

        {/* Status Cards */}
        {settings && (
          <div className="grid grid-3" style={{ marginBottom: 24 }}>
            <div style={{ textAlign: "center", padding: 24 }}>
              <Card>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {isActive ? "✅" : "⏸️"}
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 4 }}>
                Automation Status
              </div>
              <Badge variant={isActive ? "success" : "warning"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </Card>
            </div>
            <div style={{ textAlign: "center", padding: 24 }}>
              <Card>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {isDryRun ? "🧪" : "🚀"}
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 4 }}>
                Execution Mode
              </div>
              <Badge variant={isDryRun ? "info" : "success"}>
                {isDryRun ? "Dry Run" : "Live"}
              </Badge>
            </Card>
            </div>
            <div style={{ textAlign: "center", padding: 24 }}>
              <Card>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 4 }}>
                Min Expected Profit
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-success)" }}>
                ${minExpectedProfit.toFixed(2)}
              </div>
            </Card>
            </div>
          </div>
        )}

        {/* Instructions Alert */}
        <div style={{ marginBottom: 24 }}>
          <Alert variant="info">
            <strong>Setup Instructions</strong>
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Configure Shopee API credentials (Partner ID, Partner Key, Shop ID)</li>
              <li>Set up Amazon seller credentials (email & password for automation)</li>
              <li>Define automation rules (shipping days, profit margins, pricing)</li>
              <li>Test webhook notifications (Slack/Discord integration)</li>
              <li>Enable automation when ready (toggle Active status)</li>
            </ol>
          </Alert>
        </div>

        {/* Tabbed Settings Interface */}
        <Card>
          <div
            className="tabs-header"
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '2px solid var(--color-border)',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            {[
              { id: "general", label: "General", icon: "⚙️" },
              { id: "shopee", label: "Shopee", icon: "🛍️" },
              { id: "amazon", label: "Amazon", icon: "📦" },
              { id: "notifications", label: "Notifications", icon: "🔔" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: '-2px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* General Tab */}
          {activeTab === "general" && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Automation Rules</h3>
              
              <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">Max Shipping Days</label>
                  <Input
                    type="number"
                    value={maxShippingDays}
                    onChange={(e) => setMaxShippingDays(Number(e.target.value))}
                    hint="Maximum delivery time from Amazon"
                  />
                </div>
                <div>
                  <label className="label">Min Expected Profit ($)</label>
                  <Input
                    type="number"
                    value={minExpectedProfit}
                    onChange={(e) => setMinExpectedProfit(Number(e.target.value))}
                    hint="Minimum profit margin per order"
                  />
                </div>
                <div>
                  <label className="label">Domestic Shipping Cost ($)</label>
                  <Input
                    type="number"
                    value={domesticShippingCost}
                    onChange={(e) => setDomesticShippingCost(Number(e.target.value))}
                    hint="Cost for domestic shipping"
                  />
                </div>
                <div>
                  <label className="label">Review Band Percent (%)</label>
                  <Input
                    type="number"
                    value={reviewBandPercent}
                    onChange={(e) => setReviewBandPercent(Number(e.target.value))}
                    hint="Percentage band for manual review"
                  />
                </div>
              </div>

              <h3 style={{ marginBottom: 16 }}>Options</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeAmazonPoints}
                    onChange={(e) => setIncludeAmazonPoints(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Include Amazon Points in calculations</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeDomesticShipping}
                    onChange={(e) => setIncludeDomesticShipping(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Include Domestic Shipping costs</span>
                </label>
              </div>

              <h3 style={{ marginBottom: 16 }}>Execution Mode</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontWeight: 600 }}>Enable Automation</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Dry Run Mode (test without actual orders)</span>
                </label>
              </div>

              <Button onClick={handleSaveSettings} variant="primary" fullWidth disabled={loading}>
                💾 Save General Settings
              </Button>
            </div>
          )}

          {/* Shopee Tab */}
          {activeTab === "shopee" && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Shopee API Credentials</h3>
              <div style={{ marginBottom: 24 }}>
                <Alert variant="warning">
                  Get your Shopee Partner credentials from the Shopee Open Platform
                </Alert>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <Input
                  label="Partner ID"
                  value={shopeePartnerId}
                  onChange={(e) => setShopeePartnerId(e.target.value)}
                  placeholder="Enter Shopee Partner ID"
                />
                <Input
                  label="Partner Key"
                  type="password"
                  value={shopeePartnerKey}
                  onChange={(e) => setShopeePartnerKey(e.target.value)}
                  placeholder="Enter Shopee Partner Key"
                />
                <Input
                  label="Shop ID"
                  value={shopeeShopId}
                  onChange={(e) => setShopeeShopId(e.target.value)}
                  placeholder="Enter Shop ID"
                />
              </div>

              <Button variant="primary" fullWidth disabled={loading}>
                🔑 Save Shopee Credentials
              </Button>
            </div>
          )}

          {/* Amazon Tab */}
          {activeTab === "amazon" && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Amazon Seller Credentials</h3>
              <div style={{ marginBottom: 24 }}>
                <Alert variant="warning">
                  These credentials are used for automated browser login to Amazon Seller Central
                </Alert>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <Input
                  label="Amazon Email"
                  type="email"
                  value={amazonEmail}
                  onChange={(e) => setAmazonEmail(e.target.value)}
                  placeholder="your-email@example.com"
                />
                <Input
                  label="Amazon Password"
                  type="password"
                  value={amazonPassword}
                  onChange={(e) => setAmazonPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Input
                  label="Shipping Label"
                  value={amazonShippingLabel}
                  onChange={(e) => setAmazonShippingLabel(e.target.value)}
                  placeholder="Shopee Warehouse"
                  hint="Default shipping label for orders"
                />
              </div>

              <Button variant="primary" fullWidth disabled={loading}>
                🔑 Save Amazon Credentials
              </Button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Alert Webhook</h3>
              <div style={{ marginBottom: 24 }}>
                <Alert variant="info">
                  Configure Slack or Discord webhook URL to receive real-time alerts
                </Alert>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <Input
                  label="Webhook URL"
                  value={alertWebhookUrl}
                  onChange={(e) => setAlertWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  hint="Slack or Discord webhook URL"
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <Button onClick={handleTestWebhook} variant="ghost" fullWidth disabled={loading}>
                  🧪 Test Webhook
                </Button>
                <Button variant="primary" fullWidth disabled={loading}>
                  💾 Save Webhook
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Toast />

        <OnboardingTour 
          pageName="settings" 
          steps={settingsTour} 
          onComplete={() => setShowTour(false)} 
        />
        {!showTour && <HelpButton onClick={() => {
          localStorage.removeItem("tour_completed_settings");
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
