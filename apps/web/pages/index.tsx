import Link from "next/link";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import AppNav from "../components/AppNav";
import OnboardingChecklist from "../components/OnboardingChecklist";
import WelcomeTour from "../components/WelcomeTour";

export default function Home() {
  const { t } = useTranslation("common");
  return (
    <div className="shell">
      <AppNav />
      <WelcomeTour />
      <main className="container">
        {/* Hero Section */}
        <div className="hero" style={{ padding: "80px 40px", marginBottom: 48 }}>
          <h1 style={{ 
            fontSize: 56, 
            margin: 0, 
            background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: 900
          }}>
            {t("title")}
          </h1>
          <p style={{ 
            color: "var(--color-text-muted)", 
            fontSize: 18, 
            lineHeight: 1.7, 
            maxWidth: 700,
            margin: "20px auto"
          }}>
            {t("globalNote")}
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 32, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn" href="/signup" style={{ fontSize: 16, padding: "14px 32px" }}>
              🚀 {t("ctaGetStarted")}
            </Link>
            <Link className="btn btn-ghost" href="/login" style={{ fontSize: 16, padding: "14px 32px" }}>
              {t("ctaLogin")}
            </Link>
            <Link className="btn btn-ghost" href="/dashboard" style={{ fontSize: 16, padding: "14px 32px" }}>
              {t("navDashboard")}
            </Link>
          </div>
          <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <span className="badge badge-success">{t("badgeNoApi")}</span>
            <span className="badge badge-info">{t("badgePlaywright")}</span>
            <span className="badge badge-warning">{t("badgeProfitGuard")}</span>
          </div>
        </div>

        {/* Features Grid */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 32 }}>
            ✨ {t("enterpriseFeaturesTitle")}
          </h2>
          <div className="grid grid-3">
            <FeatureCard icon="🤖" title={t("autoShipping")} desc={t("featureAutoBuy")} />
            <FeatureCard icon="💰" title={t("includePoints")} desc={t("featureProfit")} />
            <FeatureCard icon="🔧" title={t("ops")} desc={t("featureOps")} />
            <FeatureCard icon="📊" title={t("featureAnalyticsTitle")} desc={t("featureAnalyticsDesc")} />
            <FeatureCard icon="📦" title={t("featureInventoryTitle")} desc={t("featureInventoryDesc")} />
            <FeatureCard icon="👥" title={t("featureCRMTitle")} desc={t("featureCRMDesc")} />
            <FeatureCard icon="🔔" title={t("featureNotificationsTitle")} desc={t("featureNotificationsDesc")} />
            <FeatureCard icon="💸" title={t("featurePricingTitle")} desc={t("featurePricingDesc")} />
            <FeatureCard icon="↩️" title={t("featureReturnsTitle")} desc={t("featureReturnsDesc")} />
          </div>
        </section>

        {/* Stats Showcase */}
        <section className="card" style={{ marginBottom: 48, background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))" }}>
          <h3 style={{ textAlign: "center", fontSize: 32, marginBottom: 32 }}>
            📈 {t("ops")}
          </h3>
          <div className="grid grid-3">
            <Metric label={t("metricSuccessLabel")} value="99.2%" desc={t("metricSuccessDesc")} />
            <Metric label={t("metricErrorsLabel")} value="12" desc={t("metricErrorsDesc")} />
            <Metric label={t("metricQueueLabel")} value={t("metricQueueValue")} desc={t("metricQueueDesc")} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24, justifyContent: "center" }}>
            <Link className="btn" href="/ops">{t("opsCenter")}</Link>
            <Link className="btn btn-ghost" href="/orders">{t("navOrders")}</Link>
            <Link className="btn btn-ghost" href="/analytics">📊 {t("analyticsLinkText")}</Link>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="card" style={{ marginBottom: 48 }}>
          <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 32 }}>{t("pricingTitle")}</h2>
          <div className="grid grid-3">
            <div className="card" style={{ background: "linear-gradient(135deg, var(--color-surface), var(--color-elevated))" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
              <h3 style={{ margin: 0 }}>{t("starter")}</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("pricingStarter")}</p>
              <div style={{ fontSize: 48, fontWeight: 900, margin: "16px 0", color: "var(--color-success)" }}>
                $0
              </div>
              <ul style={{ color: "var(--color-text-muted)", lineHeight: 2 }}>
                <li>{t("pricingStarterItem1")}</li>
                <li>{t("pricingStarterItem2")}</li>
                <li>{t("pricingStarterItem3")}</li>
              </ul>
              <Link href="/signup" className="btn" style={{ width: "100%", marginTop: 16 }}>
                {t("ctaGetStarted")}
              </Link>
            </div>
            <div className="card" style={{ 
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
              color: "white",
              transform: "scale(1.05)",
              border: "3px solid var(--color-primary)"
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <h3 style={{ margin: 0, color: "white" }}>{t("pro")}</h3>
              <p style={{ opacity: 0.9, fontSize: 14 }}>{t("pricingPro")}</p>
              <div style={{ fontSize: 48, fontWeight: 900, margin: "16px 0" }}>
                $99
              </div>
              <ul style={{ opacity: 0.95, lineHeight: 2 }}>
                <li>{t("pricingProItem1")}</li>
                <li>{t("pricingProItem2")}</li>
                <li>{t("pricingProItem3")}</li>
              </ul>
              <Link href="/signup" className="btn" style={{ 
                width: "100%", 
                marginTop: 16,
                background: "white",
                color: "var(--color-primary)"
              }}>
                {t("ctaGoPro")}
              </Link>
            </div>
            <div className="card" style={{ background: "linear-gradient(135deg, var(--color-surface), var(--color-elevated))" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💎</div>
              <h3 style={{ margin: 0 }}>{t("enterprise")}</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("pricingEnt")}</p>
              <div style={{ fontSize: 36, fontWeight: 900, margin: "16px 0", color: "var(--color-secondary)" }}>
                {t("talkToUs")}
              </div>
              <ul style={{ color: "var(--color-text-muted)", lineHeight: 2 }}>
                <li>{t("pricingEntItem1")}</li>
                <li>{t("pricingEntItem2")}</li>
                <li>{t("pricingEntItem3")}</li>
              </ul>
              <Link href="/settings" className="btn btn-ghost" style={{ width: "100%", marginTop: 16 }}>
                {t("ctaContactSales")}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="card" style={{ marginBottom: 48 }}>
          <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 32 }}>{t("faqTitle")}</h2>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <FaqItem question={t("faqQ1")} answer={t("faqA1")} />
            <FaqItem question={t("faqQ2")} answer={t("faqA2")} />
            <FaqItem question={t("faqQ3")} answer={t("faqA3")} />
            <FaqItem question={t("faqQ4")} answer={t("faqA4")} />
          </div>
        </section>

        {/* Onboarding Preview */}
        <section className="card" style={{ marginBottom: 48 }}>
          <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 16 }}>{t("onboardingTitle")}</h2>
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", maxWidth: 700, margin: "0 auto 32px" }}>
            {t("onboardingDesc")}
          </p>
          <OnboardingChecklist />
        </section>

        {/* Footer */}
        <footer style={{ 
          marginTop: 64, 
          paddingTop: 32,
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-text-muted)", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexWrap: "wrap", 
          gap: 16 
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>🚀 AutoShip X</div>
            <div style={{ fontSize: 14 }}>{t("landingFooter")} {new Date().getFullYear()}</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="btn btn-ghost">{t("navDashboard")}</Link>
            <Link href="/analytics" className="btn btn-ghost">{t("navAnalytics")}</Link>
            <Link href="/settings" className="btn btn-ghost">{t("navSettings")}</Link>
            <LanguageSwitcher />
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="feature-card__icon emoji-icon" aria-hidden="true">{icon}</div>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>
      <p style={{ marginBottom: 0, color: "var(--color-text-muted)", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function Metric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14, fontWeight: 600 }}>{label}</p>
      <h2 style={{ margin: "12px 0", fontSize: 40, color: "var(--color-primary)" }}>{value}</h2>
      <p style={{ margin: 0, color: "var(--color-text-light)", fontSize: 13 }}>{desc}</p>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div style={{ 
      marginBottom: 24, 
      padding: 20, 
      background: "var(--color-elevated)", 
      borderRadius: "var(--radius-lg)",
      borderLeft: "4px solid var(--color-primary)"
    }}>
      <h4 style={{ margin: "0 0 12px 0", color: "var(--color-text)" }}>{question}</h4>
      <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.6 }}>{answer}</p>
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
