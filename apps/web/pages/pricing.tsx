import { FormEvent, useMemo, useRef, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import { Card, CardHeader, StatCard, Button, Alert, Badge, Input, Select, EmptyState } from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

type RuleType = "FIXED_MARGIN" | "PERCENTAGE_MARKUP" | "COMPETITOR_MATCH" | "DYNAMIC_REPRICING";

interface PricingRule {
  id: string;
  name: string;
  ruleType: RuleType;
  fixedMarkupAmount: number | null;
  minMarginPercent: number | null;
  maxMarginPercent: number | null;
  priority: number;
  isActive: boolean;
  applyToCategories: string[];
  scheduleLabel: string;
}

const RULE_TYPE_OPTIONS: { labelKey: string; value: RuleType; descriptionKey: string }[] = [
  { labelKey: "pricingRuleTypeFixed", value: "FIXED_MARGIN", descriptionKey: "pricingRuleTypeFixedDesc" },
  { labelKey: "pricingRuleTypePercent", value: "PERCENTAGE_MARKUP", descriptionKey: "pricingRuleTypePercentDesc" },
  { labelKey: "pricingRuleTypeCompetitor", value: "COMPETITOR_MATCH", descriptionKey: "pricingRuleTypeCompetitorDesc" },
  { labelKey: "pricingRuleTypeDynamic", value: "DYNAMIC_REPRICING", descriptionKey: "pricingRuleTypeDynamicDesc" }
];

const ensureNumber = (value: number | null | undefined) => (typeof value === "number" && !Number.isNaN(value) ? value : 0);

const formatNumber = (
  value: number | null | undefined,
  locale = "en-US",
  options: Intl.NumberFormatOptions = {}
) => new Intl.NumberFormat(locale, options).format(ensureNumber(value));

const formatPercent = (value: number | null | undefined, locale = "en-US", fractionDigits = 0) =>
  `${formatNumber(value, locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}%`;

export default function PricingPage() {
  const { t, i18n } = useTranslation("common");
  const localeForDisplay = i18n.language === "ja" ? "ja-JP" : "en-US";
  const sampleRules = useMemo<PricingRule[]>(
    () => [
      {
        id: "rule-fixed-margin",
        name: t("pricingSampleRuleFixedName") || "Top sellers +¥900 markup",
        ruleType: "FIXED_MARGIN",
        fixedMarkupAmount: 900,
        minMarginPercent: null,
        maxMarginPercent: null,
        priority: 10,
        isActive: true,
        applyToCategories: [
          t("pricingCategoryElectronics") || "Electronics",
          t("pricingCategoryHome") || "Home"
        ],
        scheduleLabel: t("pricingRuleScheduleAlways") || "Always on"
      },
      {
        id: "rule-percentage",
        name: t("pricingSampleRulePercentName") || "New listings 18% margin",
        ruleType: "PERCENTAGE_MARKUP",
        fixedMarkupAmount: null,
        minMarginPercent: 18,
        maxMarginPercent: 25,
        priority: 25,
        isActive: true,
        applyToCategories: [t("pricingCategoryBeauty") || "Beauty"],
        scheduleLabel: t("pricingScheduleWeekdays") || "Weekdays"
      },
      {
        id: "rule-competitor",
        name: t("pricingSampleRuleCompetitorName") || "Competitor match -1%",
        ruleType: "COMPETITOR_MATCH",
        fixedMarkupAmount: null,
        minMarginPercent: null,
        maxMarginPercent: null,
        priority: 40,
        isActive: false,
        applyToCategories: [t("pricingCategoryToys") || "Toys"],
        scheduleLabel: t("pricingScheduleFlashSales") || "Flash sales"
      }
    ],
    [t]
  );
  const [rules, setRules] = useState<PricingRule[]>(sampleRules);
  const [saving, setSaving] = useState(false);
  const usingSampleData = true;
  const [ruleSearch, setRuleSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    ruleType: "PERCENTAGE_MARKUP" as RuleType,
    minMarginPercent: 15,
    maxMarginPercent: 25,
    fixedMarkupAmount: 500,
    priority: 50,
    categories: ""
  });
  const formRef = useRef<HTMLFormElement | null>(null);

  const summary = useMemo(() => {
    const activeRules = rules.filter((r) => r.isActive).length;
    const averageMargin = Math.round(
      rules.reduce((acc, rule) => {
        if (rule.ruleType === "PERCENTAGE_MARKUP" && rule.minMarginPercent) {
          return acc + rule.minMarginPercent;
        }
        if (rule.ruleType === "FIXED_MARGIN" && rule.fixedMarkupAmount) {
          return acc + rule.fixedMarkupAmount / 100;
        }
        return acc;
      }, 0) / Math.max(rules.length, 1)
    );
    return {
      total: rules.length,
      active: activeRules,
      guardrails: Math.max(averageMargin, 0)
    };
  }, [rules]);

  const filteredRules = useMemo(() => {
    if (!ruleSearch.trim()) return rules;
    const term = ruleSearch.toLowerCase();
    return rules.filter((rule) => {
      const nameMatch = rule.name.toLowerCase().includes(term);
      const categoryMatch = rule.applyToCategories.some((cat) => cat.toLowerCase().includes(term));
      const typeLabel = (t(`pricingRuleTypeLabel.${rule.ruleType}`) || "").toLowerCase();
      return nameMatch || categoryMatch || typeLabel.includes(term);
    });
  }, [ruleSearch, rules, t]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyTemplate = (type: RuleType) => {
    setForm((prev) => ({
      ...prev,
      name:
        type === "FIXED_MARGIN"
          ? t("pricingTemplateFixed") || "High-margin guardrail"
          : type === "COMPETITOR_MATCH"
            ? t("pricingTemplateCompetitor") || "Competitor awareness"
            : t("pricingTemplateDynamic") || "Dynamic markup",
      ruleType: type,
      minMarginPercent: type === "PERCENTAGE_MARKUP" ? 20 : prev.minMarginPercent,
      maxMarginPercent: type === "PERCENTAGE_MARKUP" ? 30 : prev.maxMarginPercent,
      fixedMarkupAmount: type === "FIXED_MARGIN" ? 900 : prev.fixedMarkupAmount,
      priority: type === "COMPETITOR_MATCH" ? 30 : prev.priority,
    }));
    pushToast(t("pricingTemplateApplied") || "Template applied", "success");
    scrollToForm();
  };

  const heroBadge = (
    <Badge variant={usingSampleData ? "warning" : "success"}>
      {usingSampleData ? t("pricingSampleDataBadge") || "Sample data" : t("pricingLiveDataBadge") || "Live data"}
    </Badge>
  );

  const heroHighlights = [
    {
      label: t("pricingRuleCount") || "Total rules",
      value: formatNumber(summary.total, localeForDisplay),
      helper: t("pricingRuleCountHelper") || "Automation recipes configured",
    },
    {
      label: t("pricingRuleActive") || "Active",
      value: formatNumber(summary.active, localeForDisplay),
      helper: t("pricingRuleActiveHelper") || "Currently enforcing prices",
    },
    {
      label: t("pricingRuleGuardrail") || "Guardrail",
      value: formatPercent(summary.guardrails, localeForDisplay),
      helper: t("pricingRuleGuardrailHelper") || "Average margin floor",
    },
  ];

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{stat.label}</span>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {t("pricingHeroFooter") || "Rules run sequentially. Higher priority executes first."}
    </span>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <div style={{ flex: "1 1 240px", minWidth: 220 }}>
        <Input
          placeholder={t("pricingRuleSearchPlaceholder") || "Search rules by name, category, or type"}
          value={ruleSearch}
          onChange={(e) => setRuleSearch(e.target.value)}
          aria-label={t("search") || "Search"}
        />
      </div>
      <Button type="button" variant="ghost" onClick={() => setRuleSearch("")} disabled={!ruleSearch}>
        🧼 {t("clearFilters") || "Clear"}
      </Button>
    </div>
  );

  const actions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" onClick={scrollToForm}>
        ➕ {t("pricingRuleCreate") || "New rule"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => applyTemplate("FIXED_MARGIN")}>
        📈 {t("pricingFixedTemplate") || "Fixed margin template"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => applyTemplate("COMPETITOR_MATCH")}>
        🤝 {t("pricingCompetitorTemplate") || "Competitor match template"}
      </Button>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("pricingSidebarHealth") || "Rule health"}
          subtitle={t("pricingSidebarHealthSubtitle") || "Quick telemetry"}
          icon="📊"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{
            label: t("pricingRuleCount") || "Total rules",
            value: formatNumber(summary.total, localeForDisplay),
            variant: "info" as const,
          }, {
            label: t("pricingRuleActive") || "Active",
            value: formatNumber(summary.active, localeForDisplay),
            variant: "success" as const,
          }, {
            label: t("pricingRuleGuardrail") || "Guardrail",
            value: formatPercent(summary.guardrails, localeForDisplay),
            variant: "warning" as const,
          }].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{item.label}</span>
              <Badge variant={item.variant}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader
          title={t("pricingBestPractices") || "Best practices"}
          subtitle={t("pricingBestPracticesSubtitle") || "Keep profit buffers safe"}
          icon="🧠"
        />
        <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {[t("pricingTipPrioritize") || "Higher priority wins—reserve 0-20 for guardrails.",
            t("pricingTipCategories") || "Tag rules with categories so teams know scope.",
            t("pricingTipCompetitors") || "Pair competitor-match rules with a safety margin.",
            t("pricingTipSchedule") || "Use schedule labels to document when automations fire."]
            .map((tip) => (
              <li key={tip} style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{tip}</li>
            ))}
        </ul>
      </Card>
    </div>
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      pushToast(t("fieldRequired"), "error");
      return;
    }
    setSaving(true);
    const newRule: PricingRule = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      ruleType: form.ruleType,
      fixedMarkupAmount: form.ruleType === "FIXED_MARGIN" ? Number(form.fixedMarkupAmount) : null,
      minMarginPercent: form.ruleType === "PERCENTAGE_MARKUP" ? Number(form.minMarginPercent) : null,
      maxMarginPercent: form.ruleType === "PERCENTAGE_MARKUP" ? Number(form.maxMarginPercent) : null,
      priority: Number(form.priority) || 50,
      isActive: true,
      applyToCategories: form.categories ? form.categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
      scheduleLabel: t("pricingRuleScheduleAlways")
    };

    setRules((prev) => [newRule, ...prev]);
    setForm({
      name: "",
      ruleType: form.ruleType,
      minMarginPercent: 15,
      maxMarginPercent: 25,
      fixedMarkupAmount: 500,
      priority: 50,
      categories: ""
    });
    pushToast(t("pricingRuleCreated"), "success");
    setSaving(false);
  };

  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );
    pushToast(t("pricingRuleUpdated"), "success");
  };

  const removeRule = (ruleId: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    pushToast(t("pricingRuleDeleted"), "success");
  };

  return (
    <>
      <PageLayout
        activeHref="/pricing"
        title={`💹 ${t("pricingHeroTitle")}`}
        description={t("pricingHeroSubtitle")}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {usingSampleData && (
            <Alert variant="info" title={t("pricingRuleSampleNotice") || "Sample data enabled"}>
              {t("pricingSampleDataNotice") || "Connect your shop to activate live automation."}
            </Alert>
          )}

          <Card>
            <CardHeader
              title={t("pricingOverviewTitle") || "Automation telemetry"}
              subtitle={t("pricingOverviewSubtitle") || "Monitor guardrails at a glance"}
              icon="📈"
            />
            <div className="grid grid-3" style={{ gap: 16 }}>
              <StatCard label={t("pricingRuleCount") || "Rules"} value={formatNumber(summary.total, localeForDisplay)} trend={summary.total} icon="📦" color="primary" />
              <StatCard label={t("pricingRuleActive") || "Active"} value={formatNumber(summary.active, localeForDisplay)} trend={summary.active} icon="⚡" color="success" />
              <StatCard label={t("pricingRuleGuardrail") || "Guardrail"} value={formatPercent(summary.guardrails, localeForDisplay)} trend={summary.guardrails} icon="🛡️" color="warning" />
            </div>
          </Card>

          <div className="grid grid-2" style={{ gap: 24 }}>
            <Card>
              <CardHeader
                title={t("pricingRuleFormTitle") || "Create pricing rule"}
                subtitle={t("pricingRuleFormSubtitle") || "Define guardrails, markups, or competitor logic"}
                icon="🧮"
              />
              <form
                ref={formRef}
                id="pricing-rule-form"
                onSubmit={handleSubmit}
                style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}
              >
                <Input
                  label={t("pricingRuleName") || "Rule name"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("pricingRuleNamePlaceholder") || "Ex: Weekend surge guardrail"}
                />

                <Select
                  label={t("pricingRuleType") || "Rule type"}
                  value={form.ruleType}
                  onChange={(e) => setForm({ ...form, ruleType: e.target.value as RuleType })}
                  options={RULE_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) || opt.value }))}
                  hint={t("pricingRuleTypeHint") || "Choose how pricing should be recalculated"}
                />

                {form.ruleType === "PERCENTAGE_MARKUP" && (
                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <Input
                      label={t("pricingRuleMinMargin") || "Min margin %"}
                      type="number"
                      value={form.minMarginPercent}
                      onChange={(e) => setForm({ ...form, minMarginPercent: Number(e.target.value) })}
                    />
                    <Input
                      label={t("pricingRuleMaxMargin") || "Max margin %"}
                      type="number"
                      value={form.maxMarginPercent}
                      onChange={(e) => setForm({ ...form, maxMarginPercent: Number(e.target.value) })}
                    />
                  </div>
                )}

                {form.ruleType === "FIXED_MARGIN" && (
                  <Input
                    label={t("pricingRuleFixedMarkup") || "Fixed markup (¥)"}
                    type="number"
                    value={form.fixedMarkupAmount}
                    onChange={(e) => setForm({ ...form, fixedMarkupAmount: Number(e.target.value) })}
                  />
                )}

                <Input
                  label={t("pricingRulePriority") || "Priority"}
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  hint={t("pricingRulePriorityHint") || "Lower numbers execute first"}
                />

                <Input
                  label={t("pricingRuleCategories") || "Categories"}
                  value={form.categories}
                  onChange={(e) => setForm({ ...form, categories: e.target.value })}
                  placeholder={t("pricingRuleCategoriesPlaceholder") || "Electronics, Beauty"}
                  hint={t("pricingRuleCategoriesHint") || "Comma separated labels help teammates filter"}
                />

                <Button type="submit" disabled={saving}>
                  {saving ? t("saving") || "Saving" : t("pricingRuleCreate") || "Create rule"}
                </Button>
              </form>
            </Card>

            <Card>
              <CardHeader
                title={t("pricingRuleListTitle") || "Automation library"}
                subtitle={
                  ruleSearch
                    ?
                      t("pricingRuleFilteredSubtitle", {
                        count: filteredRules.length,
                        countDisplay: formatNumber(filteredRules.length, localeForDisplay)
                      }) ||
                      `${formatNumber(filteredRules.length, localeForDisplay)} filtered rule(s)`
                    : t("pricingRuleListSubtitle") || "Active rules with priorities"
                }
                icon="🗂️"
              />
              {filteredRules.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <EmptyState
                    icon="🤖"
                    title={t("pricingRuleEmpty") || "No rules yet"}
                    description={
                      ruleSearch
                        ? t("pricingRuleSearchEmpty") || "No rules match your filters."
                        : t("pricingRuleEmptyDescription") || "Create your first automation to keep prices on target."
                    }
                    action={
                      <Button type="button" onClick={scrollToForm}>
                        ➕ {t("pricingRuleCreate") || "Create rule"}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  {filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        background: "var(--color-surface)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <h3 style={{ margin: 0 }}>{rule.name}</h3>
                          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
                            {t(`pricingRuleTypeLabel.${rule.ruleType}`)} • {t("priority") || "Priority"}: {rule.priority}
                          </p>
                        </div>
                        <Badge variant={rule.isActive ? "success" : "warning"}>
                          {rule.isActive ? t("pricingRuleStatusActive") : t("pricingRuleStatusPaused")}
                        </Badge>
                      </div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                        {rule.fixedMarkupAmount && (
                          <Badge variant="info">{t("pricingRuleFixedMarkupShort", { value: rule.fixedMarkupAmount })}</Badge>
                        )}
                        {rule.minMarginPercent && (
                          <Badge variant="info">{t("pricingRuleMinMarginShort", { value: rule.minMarginPercent })}</Badge>
                        )}
                        {rule.applyToCategories.length > 0 ? (
                          <Badge variant="default">{t("pricingRuleScope", { value: rule.applyToCategories.join(", ") })}</Badge>
                        ) : (
                          <Badge variant="default">{t("pricingRuleNoCategories") || "All categories"}</Badge>
                        )}
                        <Badge variant="info">{rule.scheduleLabel}</Badge>
                      </div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <Button type="button" variant="ghost" size="sm" onClick={() => toggleRule(rule.id)}>
                          {rule.isActive ? t("pricingRulePause") : t("pricingRuleResume")}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
                          {t("pricingRuleDelete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
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
