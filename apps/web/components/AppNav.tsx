import Link from "next/link";
import { useRouter } from "next/router";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "next-i18next";
import { useEffect, useMemo, useState } from "react";
import { AUTH_CHANGE_EVENT } from "../lib/authEvents";

const NAV_BREAKPOINT = 1180;

export default function AppNav({ activeHref }: { activeHref?: string }) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCompactNav, setIsCompactNav] = useState(false);
  const [navLinksId] = useState(() => `primary-navigation-${Math.random().toString(36).slice(2)}`);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);

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
      setIsCompactNav(window.innerWidth <= NAV_BREAKPOINT);
    };
    const scrollHandler = () => setScrolled(window.scrollY > 12);
    resizeHandler();
    scrollHandler();
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("scroll", scrollHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("scroll", scrollHandler);
    };
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

  const links = useMemo(
    () => [
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
    ],
    [t]
  );

  const visibleLinks = searchValue
    ? links.filter((link) => link.label?.toLowerCase().includes(searchValue.toLowerCase()))
    : links;

  const handleNavSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (visibleLinks.length === 1) {
        router.push(visibleLinks[0].href);
        setSearchValue("");
        setMobileMenuOpen(false);
        return;
      }
      if (searchValue.trim()) {
        router.push(`/search?query=${encodeURIComponent(searchValue.trim())}`);
        setSearchValue("");
        setMobileMenuOpen(false);
      }
    }
  };

  const navStatusPill = (
    <span className="nav-status-pill" aria-live="polite">
      <span className="nav-status-dot" />
      {t("systemOperational") || "Systems nominal"}
    </span>
  );

  const navSearchInput = (variant: "inline" | "drawer" = "inline") => (
    <div className={`nav-search ${variant === "inline" ? "nav-search--inline" : ""}`}>
      <input
        type="text"
        placeholder={t("jumpToPage") || "Jump to a page"}
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        onKeyDown={handleNavSearch}
        aria-label={t("jumpToPage") || "Jump to page"}
      />
      <span className="nav-search-hint">↵</span>
    </div>
  );

  const primaryCta = (
    <button
      type="button"
      className="nav-primary-cta"
      onClick={() => {
        router.push("/dashboard");
        setMobileMenuOpen(false);
      }}
    >
      🚀 {t("navDashboard") || "Dashboard"}
    </button>
  );

  const authCtas =
    authChecked && !hasToken ? (
      <div className="nav-auth-ctas">
        <Link
          href="/login"
          className="btn btn-ghost"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t("login")}
        </Link>
        <Link
          href="/signup"
          className="btn"
          onClick={() => setMobileMenuOpen(false)}
        >
          {t("signup")}
        </Link>
      </div>
    ) : null;

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`} role="banner">
      <div className="nav__utility">
        <div className="nav__brand">
          <div className="nav__brand-mark">🚀</div>
          <div>
            <div className="nav__brand-title">AutoShip X</div>
            <div className="nav__brand-subtitle">{t("navTagline") || "Automation Control Center"}</div>
          </div>
        </div>
        {navStatusPill}
        <div className="nav__utility-actions">
          <button
            type="button"
            className="nav-ghost-action"
            onClick={() => router.push("/notifications")}
          >
            🔔 {t("notifications")}
          </button>
          <button
            type="button"
            className="nav-ghost-action"
            onClick={() => router.push("/ops")}
          >
            🛟 {t("contactOps") || "Ops Center"}
          </button>
          <LanguageSelector />
          {!isCompactNav && authCtas}
        </div>
        <button
          className={`mobile-menu-toggle ${isCompactNav ? "is-visible" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={t("toggleNavigation") || "Toggle navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls={navLinksId}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {!isCompactNav && (
        <div className="nav__primary">
          {navSearchInput("inline")}
          <div
            className="nav-links nav-links--inline"
            role="navigation"
            aria-label={t("primaryNavigation", { defaultValue: "Primary navigation" })}
          >
            {visibleLinks.length === 0 && (
              <p className="nav-links-empty">{t("noResults") || "No matches"}</p>
            )}
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${link.href === activeHref ? "is-active" : ""}`}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
          <div className="nav-primary-cta-wrapper">{primaryCta}</div>
        </div>
      )}

      {isCompactNav && (
        <div
          id={navLinksId}
          className={`nav-drawer ${mobileMenuOpen ? "mobile-open" : ""}`}
          role="dialog"
          aria-label={t("primaryNavigation", { defaultValue: "Primary navigation" })}
        >
          {navSearchInput("drawer")}
          <div className="nav-links nav-links--drawer">
            {visibleLinks.length === 0 && (
              <p className="nav-links-empty">{t("noResults") || "No matches"}</p>
            )}
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link ${link.href === activeHref ? "is-active" : ""}`}
              >
                <span className="nav-link-icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
          <div className="nav__actions-mobile">
            {primaryCta}
            {authCtas}
          </div>
        </div>
      )}
    </header>
  );
}
