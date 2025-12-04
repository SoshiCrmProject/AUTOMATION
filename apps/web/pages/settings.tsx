import { useState, useEffect, useMemo } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import useSWR from "swr";
import PageLayout from "../components/PageLayout";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { settingsTour } from "../components/tourConfigs";
import { Card, CardHeader, Button, Input, Alert, Badge, Select, Tabs } from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";
import CredentialSetupGuide from "../components/CredentialSetupGuide";
import api from "../lib/apiClient";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(value || 0);

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

type CredentialStatus = {
  status: string;
  lastValidatedAt: string | null;
  error: string | null;
};

type CredentialHealth = {
  shopId: string;
  shopName: string;
  shopee: CredentialStatus;
  amazon: CredentialStatus;
};

export default function SettingsPage() {
  const { t } = useTranslation("common");
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [includeAmazonPoints, setIncludeAmazonPoints] = useState(false);
  const [includeDomesticShipping, setIncludeDomesticShipping] = useState(false);
  const [domesticShippingCost, setDomesticShippingCost] = useState(0);
  const [maxShippingDays, setMaxShippingDays] = useState(7);
  const [minExpectedProfit, setMinExpectedProfit] = useState(0);
  const [reviewBandPercent, setReviewBandPercent] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [shopId, setShopId] = useState<string>("");
  const [autoFulfillmentMode, setAutoFulfillmentMode] = useState<string>("AUTO");
  
  // Shopee/Amazon credentials
  const [shopeePartnerId, setShopeePartnerId] = useState("");
  const [shopeePartnerKey, setShopeePartnerKey] = useState("");
  const [shopeeShopId, setShopeeShopId] = useState("");
  const [amazonEmail, setAmazonEmail] = useState("");
  const [amazonPassword, setAmazonPassword] = useState("");
  const [amazonShippingLabel, setAmazonShippingLabel] = useState("Shopee Warehouse");
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  
  // Alert webhook
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data: settings, error: settingsError, mutate: refreshSettings } = useSWR<Settings>(
    "/settings", 
    fetcher,
    { 
      shouldRetryOnError: false,
      revalidateOnFocus: false
    }
  );

  const { data: shops } = useSWR("/shops", fetcher, { shouldRetryOnError: false });
  const { data: shopeeCredentials } = useSWR("/credentials/shopee", fetcher, { shouldRetryOnError: false });
  const { data: amazonCredentials } = useSWR("/credentials/amazon", fetcher, { shouldRetryOnError: false });
  const { data: credentialHealth, error: credentialHealthError, mutate: refreshCredentialHealth } = useSWR<CredentialHealth[]>(
    "/ops/credential-health",
    fetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (settings) {
      setIncludeAmazonPoints(settings.includeAmazonPoints);
      setIncludeDomesticShipping(settings.includeDomesticShipping);
      setDomesticShippingCost(settings.domesticShippingCost || 0);
      setMaxShippingDays(settings.maxShippingDays);
      setMinExpectedProfit(settings.minExpectedProfit);
      setReviewBandPercent(settings.reviewBandPercent || 0);
      setIsActive(settings.isActive);
      setIsDryRun(settings.isDryRun);
      // Set shopId from first shop in settings
      if (settings.shopIds && settings.shopIds.length > 0) {
        setShopId(settings.shopIds[0]);
      }
    }
  }, [settings]);

  useEffect(() => {
    if (shops && shops.length > 0 && !shopId) {
      setShopId(shops[0].id?.toString() || "");
    }
  }, [shops, shopId]);

  useEffect(() => {
    if (shopeeCredentials && shopeeCredentials.length > 0) {
      const cred = shopeeCredentials[0];
      setShopeePartnerId(cred.partnerId || "");
      setShopeeShopId(cred.shopId || "");
    }
  }, [shopeeCredentials]);

  useEffect(() => {
    if (amazonCredentials && amazonCredentials.length > 0) {
      const cred = amazonCredentials[0];
      setAmazonEmail(cred.email || "");
      setAmazonShippingLabel("Shopee Warehouse");
    }
  }, [amazonCredentials]);

  const handleSaveSettings = async () => {
    if (!shopId) {
      pushToast("No shop selected. Please refresh the page.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/settings", {
        shopId,
        isActive,
        isDryRun,
        autoFulfillmentMode,
        minExpectedProfit,
        maxShippingDays,
        reviewBandPercent,
        includePoints: includeAmazonPoints,
        includeDomesticShipping,
        defaultShippingAddressLabel: amazonShippingLabel || "Shopee Warehouse",
        currency: "JPY"
      });
      pushToast("Settings saved successfully", "success");
      refreshSettings();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to save settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopeeCredentials = async () => {
    if (!shopId) {
      pushToast("No shop selected", "error");
      return;
    }
    if (!shopeePartnerId || !shopeePartnerKey || !shopeeShopId) {
      pushToast("Please fill in all Shopee credentials", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/credentials/shopee", {
        partnerId: shopeePartnerId,
        partnerKey: shopeePartnerKey,
        accessToken: "",
        baseUrl: "https://partner.shopeemobile.com",
        shopId: shopId,
        shopName: shopeeShopId,
        shopeeRegion: "TH"
      });
      pushToast("Shopee credentials saved successfully", "success");
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to save Shopee credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAmazonCredentials = async () => {
    if (!shopId) {
      pushToast("No shop selected", "error");
      return;
    }
    if (!amazonEmail || !amazonPassword) {
      pushToast("Please fill in email and password", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/credentials/amazon", {
        shopId,
        email: amazonEmail,
        password: amazonPassword
      });
      pushToast("Amazon credentials saved successfully", "success");
      setAmazonPassword(""); // Clear password after save
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to save Amazon credentials", "error");
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

  const handleRunHealthCheck = async () => {
    setHealthCheckLoading(true);
    try {
      await api.post("/ops/credential-health");
      pushToast(t("healthCheckQueued") || "Credential health check queued", "success");
      refreshCredentialHealth();
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("healthCheckFailed") || "Failed to queue health check", "error");
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const statusVariant = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "healthy":
        return "success" as const;
      case "failed":
        return "error" as const;
      case "pending":
      case "unknown":
        return "warning" as const;
      case "missing":
        return "default" as const;
      default:
        return "info" as const;
    }
  };

  const formatStatusLabel = (status: string) => {
    const normalized = (status || "unknown").toLowerCase();
    switch (normalized) {
      case "healthy":
        return t("statusHealthy") || "Healthy";
      case "failed":
        return t("statusFailed") || "Failed";
      case "pending":
        return t("statusPending") || "Pending";
      case "missing":
        return t("statusMissing") || "Missing";
      default:
        return t("statusUnknown") || "Unknown";
    }
  };

  const formatTimestamp = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : t("neverValidated") || "Never validated";

  const shopOptions = useMemo(
    () =>
      Array.isArray(shops)
        ? shops.map((shop: any) => ({
            value: shop?.id?.toString() || "",
            label: shop?.name || shop?.id?.toString() || t("unknownShop") || "Unnamed shop"
          }))
        : [],
    [shops, t]
  );

  const heroHighlights = useMemo(
    () => [
      {
        label: t("minExpectedProfit") || "Min expected profit",
        value: formatCurrency(minExpectedProfit),
        helper: t("perOrderGuardrail") || "Per-order guardrail",
        color: "var(--color-success)"
      },
      {
        label: t("maxShippingDays") || "Max shipping days",
        value: `${maxShippingDays || 0} ${t("days") || "days"}`,
        helper: t("deliveryPromise") || "Delivery promise",
        color: "var(--color-info)"
      },
      {
        label: t("reviewBandPercent") || "Review band",
        value: `${reviewBandPercent || 0}%`,
        helper: t("manualReviewBand") || "Manual review threshold",
        color: "var(--color-warning)"
      }
    ],
    [maxShippingDays, minExpectedProfit, reviewBandPercent, t]
  );

  const heroBadge = (
    <Badge variant={isActive ? "success" : "warning"} size="lg">
      {isActive
        ? isDryRun
          ? t("dryRunActive") || "Dry run active"
          : t("automationLive") || "Automation live"
        : t("automationPaused") || "Automation paused"}
    </Badge>
  );

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(15,23,42,0.6)" }}>
            {stat.label}
          </span>
          <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(15,23,42,0.7)" }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {shopId
        ? `${t("trackingShop") || "Tracking shop"} ${shopId}. ${t("settingsHeroFooter") || "Guardrails save per shop."}`
        : t("selectShopToLoad") || "Select a shop to load guardrails."}
    </span>
  );

  const replayTour = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tour_completed_settings");
      setShowTour(true);
      window.location.reload();
    }
  };

  const heroActions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" onClick={handleSaveSettings} disabled={loading}>
        💾 {t("saveGuardrails") || "Save guardrails"}
      </Button>
      <Button type="button" variant="ghost" onClick={replayTour}>
        🎥 {t("replayTour") || "Replay tour"}
      </Button>
    </div>
  );

  const hasShops = shopOptions.length > 0;
  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <div style={{ flex: "1 1 260px", minWidth: 220 }}>
        <Select
          label={t("shopId") || "Shop"}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          options={hasShops ? shopOptions : [{ value: "", label: t("noShopsAvailable") || "No shops detected" }]}
          disabled={!hasShops}
        />
      </div>
      <Button type="button" variant="ghost" onClick={() => refreshSettings()} disabled={loading}>
        ♻️ {t("refreshData") || "Refresh"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShopId(shops?.[0]?.id?.toString() || "")}
        disabled={!hasShops}
      >
        🔄 {t("resetSelection") || "Reset selection"}
      </Button>
    </div>
  );

  const automationSummary = (
    <Card hover={false}>
      <CardHeader
        title={t("automationSummary") || "Automation summary"}
        subtitle={t("liveGuardrailsSnapshot") || "Live guardrails snapshot"}
        icon="📊"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>{t("automationStatus") || "Status"}</span>
          <Badge variant={isActive ? "success" : "warning"}>{isActive ? t("active") || "Active" : t("inactive") || "Inactive"}</Badge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>{t("executionMode") || "Execution mode"}</span>
          <Badge variant={isDryRun ? "info" : "success"}>{isDryRun ? t("dryRun") || "Dry run" : t("live") || "Live"}</Badge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>{t("minExpectedProfit") || "Min expected profit"}</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(minExpectedProfit)}</span>
        </div>
      </div>
    </Card>
  );

  const checklistCard = (
    <Card hover={false}>
      <CardHeader
        title={t("setupChecklist") || "Setup checklist"}
        subtitle={t("followStepsToLaunch") || "Follow these steps before you go live"}
        icon="✅"
      />
      <ol style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 6 }}>
        <li>{t("configureShopeeCredentials") || "Configure Shopee API credentials"}</li>
        <li>{t("saveAmazonCredentials") || "Save Amazon login & shipping label"}</li>
        <li>{t("defineGuardrails") || "Define profit + shipping guardrails"}</li>
        <li>{t("testWebhooks") || "Test alert webhooks"}</li>
        <li>{t("enableAutomation") || "Enable automation when ready"}</li>
      </ol>
    </Card>
  );

  const helpCard = (
    <Card hover={false}>
      <CardHeader
        title={t("needHelp") || "Need help?"}
        subtitle={t("openGuidesOrReplayTour") || "Open guides or replay the onboarding tour"}
        icon="💡"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button type="button" variant="ghost" onClick={replayTour}>
          🎥 {t("replayTour") || "Replay tour"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open("/SHOPEE_CREDENTIALS_GUIDE.md", "_blank");
            }
          }}
        >
          📘 {t("openDocs") || "Open credential docs"}
        </Button>
      </div>
    </Card>
  );
  const credentialHealthCard = (
    <Card hover={false}>
      <CardHeader
        title={t("credentialHealthTitle") || "Credential health"}
        subtitle={t("credentialHealthSubtitle") || "Verify Shopee and Amazon integrations"}
        icon="🩺"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Button
          type="button"
          variant="ghost"
          onClick={handleRunHealthCheck}
          disabled={healthCheckLoading}
        >
          {healthCheckLoading ? "⏳ " : "🩻 "}
          {healthCheckLoading
            ? t("healthCheckRunning") || "Running checks..."
            : t("runHealthCheck") || "Run health check"}
        </Button>
        {credentialHealthError && (
          <Alert variant="error" title={t("healthCheckLoadFailed") || "Failed to load health status"}>
            {credentialHealthError.message}
          </Alert>
        )}
        {credentialHealth?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {credentialHealth.map((entry) => {
              const combinedStatus =
                entry.shopee.status === "healthy" && entry.amazon.status === "healthy"
                  ? "healthy"
                  : entry.shopee.status === "failed" || entry.amazon.status === "failed"
                  ? "failed"
                  : "pending";
              return (
                <div
                  key={entry.shopId}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: 12,
                    background: "var(--color-surface)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong>{entry.shopName || `Shop ${entry.shopId}`}</strong>
                    <Badge variant={statusVariant(combinedStatus)}>{formatStatusLabel(combinedStatus)}</Badge>
                  </div>
                  {[{ label: "Shopee", status: entry.shopee }, { label: "Amazon", status: entry.amazon }].map((row) => (
                    <div key={row.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
                        <Badge variant={statusVariant(row.status.status)}>{formatStatusLabel(row.status.status)}</Badge>
                      </div>
                      <small style={{ color: "var(--color-text-muted)" }}>
                        {formatTimestamp(row.status.lastValidatedAt)}
                      </small>
                      {row.status.error && (
                        <p style={{ margin: "4px 0 0", color: "var(--color-error)", fontSize: 12 }}>{row.status.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <Alert variant="warning">
            {t("noCredentialHealthData") || "No credential data available yet."}
          </Alert>
        )}
      </div>
    </Card>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {automationSummary}
      {credentialHealthCard}
      {checklistCard}
      {helpCard}
    </div>
  );

  const generalTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="grid grid-2" style={{ gap: 16 }}>
        <div>
          <label className="label">{t("maxShippingDays") || "Max shipping days"}</label>
          <Input
            type="number"
            value={maxShippingDays}
            onChange={(e) => setMaxShippingDays(Number(e.target.value))}
            hint={t("hintMaxDeliveryTime")}
          />
        </div>
        <div>
          <label className="label">{t("minExpectedProfit") || "Min expected profit"}</label>
          <Input
            type="number"
            value={minExpectedProfit}
            onChange={(e) => setMinExpectedProfit(Number(e.target.value))}
            hint={t("hintMinProfitMargin")}
          />
        </div>
        <div>
          <label className="label">{t("domesticShippingCost") || "Domestic shipping cost"}</label>
          <Input
            type="number"
            value={domesticShippingCost}
            onChange={(e) => setDomesticShippingCost(Number(e.target.value))}
            hint={t("hintDomesticShippingCost")}
          />
        </div>
        <div>
          <label className="label">{t("reviewBandPercent") || "Review band percent"}</label>
          <Input
            type="number"
            value={reviewBandPercent}
            onChange={(e) => setReviewBandPercent(Number(e.target.value))}
            hint={t("hintManualReviewBand")}
          />
        </div>
        <div>
          <label className="label">{t("autoFulfillmentMode") || "Auto-fulfillment mode"}</label>
          <Select
            value={autoFulfillmentMode}
            onChange={(e) => setAutoFulfillmentMode(e.target.value)}
            options={[
              { value: "AUTO", label: t("autoMode") || "Auto fulfill" },
              { value: "REVIEW", label: t("reviewMode") || "Manual review" }
            ]}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeAmazonPoints}
            onChange={(e) => setIncludeAmazonPoints(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span>{t("includeAmazonPoints") || "Include Amazon points in calculations"}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeDomesticShipping}
            onChange={(e) => setIncludeDomesticShipping(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span>{t("includeDomesticShipping") || "Include domestic shipping costs"}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontWeight: 600 }}>{t("enableAutomation") || "Enable automation"}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => setIsDryRun(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span>{t("dryRunMode") || "Dry run mode (no live orders)"}</span>
        </label>
      </div>

      <Button onClick={handleSaveSettings} variant="primary" fullWidth disabled={loading}>
        💾 {t("saveGeneralSettings") || "Save general settings"}
      </Button>
    </div>
  );

  const shopeeTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Alert variant="info" title={`📚 ${t("howToGetShopeeCredentials")}`}>
        <ol style={{ margin: "8px 0", paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Go to <strong>https://open.shopee.com/</strong></li>
          <li>Register and create a new app</li>
          <li>Get Partner ID and Partner Key from app settings</li>
          <li>Get Shop ID from your seller center</li>
          <li>See <strong>SHOPEE_CREDENTIALS_GUIDE.md</strong> for detailed steps</li>
        </ol>
      </Alert>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          label="Partner ID 🔢"
          value={shopeePartnerId}
          onChange={(e) => setShopeePartnerId(e.target.value)}
          placeholder={t("partnerIDPlaceholder")}
          hint={t("hintPartnerID")}
        />
        <Input
          label="Partner Key 🔐"
          type="password"
          value={shopeePartnerKey}
          onChange={(e) => setShopeePartnerKey(e.target.value)}
          placeholder={t("partnerKeyPlaceholder")}
          hint={t("hintPartnerKey")}
        />
        <Input
          label="Shop ID 🏪"
          value={shopeeShopId}
          onChange={(e) => setShopeeShopId(e.target.value)}
          placeholder={t("shopIDPlaceholder")}
          hint={t("hintShopID")}
        />
      </div>

      {shopeePartnerId && shopeePartnerKey && shopeeShopId && (
        <Alert variant="success" title={`✅ ${t("allFieldsFilled")}`}>
          {t("readyToSaveShopee") || "Ready to save. Click below to securely store your credentials."}
        </Alert>
      )}

      <Button onClick={handleSaveShopeeCredentials} variant="primary" fullWidth disabled={loading}>
        🔑 {t("saveShopeeCredentials") || "Save Shopee credentials (encrypted)"}
      </Button>

      <CredentialSetupGuide platform="shopee" />

      {shopeePartnerId && shopeePartnerKey && shopeeShopId && (
        <Button
          onClick={async () => {
            try {
              await api.post("/orders/poll-now");
              pushToast("✅ Test poll initiated! Check Orders page for results.", "success");
            } catch (e: any) {
              pushToast("Test failed: " + (e.response?.data?.error || "Unknown error"), "error");
            }
          }}
          variant="ghost"
          fullWidth
        >
          🧪 {t("testConnection") || "Test connection"}
        </Button>
      )}
    </div>
  );

  const amazonTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Alert variant="warning" title={`🔒 ${t("securityNotice")}`}>
        {t("amazonCredentialSecurity") ||
          "These credentials are encrypted (AES-256-GCM) and used only for automated browser login."}
      </Alert>
      <Alert variant="info" title={`ℹ️ ${t("whatThisDoes")}`}>
        {t("amazonAutomationExplainer") || "We use Playwright to automate purchases. Credentials stay on this server."}
      </Alert>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          label="Amazon Email 📧"
          type="email"
          value={amazonEmail}
          onChange={(e) => setAmazonEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          hint={t("hintAmazonEmail")}
        />
        <Input
          label="Amazon Password 🔑"
          type="password"
          value={amazonPassword}
          onChange={(e) => setAmazonPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          hint={t("hintAmazonPassword")}
        />
        <Input
          label="Shipping Label 🏷️"
          value={amazonShippingLabel}
          onChange={(e) => setAmazonShippingLabel(e.target.value)}
          placeholder={t("warehousePlaceholder")}
          hint={t("hintDefaultShippingLabel")}
        />
      </div>

      <Button onClick={handleSaveAmazonCredentials} variant="primary" fullWidth disabled={loading}>
        🔑 {t("saveAmazonCredentials") || "Save Amazon credentials (encrypted)"}
      </Button>

      <CredentialSetupGuide platform="amazon" />
    </div>
  );

  const notificationsTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Alert variant="info">{t("webhookInstructions") || "Configure Slack or Discord webhook URL for alerts."}</Alert>
      <Input
        label="Webhook URL"
        value={alertWebhookUrl}
        onChange={(e) => setAlertWebhookUrl(e.target.value)}
        placeholder={t("webhookPlaceholder")}
        hint={t("hintWebhookURL")}
      />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button onClick={handleTestWebhook} variant="ghost" fullWidth disabled={loading}>
          🧪 {t("testWebhook") || "Test webhook"}
        </Button>
        <Button variant="primary" fullWidth disabled={loading}>
          💾 {t("saveWebhook") || "Save webhook"}
        </Button>
      </div>
    </div>
  );

  const tabItems = [
    { id: "general", label: t("general") || "General", icon: "⚙️", content: generalTab },
    { id: "shopee", label: "Shopee", icon: "🛍️", content: shopeeTab },
    { id: "amazon", label: "Amazon", icon: "📦", content: amazonTab },
    { id: "notifications", label: t("notifications") || "Notifications", icon: "🔔", content: notificationsTab }
  ];

  return (
    <>
      <Toast />
      <PageLayout
        activeHref="/settings"
        title="⚙️ Settings & Configuration"
        description={t("settingsHeroDescription") || "Configure automation rules, credentials, and alerting."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        actions={heroActions}
        toolbar={toolbar}
        sidebar={sidebar}
        heroBackground="linear-gradient(120deg, #fef9c3 0%, #fde68a 40%, #cffafe 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Alert variant="info">
            <strong>{t("setupInstructions") || "Setup instructions"}</strong>
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>{t("configureShopeeCredentials") || "Configure Shopee API credentials."}</li>
              <li>{t("setupAmazonCredentials") || "Set up Amazon seller credentials."}</li>
              <li>{t("defineAutomationRules") || "Define automation rules (shipping days, profits)."}</li>
              <li>{t("testNotifications") || "Test webhook notifications."}</li>
              <li>{t("enableAutomation") || "Enable automation when ready."}</li>
            </ol>
          </Alert>

          {settingsError && (
            <Alert variant="error" title={t("failedToLoadSettings") || "Failed to load settings"}>
              {settingsError.message}
            </Alert>
          )}

          <Card>
            <Tabs tabs={tabItems} defaultTab="general" />
          </Card>
        </div>
      </PageLayout>

      {mounted && (
        <>
          <OnboardingTour pageName="settings" steps={settingsTour} onComplete={() => setShowTour(false)} />
          {!showTour && <HelpButton onClick={replayTour} />}
        </>
      )}
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
