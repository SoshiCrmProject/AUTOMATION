import { useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import { Card, CardHeader, Input, Button, Badge, Alert } from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

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

  const scrapeProduct = async () => {
    if (!productUrl || !productUrl.includes("amazon.co.jp")) {
      pushToast(t("pleaseEnterValidAmazonURL"), "error");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post("/api/ops/amazon-test", { productUrl });
      
      // Show queue message
      pushToast(t("scrapingTaskQueued"), "success");
      
      // For demo purposes, simulate result after a delay
      setTimeout(async () => {
        try {
          // In production, you'd poll for results or use websockets
          // For now, show a placeholder result
          setResult({
            productUrl,
            price: 3500,
            currency: "¥",
            isAvailable: true,
            isNew: true,
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            pointsEarned: 35,
            shippingText: "Ships in 2-3 days",
            title: "Product Title (Sample)",
            asin: "B0XXXXXXXXX"
          });
          pushToast(t("scrapingComplete"), "success");
        } catch (err: any) {
          console.error("Demo error:", err);
        }
      }, 3000);
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || t("failedToScrapeProduct");
      setError(errorMsg);
      pushToast(errorMsg, "error");
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

  return (
    <div className="shell">
      <AppNav activeHref="/scraper" />
      <Toast />
      
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '48px 32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h1 style={{ fontSize: 36, margin: 0, color: '#fff' }}>
            🔍 {t("amazonScraperTitle")}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 16 }}>
            {t("amazonScraperSubtitle")}
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
          {/* Left Column - Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card>
              <CardHeader 
                title={t("productURL")}
                subtitle={t("enterAmazonLink")}
                icon="🔗"
              />
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label={t("amazonProductURL")}
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://www.amazon.co.jp/dp/B0XXXXXXXXX"
                  hint={t("mustBeValidAmazonURL")}
                />
                
                {error && (
                  <Alert variant="error" title={t("scrapingError")}>
                    {error}
                  </Alert>
                )}
              </div>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader 
                title={t("quickTips")}
                subtitle={t("quickTipsSubtitle")}
                icon="📚"
              />
              <div style={{ padding: '0 24px 24px' }}>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: 20, 
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  lineHeight: 1.8
                }}>
                  <li>{t("quickTip1")}</li>
                  <li>{t("quickTip2")}</li>
                  <li>{t("quickTip3")}</li>
                  <li>{t("quickTip4")}</li>
                  <li>{t("quickTip5")}</li>
                  <li>{t("quickTip6")}</li>
                </ul>
              </div>
            </Card>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={scrapeProduct} disabled={loading || !productUrl} fullWidth variant="primary">
                {loading ? t("scraping") : `🔍 ${t("scrapeProduct")}`}
              </Button>
              <Button onClick={clearForm} variant="ghost" fullWidth>
                🔄 {t("clearForm")}
              </Button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card>
              <CardHeader 
                title={t("scrapeResults")}
                subtitle={t("extractedProductInfo")}
                icon="📈"
              />
              
              {!result ? (
                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                  <h3 style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                    {t("noDataYet")}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    {t("enterProductURLAndScrape")}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  {/* Availability Status */}
                  <div style={{
                    background: result.isAvailable 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '24px',
                    border: result.isAvailable 
                      ? '2px solid var(--color-success)'
                      : '2px solid var(--color-error)',
                    textAlign: 'center'
                  }}>
                    <Badge variant={result.isAvailable ? 'success' : 'error'} size="lg">
                      {result.isAvailable ? `✅ ${t("inStock")}` : `❌ ${t("outOfStock")}`}
                    </Badge>
                  </div>

                  {/* Product Details */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-muted)' }}>
                      {t("productInformation")}
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {result.title && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            {t("productTitle")}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>
                            {result.title}
                          </div>
                        </div>
                      )}
                      
                      {result.asin && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            ASIN
                          </div>
                          <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                            {result.asin}
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                          {t("price")}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {result.currency}{result.price.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                          {t("condition")}
                        </div>
                        <Badge variant={result.isNew ? 'success' : 'warning'}>
                          {result.isNew ? t("conditionNew") : t("conditionUsed")}
                        </Badge>
                      </div>

                      {result.pointsEarned && result.pointsEarned > 0 && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            {t("pointsEarned")}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-success)' }}>
                            +{result.pointsEarned} pts
                          </div>
                        </div>
                      )}

                      {result.shippingText && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            {t("shipping")}
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            {result.shippingText}
                          </div>
                        </div>
                      )}

                      {result.estimatedDelivery && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            {t("estimatedDelivery")}
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            {new Date(result.estimatedDelivery).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {result.isAvailable && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Button onClick={copyToCalculator} variant="primary" fullWidth>
                        💰 {t("useInCalculator")}
                      </Button>
                      <Button 
                        onClick={() => window.open(result.productUrl, '_blank')} 
                        variant="ghost" 
                        fullWidth
                      >
                        🔗 {t("viewOnAmazon")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
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
