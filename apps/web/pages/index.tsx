import Link from "next/link";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PageLayout from "../components/PageLayout";
import OnboardingChecklist from "../components/OnboardingChecklist";
import WelcomeTour from "../components/WelcomeTour";
import { Card, CardHeader, StatCard, Badge } from "../components/ui/index";

export default function Home() {
  const { t } = useTranslation("common");

  const heroBadge = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge variant="success" size="lg">{t("badgeNoApi")}</Badge>
      <Badge variant="info" size="lg">{t("badgePlaywright")}</Badge>
      <Badge variant="warning" size="lg">{t("badgeProfitGuard")}</Badge>
    </div>
  );

  const heroActions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Link className="btn" href="/signup" style={{ fontSize: 16, padding: "12px 28px" }}>
        🚀 {t("ctaGetStarted")}
      </Link>
      <Link className="btn btn-ghost" href="/login" style={{ fontSize: 16, padding: "12px 28px" }}>
        {t("ctaLogin")}
      </Link>
      <Link className="btn btn-ghost" href="/dashboard" style={{ fontSize: 16, padding: "12px 28px" }}>
        {t("navDashboard")}
      </Link>
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{t("globalNote")}</span>
      <div style={{ flex: 1, minWidth: 200 }} />
      <Link className="btn btn-ghost" href="/ops">
        {t("opsCenter")}
      </Link>
      <Link className="btn btn-ghost" href="/orders">
        {t("navOrders")}
      </Link>
      <Link className="btn btn-ghost" href="/analytics">
        📊 {t("analyticsLinkText")}
      </Link>
    </div>
  );
  return (
    <>
      <WelcomeTour />
      <PageLayout
        activeHref="/"
        title={`🚀 ${t("title")}`}
        description={t("globalNote")}
        heroBadge={heroBadge}
        actions={heroActions}
        toolbar={toolbar}
        heroBackground="linear-gradient(135deg, rgba(191,219,254,0.8) 0%, rgba(221,214,254,0.9) 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <section>
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
        {/* Features Grid */}
          <Card gradient>
            <CardHeader
              title={`📈 ${t("ops")}`}
              subtitle={t("heroOpsSubtitle") || t("featureOps")}
              icon="📊"
            />
            <div className="grid grid-3" style={{ gap: 16 }}>
              <StatCard label={t("metricSuccessLabel")} value="99.2%" icon="✅" color="success" />
              <StatCard label={t("metricErrorsLabel")} value="12" icon="⚠️" color="warning" />
              <StatCard label={t("metricQueueLabel")} value={t("metricQueueValue")} icon="📦" color="info" />
            </div>
          </Card>
        {/* Stats Showcase */}
          <section>
            <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 32 }}>{t("pricingTitle")}</h2>
            <div className="grid grid-3">
              <PricingTile
                icon="🚀"
                title={t("starter")}
                description={t("pricingStarter")}
                price="$0"
                ctaText={t("ctaGetStarted")}
                ctaHref="/signup"
                highlights={[t("pricingStarterItem1"), t("pricingStarterItem2"), t("pricingStarterItem3")]}
              />
              <PricingTile
                icon="⚡"
                title={t("pro")}
                description={t("pricingPro")}
                price="$99"
                featured
                ctaText={t("ctaGoPro")}
                ctaHref="/signup"
                highlights={[t("pricingProItem1"), t("pricingProItem2"), t("pricingProItem3")]}
              />
              <PricingTile
                icon="💎"
                title={t("enterprise")}
                description={t("pricingEnt")}
                price={t("talkToUs")}
                ctaText={t("ctaContactSales")}
                ctaHref="/settings"
                ghost
                highlights={[t("pricingEntItem1"), t("pricingEntItem2"), t("pricingEntItem3")]}
              />
            </div>
          </section>
        {/* Pricing Section */}
          <Card>
            <CardHeader
              title={t("faqTitle")}
              subtitle={t("faqSubtitle") || t("globalNote")}
              icon="❓"
            />
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <FaqItem question={t("faqQ1")} answer={t("faqA1")} />
              <FaqItem question={t("faqQ2")} answer={t("faqA2")} />
              <FaqItem question={t("faqQ3")} answer={t("faqA3")} />
              <FaqItem question={t("faqQ4")} answer={t("faqA4")} />
            </div>
          </Card>
        {/* FAQ */}
          <Card>
            <CardHeader
              title={t("onboardingTitle")}
              subtitle={t("onboardingDesc")}
              icon="🧭"
            />
            <OnboardingChecklist />
          </Card>
        {/* Onboarding Preview */}
          <footer
            style={{
              marginTop: 32,
              paddingTop: 32,
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>🚀 AutoShip X</div>
              <div style={{ fontSize: 14 }}>
                {t("landingFooter")} {new Date().getFullYear()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="btn btn-ghost">
                {t("navDashboard")}
              </Link>
              <Link href="/analytics" className="btn btn-ghost">
                {t("navAnalytics")}
              </Link>
              <Link href="/settings" className="btn btn-ghost">
                {t("navSettings")}
              </Link>
              <LanguageSwitcher />
            </div>
          </footer>
        </div>
      </PageLayout>
    </>
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

function PricingTile({
  icon,
  title,
  description,
  price,
  ctaText,
  ctaHref,
  highlights,
  featured,
  ghost
}: {
  icon: string;
  title: string;
  description: string;
  price: string;
  ctaText: string;
  ctaHref: string;
  highlights: string[];
  featured?: boolean;
  ghost?: boolean;
}) {
  const baseStyles = {
    background: featured
      ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))"
      : "linear-gradient(135deg, var(--color-surface), var(--color-elevated))",
    color: featured ? "white" : "var(--color-text)",
    border: featured ? "3px solid var(--color-primary)" : "1px solid var(--color-border)",
    transform: featured ? "scale(1.02)" : "none"
  };

  return (
    <div className="card" style={{ ...baseStyles, padding: 24 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ opacity: featured ? 0.9 : 1, fontSize: 14 }}>{description}</p>
      <div style={{ fontSize: 48, fontWeight: 900, margin: "16px 0", color: featured ? "white" : "var(--color-success)" }}>
        {price}
      </div>
      <ul style={{ color: featured ? "rgba(255,255,255,0.9)" : "var(--color-text-muted)", lineHeight: 2, paddingLeft: 18 }}>
        {highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`btn ${ghost ? "btn-ghost" : ""}`}
        style={{
          width: "100%",
          marginTop: 16,
          background: featured ? "white" : undefined,
          color: featured ? "var(--color-primary)" : undefined
        }}
      >
        {ctaText}
      </Link>
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
