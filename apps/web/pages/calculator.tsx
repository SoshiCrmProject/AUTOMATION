import { useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import { Card, CardHeader, Input, Button, Alert, Badge } from "../components/ui/index";
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
        pushToast("✅ Profitable order!", "success");
      } else {
        pushToast("⚠️ Not profitable with current settings", "error");
      }
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Calculation failed", "error");
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

  return (
    <div className="shell">
      <AppNav activeHref="/calculator" />
      <Toast />
      
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '48px 32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h1 style={{ fontSize: 36, margin: 0, color: '#fff' }}>
            💰 Profit Calculator
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 16 }}>
            Calculate expected profit margins for Shopee to Amazon orders
          </p>
        </div>

        <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
          {/* Left Column - Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Shopee Order Details */}
            <Card>
              <CardHeader 
                title="🛍️ Shopee Order Details" 
                subtitle="Customer payment information"
                icon="📥"
              />
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Order Total (¥)"
                  type="number"
                  value={shopeePrice}
                  onChange={(e) => setShopeePrice(Number(e.target.value))}
                  placeholder="5000"
                />
                <Input
                  label="Shipping Fee Paid by Customer (¥)"
                  type="number"
                  value={shopeeShipping}
                  onChange={(e) => setShopeeShipping(Number(e.target.value))}
                  placeholder="500"
                />
                <Input
                  label="Shopee Fees & Commissions (¥)"
                  type="number"
                  value={shopeeFees}
                  onChange={(e) => setShopeeFees(Number(e.target.value))}
                  placeholder="300"
                  hint="Platform fees, transaction fees, etc."
                />
              </div>
            </Card>

            {/* Amazon Purchase Details */}
            <Card>
              <CardHeader 
                title="📦 Amazon Purchase Details" 
                subtitle="Costs to fulfill the order"
                icon="📤"
              />
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Product Price (¥)"
                  type="number"
                  value={amazonPrice}
                  onChange={(e) => setAmazonPrice(Number(e.target.value))}
                  placeholder="3500"
                />
                <Input
                  label="Amazon Shipping Cost (¥)"
                  type="number"
                  value={amazonShipping}
                  onChange={(e) => setAmazonShipping(Number(e.target.value))}
                  placeholder="400"
                />
                <Input
                  label="Tax (¥)"
                  type="number"
                  value={amazonTax}
                  onChange={(e) => setAmazonTax(Number(e.target.value))}
                  placeholder="0"
                />
                <Input
                  label="Amazon Points Earned (¥)"
                  type="number"
                  value={amazonPoints}
                  onChange={(e) => setAmazonPoints(Number(e.target.value))}
                  placeholder="35"
                  hint="Points you'll earn from this purchase"
                />
              </div>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader 
                title="⚙️ Calculation Settings" 
                subtitle="Additional cost considerations"
                icon="🔧"
              />
              <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includePoints}
                    onChange={(e) => setIncludePoints(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Include Amazon Points in Profit</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeDomesticShipping}
                    onChange={(e) => setIncludeDomesticShipping(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Include Domestic Shipping Cost</span>
                </label>
                
                {includeDomesticShipping && (
                  <Input
                    label="Domestic Shipping Cost (¥)"
                    type="number"
                    value={domesticShippingCost}
                    onChange={(e) => setDomesticShippingCost(Number(e.target.value))}
                    placeholder="500"
                  />
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={calculateProfit} disabled={loading} fullWidth variant="primary">
                {loading ? "Calculating..." : "💰 Calculate Profit"}
              </Button>
              <Button onClick={clearForm} variant="ghost" fullWidth>
                🔄 Clear
              </Button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card>
              <CardHeader 
                title="📊 Profit Analysis" 
                subtitle="Calculated profit and margins"
                icon="📈"
              />
              
              {!result ? (
                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                    No Calculation Yet
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    Fill in the order details and click Calculate Profit
                  </p>
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  {/* Profit Result */}
                  <div style={{
                    background: result.isViable 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '24px',
                    border: result.isViable 
                      ? '2px solid var(--color-success)'
                      : '2px solid var(--color-error)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                        Net Profit
                      </div>
                      <div style={{
                        fontSize: '48px',
                        fontWeight: 900,
                        color: result.isViable ? 'var(--color-success)' : 'var(--color-error)',
                        marginBottom: '8px'
                      }}>
                        ¥{result.profit.toFixed(2)}
                      </div>
                      <Badge variant={result.isViable ? 'success' : 'error'} size="lg">
                        {result.isViable ? '✅ Profitable' : '❌ Not Profitable'}
                      </Badge>
                    </div>
                  </div>

                  {/* Profit Margin */}
                  <div style={{
                    background: 'var(--color-elevated)',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '24px'
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                      Profit Margin
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>
                      {result.profitMargin.toFixed(2)}%
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-muted)' }}>
                      COST BREAKDOWN
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Shopee Revenue</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-success)' }}>
                          +¥{result.shopeeTotal.toFixed(2)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Amazon Purchase</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-error)' }}>
                          -¥{result.amazonTotal.toFixed(2)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Platform Fees</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-error)' }}>
                          -¥{result.fees.toFixed(2)}
                        </span>
                      </div>
                      
                      {result.shipping > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Domestic Shipping</span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-error)' }}>
                            -¥{result.shipping.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {includePoints && amazonPoints > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Amazon Points</span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-success)' }}>
                            +¥{amazonPoints.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: result.isViable 
                      ? 'rgba(16, 185, 129, 0.05)'
                      : 'rgba(239, 68, 68, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${result.isViable ? 'var(--color-success)' : 'var(--color-error)'}`
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                      {result.isViable ? '✅ Recommendation' : '⚠️ Warning'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {result.isViable 
                        ? 'This order meets your profit requirements and can be automatically processed.'
                        : 'This order does not meet minimum profit requirements. Consider manual review or skip this order.'}
                    </div>
                  </div>
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
