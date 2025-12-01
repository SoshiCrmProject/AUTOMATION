import Link from "next/link";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT } from "../lib/authEvents";

export default function AppNav({ activeHref }: { activeHref?: string }) {
  const { t } = useTranslation("common");
  const [hasToken, setHasToken] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCompactNav, setIsCompactNav] = useState(false);
  const [navLinksId] = useState(() => `primary-navigation-${Math.random().toString(36).slice(2)}`);
  
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveAuth = () => {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      setHasToken(!!tok);
      setAuthChecked(true);
    };

    resolveAuth();
    window.addEventListener("storage", resolveAuth);
    window.addEventListener(AUTH_CHANGE_EVENT, resolveAuth as EventListener);
    return () => {
      window.removeEventListener("storage", resolveAuth);
      window.removeEventListener(AUTH_CHANGE_EVENT, resolveAuth as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const resizeHandler = () => {
      setIsCompactNav(window.innerWidth <= 1280);
    };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  useEffect(() => {
    if (!isCompactNav && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isCompactNav, mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen]);

  const links = [
    { href: "/", label: t("navHome"), icon: "🏠" },
    { href: "/dashboard", label: t("navDashboard"), icon: "📊" },
    { href: "/analytics", label: t("navAnalytics"), icon: "📈" },
    { href: "/inventory", label: t("navInventory"), icon: "📦" },
    { href: "/crm", label: t("navCRM"), icon: "👥" },
    { href: "/orders", label: t("navOrders"), icon: "🛒" },
    { href: "/calculator", label: t("navCalculator"), icon: "💰" },
    { href: "/scraper", label: t("navScraper"), icon: "🔍" },
    { href: "/settings", label: t("navSettings"), icon: "⚙️" },
    { href: "/errors", label: t("navErrors"), icon: "⚠️" },
    { href: "/review", label: t("navReview"), icon: "✅" },
    { href: "/ops", label: t("navOps"), icon: "🔧" },
    { href: "/pricing", label: t("navPricing"), icon: "💹" },
    { href: "/mappings", label: t("navMappings"), icon: "🔗" },
    { href: "/admin/users", label: t("navAdmin"), icon: "👤" }
  ];
  
  return (
    <header className="nav" role="banner">
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
        className={`mobile-menu-toggle ${isCompactNav ? "is-visible" : ""}`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle mobile menu"
        aria-expanded={mobileMenuOpen}
        aria-controls={navLinksId}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>
      
      <div
        id={navLinksId}
        className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""} ${
          isCompactNav ? "is-compact" : ""
        }`}
        role="navigation"
        aria-label={t("primaryNavigation", { defaultValue: "Primary navigation" })}
      >
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
            <span className="nav-link-icon emoji-icon" aria-hidden="true">{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {authChecked && !hasToken && (
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
        <LanguageSelector />
      </div>
    </header>
  );
}
