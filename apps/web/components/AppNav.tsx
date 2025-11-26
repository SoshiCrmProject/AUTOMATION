import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";

export default function AppNav({ activeHref }: { activeHref?: string }) {
  const { t } = useTranslation("common");
  const [hasToken, setHasToken] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      setHasToken(!!tok);
    }
  }, []);

  const links = [
    { href: "/", label: t("navHome"), icon: "🏠" },
    { href: "/dashboard", label: t("navDashboard"), icon: "📊" },
    { href: "/analytics", label: "Analytics", icon: "📈" },
    { href: "/inventory", label: "Inventory", icon: "📦" },
    { href: "/crm", label: "CRM", icon: "👥" },
    { href: "/orders", label: t("navOrders"), icon: "🛒" },
    { href: "/calculator", label: "Calculator", icon: "💰" },
    { href: "/scraper", label: "Scraper", icon: "🔍" },
    { href: "/settings", label: t("navSettings"), icon: "⚙️" },
    { href: "/errors", label: t("navErrors"), icon: "⚠️" },
    { href: "/review", label: t("navReview"), icon: "✅" },
    { href: "/ops", label: t("navOps"), icon: "🔧" },
    { href: "/mappings", label: t("navMappings"), icon: "🔗" },
    { href: "/admin/users", label: t("navAdmin"), icon: "👤" }
  ];
  
  return (
    <header className="nav">
      <div style={{ 
        fontWeight: 800, 
        fontSize: 20,
        background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text"
      }}>
        🚀 AutoShip X
      </div>
      
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>
      
      <div className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              fontWeight: l.href === activeHref ? 700 : 500,
              color: l.href === activeHref ? "var(--color-text)" : "var(--color-text-muted)",
              background: l.href === activeHref ? "var(--color-elevated)" : "transparent",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {!hasToken && (
          <>
            <Link 
              href="/login" 
              className="btn btn-ghost"
              onClick={() => setMobileMenuOpen(false)}
              style={{ 
                fontWeight: activeHref === "/login" ? 700 : 500,
                marginLeft: 8
              }}
            >
              {t("login")}
            </Link>
            <Link 
              href="/signup" 
              className="btn"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontWeight: activeHref === "/signup" ? 700 : 500 }}
            >
              {t("signup")}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
