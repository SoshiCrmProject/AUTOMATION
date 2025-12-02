import { useEffect, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import { Card, CardHeader, Button, Badge, Input, Alert, EmptyState } from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

type ProfitResult = {
  profit: number;
  profitMargin: number;
  shopeeTotal: number;
  amazonTotal: number;
  fees: number;
  shipping: number;
  isViable: boolean;
};

type BadgeTone = "info" | "success" | "warning" | "error" | "default";

const safeNumber = (value: number | null | undefined) => (typeof value === "number" && !Number.isNaN(value) ? value : 0);

const formatCurrency = (value: number | null | undefined, fractionDigits = 0) => {
  const amount = safeNumber(value);
  return `¥${amount.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
};

const formatPercent = (value: number | null | undefined) => `${safeNumber(value).toFixed(2)}%`;

export default function ProfitCalculatorPage() {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfitResult | null>(null);
  
  // Shopee inputs
  const [shopeePrice, setShopeePrice] = useState<number>(0);
  const [shopeeShipping, setShopeeShipping] = useState<number>(0);
  const [shopeeFees, setShopeeFees] = useState<number>(0);
  
  // Amazon inputs
  const [amazonPrice, setAmazonPrice] = useState<number>(0);
  const [amazonShipping, setAmazonShipping] = useState<number>(0);
  const [amazonTax, setAmazonTax] = useState<number>(0);
  const [amazonPoints, setAmazonPoints] = useState<number>(0);
  
  // Settings
  const [includePoints, setIncludePoints] = useState(true);
  const [includeDomesticShipping, setIncludeDomesticShipping] = useState(false);
  const [domesticShippingCost, setDomesticShippingCost] = useState<number>(500);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scraped = localStorage.getItem("amazonScrapedData");
    if (!scraped) return;

    try {
      const data = JSON.parse(scraped);
      setAmazonPrice(data.amazonPrice || 0);
      setAmazonPoints(data.amazonPoints || 0);
      setAmazonShipping(data.amazonShipping || 0);
      setAmazonTax(data.amazonTax || 0);
      pushToast(t("amazonDataLoaded"), "success");
    } catch (error) {
      // Ignore malformed payloads but still clear the cache bucket
    } finally {
      localStorage.removeItem("amazonScrapedData");
    }
  }, [t]);

  const applySampleScenario = () => {
    setShopeePrice(7200);
    setShopeeShipping(450);
    setShopeeFees(580);
    setAmazonPrice(5200);
    setAmazonShipping(420);
    setAmazonTax(320);
    setAmazonPoints(420);
    setIncludePoints(true);
    setIncludeDomesticShipping(true);
    setDomesticShippingCost(650);
    setResult(null);
    pushToast("Sample scenario applied", "success");
  };

  const openDocumentation = () => {
    if (typeof window !== "undefined") {
      window.open(
        "https://github.com/SoshiCrmProject/AUTOMATION/blob/main/docs/troubleshooting.md#profitability",
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const calculateProfit = async () => {
    setLoading(true);
    try {
      const response = await api.post("/profit/preview", {
        shopeeOrderTotal: shopeePrice,
        shopeeShippingFee: shopeeShipping,
        shopeeFees: shopeeFees,
        amazonProductPrice: amazonPrice,
        amazonShippingCost: amazonShipping,
        amazonTax: amazonTax,
        amazonPoints: includePoints ? amazonPoints : 0,
        includeDomesticShipping,
        domesticShippingCost: includeDomesticShipping ? domesticShippingCost : 0
      });
      
      setResult(response.data);
      
      if (response.data.isViable) {
        pushToast(t("profitableOrder"), "success");
      } else {
        pushToast(t("notProfitableWithSettings"), "error");
      }
    } catch (error: any) {
      pushToast(error.response?.data?.error || t("calculationFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setShopeePrice(0);
    setShopeeShipping(0);
    setShopeeFees(0);
    setAmazonPrice(0);
    setAmazonShipping(0);
    setAmazonTax(0);
    setAmazonPoints(0);
    setResult(null);
  };

  const heroBadge = (
    <Badge variant={result ? (result.isViable ? "success" : "warning") : "info"} size="lg">
      {result
        ? result.isViable
          ? t("profitableOrder") || "Profitable scenario"
          : t("notProfitableWithSettings") || "Needs adjustments"
        : "Awaiting simulation"}
    </Badge>
  );

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {[
        {
          label: t("netProfit") || "Net profit",
          value: result ? formatCurrency(result.profit, 0) : formatCurrency(0, 0),
          helper: result
            ? result.isViable
              ? t("profitableOrder") || "Automation ready"
              : t("notProfitableWithSettings") || "Outside guardrails"
            : "No calculation yet",
          color: result ? (result.isViable ? "var(--color-success)" : "var(--color-error)") : "var(--color-info)"
        },
        {
          label: t("profitMargin") || "Profit margin",
          value: result ? formatPercent(result.profitMargin) : formatPercent(0),
          helper: includePoints ? (t("includeAmazonPointsInProfit") || "Amazon points applied") : "Amazon points ignored",
          color: "var(--color-primary)"
        }
      ].map((stat) => (
        <div
          key={stat.label}
          style={{
            background: "rgba(255,255,255,0.85)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(15,23,42,0.6)" }}>{stat.label}</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "rgba(15,23,42,0.7)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {t("profitCalculatorSubtitle") || "Model profitability before committing to auto-fulfillment."}
    </span>
  );

  const heroActions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" variant="ghost" onClick={applySampleScenario}>
        🧪 Use sample data
      </Button>
      <Button type="button" variant="ghost" onClick={openDocumentation}>
        📘 Troubleshooting guide
      </Button>
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Badge variant={includePoints ? "success" : "warning"} size="sm">
        {includePoints ? "Amazon points included" : "Amazon points ignored"}
      </Badge>
      <Badge variant={includeDomesticShipping ? "info" : "default"} size="sm">
        {includeDomesticShipping ? `${t("domesticShippingJPY")}: ${formatCurrency(domesticShippingCost, 0)}` : "Domestic shipping excluded"}
      </Badge>
      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        {result ? `Last run → ${formatCurrency(result.profit, 0)} (${formatPercent(result.profitMargin)})` : "No calculation yet"}
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button type="button" variant="ghost" onClick={clearForm}>
          🧼 {t("clearForm")}
        </Button>
        <Button type="button" onClick={calculateProfit} disabled={loading}>
          {loading ? "Calculating..." : `⚡ ${t("calculateProfit")}`}
        </Button>
      </div>
    </div>
  );

  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      window.open(path, "_self");
    }
  };

  const simulationHighlights: Array<{ label: string; value: string; variant: BadgeTone }> = [
    {
      label: "Points mode",
      value: includePoints ? "Included" : "Ignored",
      variant: includePoints ? "success" : "warning"
    },
    {
      label: "Domestic shipping",
      value: includeDomesticShipping ? formatCurrency(domesticShippingCost, 0) : "Excluded",
      variant: includeDomesticShipping ? "info" : "default"
    },
    {
      label: "Latest profit",
      value: result ? formatCurrency(result.profit, 0) : "—",
      variant: result ? (result.isViable ? "success" : "warning") : "default"
    }
  ];

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader title="Simulation status" subtitle="Quick health indicators" icon="🎯" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {simulationHighlights.map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{item.label}</span>
              <Badge variant={item.variant}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title="Automation tips" subtitle="Stay within guardrails" icon="💡" />
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 13 }}>
          <li>Keep profit margin above 10% before scheduling auto-fulfillment.</li>
          <li>Apply domestic shipping only when it exceeds ¥400 to avoid noise.</li>
          <li>Leverage Amazon points for high-volume SKUs to offset fees.</li>
        </ul>
      </Card>
      <Card hover={false}>
        <CardHeader title="Shortcuts" subtitle="Common workflows" icon="⚡" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={() => navigateTo("/orders")}>
            📦 Go to orders
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigateTo("/notifications")}>
            🔔 Notification rules
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigateTo("/pricing")}>
            💹 Tune pricing rules
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <Toast />
      <PageLayout
        activeHref="/calculator"
        title={`💰 ${t("profitCalculatorTitle")}`}
        description={t("profitCalculatorSubtitle") || "Estimate profitability before you fulfill."}
        eyebrow="Financial guardrails"
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        heroBackground="linear-gradient(120deg, #fef3c7 0%, #fde68a 35%, #e0f2fe 100%)"
        toolbar={toolbar}
        actions={heroActions}
        sidebar={sidebar}
      >
        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            alignItems: "start"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <CardHeader
                title={`🛍️ ${t("shopeeOrderDetails")}`}
                subtitle={t("customerPaymentInfo")}
                icon="📥"
              />
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <Input
                  label={t("orderTotal")}
                  type="number"
                  value={shopeePrice}
                  onChange={(e) => setShopeePrice(Number(e.target.value))}
                  placeholder={t("placeholder5000")}
                />
                <Input
                  label={t("shippingFeePaid")}
                  type="number"
                  value={shopeeShipping}
                  onChange={(e) => setShopeeShipping(Number(e.target.value))}
                  placeholder={t("placeholder500")}
                />
                <Input
                  label={t("shopeeFeesCommissions")}
                  type="number"
                  value={shopeeFees}
                  onChange={(e) => setShopeeFees(Number(e.target.value))}
                  placeholder={t("placeholder300")}
                  hint={t("hintPlatformFees")}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title={`📦 ${t("amazonPurchaseDetails")}`}
                subtitle={t("costsToFulfill")}
                icon="📤"
              />
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <Input
                  label={t("productPrice")}
                  type="number"
                  value={amazonPrice}
                  onChange={(e) => setAmazonPrice(Number(e.target.value))}
                  placeholder={t("placeholder3500")}
                />
                <Input
                  label={t("amazonShippingCost")}
                  type="number"
                  value={amazonShipping}
                  onChange={(e) => setAmazonShipping(Number(e.target.value))}
                  placeholder={t("placeholder400")}
                />
                <Input
                  label={t("taxAmount")}
                  type="number"
                  value={amazonTax}
                  onChange={(e) => setAmazonTax(Number(e.target.value))}
                  placeholder={t("placeholder0")}
                />
                <Input
                  label={t("pointsEarned")}
                  type="number"
                  value={amazonPoints}
                  onChange={(e) => setAmazonPoints(Number(e.target.value))}
                  placeholder={t("placeholder35")}
                  hint={t("hintPointsEarn")}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title={`⚙️ ${t("calculationSettings")}`}
                subtitle={t("additionalCostConsiderations")}
                icon="🔧"
              />
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includePoints}
                    onChange={(e) => setIncludePoints(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{t("includeAmazonPointsInProfit")}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeDomesticShipping}
                    onChange={(e) => setIncludeDomesticShipping(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{t("includeDomesticShippingCost")}</span>
                </label>

                {includeDomesticShipping && (
                  <Input
                    label={t("domesticShippingJPY")}
                    type="number"
                    value={domesticShippingCost}
                    onChange={(e) => setDomesticShippingCost(Number(e.target.value))}
                    placeholder={t("placeholder500Domestic")}
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="📌 Recent insights" subtitle="Guardrails that mattered last run" icon="📎" />
              <div style={{ padding: "0 24px 24px", display: "grid", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Shopee revenue</span>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{result ? formatCurrency(result.shopeeTotal, 0) : formatCurrency(0, 0)}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-light)" }}>Checkout total captured from Shopee.</p>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Amazon spend</span>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{result ? formatCurrency(result.amazonTotal, 0) : formatCurrency(0, 0)}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-light)" }}>Product + shipping + tax.</p>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Card>
              <CardHeader
                title={`📊 ${t("profitAnalysis")}`}
                subtitle={t("calculatedProfitMargins")}
                icon="📈"
              />
              {!result ? (
                <EmptyState
                  icon="🧮"
                  title="No calculation yet"
                  description="Fill out the Shopee + Amazon inputs, then run the simulator to see projected profit."
                  action={
                    <Button type="button" onClick={calculateProfit} disabled={loading}>
                      {loading ? "Calculating..." : `⚡ ${t("calculateProfit")}`}
                    </Button>
                  }
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 24px 24px" }}>
                  <div
                    style={{
                      background: result.isViable
                        ? "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.12) 100%)"
                        : "linear-gradient(135deg, rgba(248, 113, 113, 0.08) 0%, rgba(251, 191, 36, 0.12) 100%)",
                      borderRadius: "var(--radius-xl)",
                      padding: 24,
                      border: `1px solid ${result.isViable ? "rgba(16, 185, 129, 0.5)" : "rgba(248, 113, 113, 0.5)"}`
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                      <div>
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)", textTransform: "uppercase" }}>{t("netProfit")}</span>
                        <div style={{ fontSize: 40, fontWeight: 900, color: result.isViable ? "var(--color-success)" : "var(--color-error)", lineHeight: 1 }}>
                          {formatCurrency(result.profit, 0)}
                        </div>
                      </div>
                      <Badge variant={result.isViable ? "success" : "warning"} size="lg">
                        {result.isViable ? t("profitable") || "Profitable" : t("notProfitable") || "Not profitable"}
                      </Badge>
                    </div>
                    <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--color-text-muted)" }}>
                      {result.isViable
                        ? "This scenario meets automation guardrails."
                        : "Adjust inputs or guardrails before handing off to automation."}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 16
                    }}
                  >
                    <div style={{ background: "var(--color-elevated)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Margin</p>
                      <strong style={{ fontSize: 28 }}>{formatPercent(result.profitMargin)}</strong>
                      <small style={{ display: "block", color: "var(--color-text-light)" }}>Target ≥ 10%</small>
                    </div>
                    <div style={{ background: "var(--color-elevated)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Shopee revenue</p>
                      <strong style={{ fontSize: 24 }}>{formatCurrency(result.shopeeTotal, 0)}</strong>
                      <small style={{ display: "block", color: "var(--color-text-light)" }}>Paid by customer</small>
                    </div>
                    <div style={{ background: "var(--color-elevated)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Amazon spend</p>
                      <strong style={{ fontSize: 24 }}>{formatCurrency(result.amazonTotal, 0)}</strong>
                      <small style={{ display: "block", color: "var(--color-text-light)" }}>Cost of fulfillment</small>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: 0.5 }}>Cost breakdown</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[{
                        label: "Shopee revenue",
                        value: formatCurrency(result.shopeeTotal, 0),
                        positive: true
                      },
                      {
                        label: "Amazon purchase",
                        value: formatCurrency(result.amazonTotal, 0),
                        positive: false
                      },
                      {
                        label: "Platform fees",
                        value: formatCurrency(result.fees, 0),
                        positive: false
                      },
                      result.shipping > 0
                        ? {
                            label: "Domestic shipping",
                            value: formatCurrency(result.shipping, 0),
                            positive: false
                          }
                        : null,
                      includePoints && amazonPoints > 0
                        ? {
                            label: "Amazon points credit",
                            value: formatCurrency(amazonPoints, 0),
                            positive: true
                          }
                        : null].filter(Boolean).map((line) => (
                        <div
                          key={line!.label}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                        >
                          <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{line!.label}</span>
                          <strong style={{ color: line!.positive ? "var(--color-success)" : "var(--color-error)" }}>
                            {line!.positive ? "+" : "-"}
                            {line!.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert variant={result.isViable ? "success" : "warning"} title={result.isViable ? "Automation ready" : "Manual review recommended"}>
                    {result.isViable
                      ? "You can safely queue this order for automatic fulfillment."
                      : "Tweak inputs or guardrails before scheduling automation."}
                  </Alert>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Operator notes" subtitle="Document quick assumptions" icon="📝" />
              <div style={{ padding: "0 24px 24px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-light)" }}>
                  Capture why you overrode certain costs before handing off to teammates. Keeping a short log improves auditability and
                  keeps the automation guardrails trustworthy.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </PageLayout>
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
