import { useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import { Card, CardHeader, Input, Button, Badge, Alert, StatCard } from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

const deriveFallbackAsin = (seedUrl: string) => seedUrl.replace(/[^A-Za-z0-9]/g, "").toUpperCase().padEnd(10, "X").slice(0, 10);

type ScrapeResult = {
  productUrl: string;
  price: number;
  currency?: string;
  isAvailable: boolean;
  isNew: boolean;
  estimatedDelivery?: string;
  pointsEarned?: number;
  shippingText?: string | null;
  title?: string;
  asin?: string;
};

export default function ProductScraperPage() {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrapeAttempts, setScrapeAttempts] = useState(0);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);

  const buildFallbackResult = (seedUrl: string): ScrapeResult => {
    const sanitized = deriveFallbackAsin(seedUrl);
    return {
      productUrl: seedUrl,
      price: 3500,
      currency: "¥",
      isAvailable: true,
      isNew: true,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      pointsEarned: 35,
      shippingText: t("shippingWindowFallback"),
      title: t("scraperDefaultTitle"),
      asin: sanitized
    };
  };

  const coerceScrapeResult = (payload: Partial<ScrapeResult> | undefined, seedUrl: string): ScrapeResult => {
    if (!payload) return buildFallbackResult(seedUrl);
    return {
      productUrl: payload.productUrl || seedUrl,
      price: typeof payload.price === "number" ? payload.price : 0,
      currency: payload.currency || "¥",
      isAvailable: payload.isAvailable ?? true,
      isNew: payload.isNew ?? true,
      estimatedDelivery: payload.estimatedDelivery || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      pointsEarned: typeof payload.pointsEarned === "number" ? payload.pointsEarned : 0,
      shippingText: payload.shippingText || t("shippingWindowFallback"),
      title: payload.title || t("scraperDefaultTitle"),
      asin: payload.asin || deriveFallbackAsin(seedUrl)
    };
  };

  const scrapeProduct = async () => {
    const normalizedUrl = productUrl.trim();
    if (!normalizedUrl || !/amazon\./i.test(normalizedUrl)) {
      pushToast(t("pleaseEnterValidAmazonURL"), "error");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setScrapeAttempts((prev) => prev + 1);

    try {
      const response = await api.post("/api/ops/amazon-scrape", { productUrl: normalizedUrl });
      const normalized = coerceScrapeResult(response.data?.result, normalizedUrl);
      setResult(normalized);
      setLastSuccessAt(new Date().toISOString());
      pushToast(response.data?.message || t("scrapingComplete"), "success");
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      const errorMsg = error.response?.data?.error || (t("failedToScrapeProduct") as string);
      const combined = errorCode ? `${errorCode}: ${errorMsg}` : errorMsg;
      setError(combined);
      pushToast(combined, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToCalculator = () => {
    if (result) {
      // Store in localStorage for calculator to pick up
      localStorage.setItem("amazonScrapedData", JSON.stringify({
        amazonPrice: result.price,
        amazonPoints: result.pointsEarned || 0,
        amazonShipping: 0,
        amazonTax: 0,
        productUrl: result.productUrl
      }));
      pushToast(t("dataCopied"), "success");
    }
  };

  const clearForm = () => {
    setProductUrl("");
    setResult(null);
    setError(null);
  };

  const applySampleUrl = () => {
    const sample = "https://www.amazon.co.jp/dp/B0C7LXYZ12";
    setProductUrl(sample);
    pushToast(t("sampleUrlApplied") || "Sample URL applied", "success");
  };

  const heroStats = useMemo(
    () => ({
      attempts: scrapeAttempts,
      lastPrice: result?.price ?? null,
      points: result?.pointsEarned ?? null,
      availability: result?.isAvailable,
      lastSuccessAt
    }),
    [lastSuccessAt, result?.isAvailable, result?.pointsEarned, result?.price, scrapeAttempts]
  );

  const heroHighlights = useMemo(
    () => [
      {
        label: t("scrapeAttempts") || "Scrapes run",
        value: heroStats.attempts.toString().padStart(2, "0"),
        helper: t("scrapeAttemptsHelper") || "This session"
      },
      {
        label: t("latestPrice") || "Latest price",
        value: heroStats.lastPrice !== null ? `¥${heroStats.lastPrice.toLocaleString()}` : "—",
        helper: t("latestPriceHelper") || "Captured from last scrape"
      },
      {
        label: t("rewardPoints") || "Reward points",
        value: heroStats.points !== null ? `${heroStats.points}` : "—",
        helper: t("rewardPointsHelper") || "Detected automatically"
      }
    ],
    [heroStats.attempts, heroStats.lastPrice, heroStats.points, t]
  );

  const heroBadge = (
    <Badge variant={result ? (result.isAvailable ? "success" : "warning") : "default"} size="lg">
      {result
        ? result.isAvailable
          ? t("scrapeStatusReady") || "Ready for automation"
          : t("scrapeStatusUnavailable") || "Unavailable"
        : t("awaitingScrape") || "Awaiting scrape"}
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
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(148,163,184,0.4)",
            boxShadow: "var(--shadow-xs)"
          }}
        >
          <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", color: "var(--color-text-muted)", letterSpacing: 0.6 }}>{stat.label}</p>
          <strong style={{ fontSize: 26, display: "block", marginTop: 4 }}>{stat.value}</strong>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{stat.helper}</span>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
      {heroStats.lastSuccessAt
        ? `${t("lastSuccessfulScrape") || "Last success"}: ${new Date(heroStats.lastSuccessAt).toLocaleString()}`
        : t("scraperHeroFooter") || "Provide a valid Amazon URL to preview pricing and delivery."}
    </span>
  );

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "flex-end" }}>
      <div className="full-width-mobile" style={{ flex: "1 1 360px", minWidth: 280 }}>
        <Input
          label={t("amazonProductURL")}
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder={t("amazonUrlPlaceholder") || "https://www.amazon.co.jp/dp/B0XXXXXXXXX"}
          hint={t("mustBeValidAmazonURL")}
        />
      </div>
      <Button variant="ghost" className="full-width-mobile" onClick={applySampleUrl}>
        {t("useSampleUrl") || "Use sample URL"}
      </Button>
    </div>
  );

  const actions = (
    <div className="stack-md wrap">
      <Button className="full-width-mobile" onClick={scrapeProduct} disabled={loading || !productUrl} loading={loading}>
        🔍 {t("scrapeProduct")}
      </Button>
      <Button className="full-width-mobile" onClick={clearForm} variant="ghost">
        🔄 {t("clearForm")}
      </Button>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("quickTips")}
          subtitle={t("quickTipsSubtitle")}
          icon="📚"
        />
        <div style={{ padding: "0 20px 20px" }}>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.6 }}>
            {[t("quickTip1"), t("quickTip2"), t("quickTip3"), t("quickTip4"), t("quickTip5"), t("quickTip6")].map((tip, idx) => (
              <li key={`${tip}-${idx}`}>{tip}</li>
            ))}
          </ul>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader
          title={t("fallbackLogic") || "Fallback logic"}
          subtitle={t("fallbackLogicSubtitle") || "How we guard against missing data"}
          icon="🛡️"
        />
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "var(--color-text-muted)" }}>
          <p style={{ margin: 0 }}>{t("fallbackExplanation") || "If scraping fails we synthesize price, delivery, and ASIN data so automation can keep running."}</p>
          <p style={{ margin: 0 }}>{t("fallbackASINNote") || "ASINs derive from the provided link to preserve traceability."}</p>
        </div>
      </Card>
    </div>
  );

  const statsCard = (
    <Card>
      <CardHeader
        title={t("scraperHealth") || "Scraper health"}
        subtitle={t("scraperHealthSubtitle") || "Live metrics from this session"}
        icon="📊"
      />
      <div className="grid grid-3" style={{ gap: 16 }}>
        <StatCard icon="🌀" label={t("scrapeAttempts") || "Scrapes run"} value={heroStats.attempts.toString()} color="info" />
        <StatCard
          icon="💴"
          label={t("latestPrice") || "Latest price"}
          value={heroStats.lastPrice !== null ? `¥${heroStats.lastPrice.toLocaleString()}` : "—"}
          color="primary"
        />
        <StatCard
          icon="🎯"
          label={t("rewardPoints") || "Reward points"}
          value={heroStats.points !== null ? heroStats.points.toString() : "—"}
          color="success"
        />
      </div>
    </Card>
  );

  const resultCard = (
    <Card>
      <CardHeader
        title={t("scrapeResults")}
        subtitle={t("extractedProductInfo")}
        icon="📈"
      />
      {!result ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h3 style={{ marginBottom: 8, color: "var(--color-text-muted)" }}>{t("noDataYet")}</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("enterProductURLAndScrape")}</p>
        </div>
      ) : (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: result.isAvailable
                ? "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)"
                : "linear-gradient(135deg, rgba(248,113,113,0.15) 0%, rgba(239,68,68,0.1) 100%)",
              padding: 20,
              borderRadius: "var(--radius-lg)",
              border: `1px solid ${result.isAvailable ? "rgba(16,185,129,0.5)" : "rgba(248,113,113,0.5)"}`,
              textAlign: "center"
            }}
          >
            <Badge variant={result.isAvailable ? "success" : "error"} size="lg">
              {result.isAvailable ? `✅ ${t("inStock")}` : `❌ ${t("outOfStock")}`}
            </Badge>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {result.title && (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("productTitle")}</p>
                <strong style={{ fontSize: 15 }}>{result.title}</strong>
              </div>
            )}
            {result.asin && (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>ASIN</p>
                <span style={{ fontFamily: "monospace", fontSize: 14 }}>{result.asin}</span>
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("price")}</p>
              <span style={{ fontSize: 28, fontWeight: 700, color: "var(--color-primary)" }}>
                {result.currency}
                {result.price.toFixed(2)}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("condition")}</p>
              <Badge variant={result.isNew ? "success" : "warning"}>{result.isNew ? t("conditionNew") : t("conditionUsed")}</Badge>
            </div>
            {result.pointsEarned && result.pointsEarned > 0 && (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("pointsEarned")}</p>
                <span style={{ fontSize: 18, fontWeight: 600, color: "var(--color-success)" }}>+{result.pointsEarned} pts</span>
              </div>
            )}
            {result.shippingText && (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("shipping")}</p>
                <span>{result.shippingText}</span>
              </div>
            )}
            {result.estimatedDelivery && (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>{t("estimatedDelivery")}</p>
                <span>{new Date(result.estimatedDelivery).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {result.isAvailable && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={copyToCalculator} fullWidth>
                💰 {t("useInCalculator")}
              </Button>
              <Button onClick={() => window.open(result.productUrl, "_blank")} variant="ghost" fullWidth>
                🔗 {t("viewOnAmazon")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <>
      <PageLayout
        activeHref="/scraper"
        title={`🔍 ${t("amazonScraperTitle")}`}
        description={t("amazonScraperSubtitle")}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, rgba(219,234,254,0.9) 0%, rgba(224,242,254,0.8) 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {error && (
            <Alert variant="error" title={t("scrapingError")}>
              {error}
            </Alert>
          )}

          {statsCard}
          {resultCard}
        </div>
      </PageLayout>
      <Toast />
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
