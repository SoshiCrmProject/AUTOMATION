import Link from "next/link";
import { CSSProperties, ReactNode } from "react";
import AppNav from "./AppNav";

export type Breadcrumb = { label: string; href?: string };
export type PageTab = { id: string; label: string; href?: string; badge?: number | string; icon?: ReactNode };

interface PageLayoutProps {
  title: string;
  description?: string;
  eyebrow?: string;
  heroBadge?: ReactNode;
  heroAside?: ReactNode;
  heroFooter?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  tabs?: PageTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
  activeHref?: string;
  heroBackground?: string;
  heroTone?: "light" | "dark";
  className?: string;
}

export default function PageLayout({
  title,
  description,
  eyebrow,
  heroBadge,
  heroAside,
  heroFooter,
  actions,
  toolbar,
  sidebar,
  breadcrumbs = [],
  tabs = [],
  activeTab,
  onTabChange,
  children,
  activeHref,
  heroBackground,
  heroTone = "light",
  className = ""
}: PageLayoutProps) {
  const heroStyle: CSSProperties | undefined = heroBackground
    ? { background: heroBackground }
    : undefined;

  const heroClass = [
    "page-hero",
    heroTone === "dark" ? "page-hero--dark" : "",
    heroAside ? "page-hero--with-aside" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`page-shell ${className}`}>
      <AppNav activeHref={activeHref} />
      <div className="page-container">
        <section className={heroClass} style={heroStyle}>
          {breadcrumbs.length > 0 && (
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="breadcrumbs__item">
                  {crumb.href ? (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && <span className="breadcrumbs__divider">/</span>}
                </span>
              ))}
            </nav>
          )}

          <div className="page-hero__header">
            <div className="page-hero__title-group">
              {eyebrow && <p className="page-hero__eyebrow">{eyebrow}</p>}
              <div className="page-hero__title-row">
                <h1 className="page-hero__title">{title}</h1>
                {heroBadge && <div className="page-hero__badge">{heroBadge}</div>}
              </div>
              {description && <p className="page-hero__description">{description}</p>}
            </div>
            {actions && <div className="page-hero__actions">{actions}</div>}
          </div>

          {heroAside && <div className="page-hero__aside">{heroAside}</div>}
          {heroFooter && <div className="page-hero__footer">{heroFooter}</div>}
        </section>

        {tabs.length > 0 && (
          <div className="page-tabs" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab ? activeTab === tab.id : false;
              const tabClass = ["page-tab", isActive ? "is-active" : ""].filter(Boolean).join(" ");

              if (tab.href) {
                return (
                  <Link key={tab.id} href={tab.href} className={tabClass} aria-current={isActive ? "page" : undefined}>
                    {tab.icon && <span className="page-tab__icon">{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && <span className="page-tab__badge">{tab.badge}</span>}
                  </Link>
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={tabClass}
                  onClick={() => onTabChange?.(tab.id)}
                  aria-pressed={isActive}
                >
                  {tab.icon && <span className="page-tab__icon">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && <span className="page-tab__badge">{tab.badge}</span>}
                </button>
              );
            })}
          </div>
        )}

        {toolbar && <div className="page-toolbar">{toolbar}</div>}

        <div className={`page-body ${sidebar ? "has-sidebar" : ""}`}>
          <div className="page-content">{children}</div>
          {sidebar && <aside className="page-sidebar">{sidebar}</aside>}
        </div>
      </div>
    </div>
  );
}
