import { FormEvent, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import { Card, CardHeader, StatCard, Button, Alert, Badge } from "../components/ui/index";
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

const SAMPLE_RULES: PricingRule[] = [
  {
    id: "rule-fixed-margin",
    name: "Top sellers +¥900 markup",
    ruleType: "FIXED_MARGIN" as const,
    fixedMarkupAmount: 900,
    minMarginPercent: null,
    maxMarginPercent: null,
    priority: 10,
    isActive: true,
    applyToCategories: ["Electronics", "Home"],
    scheduleLabel: "Always on"
  },
  {
    id: "rule-percentage",
    name: "New listings 18% margin",
    ruleType: "PERCENTAGE_MARKUP" as const,
    fixedMarkupAmount: null,
    minMarginPercent: 18,
    maxMarginPercent: 25,
    priority: 25,
    isActive: true,
    applyToCategories: ["Beauty"],
    scheduleLabel: "Weekdays"
  },
  {
    id: "rule-competitor",
    name: "Competitor match -1%",
    ruleType: "COMPETITOR_MATCH" as const,
    fixedMarkupAmount: null,
    minMarginPercent: null,
    maxMarginPercent: null,
    priority: 40,
    isActive: false,
    applyToCategories: ["Toys"],
    scheduleLabel: "Flash sales"
  }
];

const RULE_TYPE_OPTIONS: { labelKey: string; value: RuleType; descriptionKey: string }[] = [
  { labelKey: "pricingRuleTypeFixed", value: "FIXED_MARGIN", descriptionKey: "pricingRuleTypeFixedDesc" },
  { labelKey: "pricingRuleTypePercent", value: "PERCENTAGE_MARKUP", descriptionKey: "pricingRuleTypePercentDesc" },
  { labelKey: "pricingRuleTypeCompetitor", value: "COMPETITOR_MATCH", descriptionKey: "pricingRuleTypeCompetitorDesc" },
  { labelKey: "pricingRuleTypeDynamic", value: "DYNAMIC_REPRICING", descriptionKey: "pricingRuleTypeDynamicDesc" }
];

export default function PricingPage() {
  const { t } = useTranslation("common");
  const [rules, setRules] = useState<PricingRule[]>(SAMPLE_RULES);
  const [saving, setSaving] = useState(false);
  const [usingSampleData] = useState(true);
  const [form, setForm] = useState({
    name: "",
    ruleType: "PERCENTAGE_MARKUP" as RuleType,
    minMarginPercent: 15,
    maxMarginPercent: 25,
    fixedMarkupAmount: 500,
    priority: 50,
    categories: ""
  });

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
    <div className="shell">
      <AppNav activeHref="/pricing" />
      <Toast />
      <div className="container">
        <div
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.12) 100%)",
            borderRadius: "var(--radius-xl)",
            padding: "40px",
            marginBottom: "32px",
            border: "1px solid var(--color-border)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 42, margin: 0, fontWeight: 900 }}>
              💹 {t("pricingHeroTitle")}
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: 16, margin: 0 }}>
              {t("pricingHeroSubtitle")}
            </p>
          </div>
        </div>

        {usingSampleData && (
          <Alert variant="info" title={t("pricingRuleSampleNotice")}
            >
            {t("pricingSampleDataNotice")}
          </Alert>
        )}

        <div className="grid grid-3" style={{ marginBottom: 32 }}>
          <StatCard label={t("pricingRuleCount")}
            value={summary.total}
            trend={summary.total}
            icon="📦"
            color="primary"
          />
          <StatCard label={t("pricingRuleActive")}
            value={summary.active}
            trend={summary.active}
            icon="⚡"
            color="success"
          />
          <StatCard label={t("pricingRuleGuardrail")}
            value={`${summary.guardrails}%`}
            trend={summary.guardrails}
            icon="🛡️"
            color="warning"
          />
        </div>

        <div className="grid grid-2" style={{ gap: 24 }}>
          <Card>
            <CardHeader
              title={t("pricingRuleFormTitle")}
              subtitle={t("pricingRuleFormSubtitle")}
              icon="🧮"
            />
            <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">{t("pricingRuleName")}</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("pricingRuleNamePlaceholder")}
                />
              </div>

              <div>
                <label className="label">{t("pricingRuleType")}</label>
                <select
                  className="select"
                  value={form.ruleType}
                  onChange={(e) => setForm({ ...form, ruleType: e.target.value as RuleType })}
                >
                  {RULE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {form.ruleType === "PERCENTAGE_MARKUP" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="label">{t("pricingRuleMinMargin")}</label>
                    <input
                      className="input"
                      type="number"
                      value={form.minMarginPercent}
                      onChange={(e) => setForm({ ...form, minMarginPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label">{t("pricingRuleMaxMargin")}</label>
                    <input
                      className="input"
                      type="number"
                      value={form.maxMarginPercent}
                      onChange={(e) => setForm({ ...form, maxMarginPercent: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {form.ruleType === "FIXED_MARGIN" && (
                <div>
                  <label className="label">{t("pricingRuleFixedMarkup")}</label>
                  <input
                    className="input"
                    type="number"
                    value={form.fixedMarkupAmount}
                    onChange={(e) => setForm({ ...form, fixedMarkupAmount: Number(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <label className="label">{t("pricingRulePriority")}</label>
                <input
                  className="input"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="label">{t("pricingRuleCategories")}</label>
                <input
                  className="input"
                  value={form.categories}
                  onChange={(e) => setForm({ ...form, categories: e.target.value })}
                  placeholder={t("pricingRuleCategoriesPlaceholder")}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? t("saving") : t("pricingRuleCreate")}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader
              title={t("pricingRuleListTitle")}
              subtitle={t("pricingRuleListSubtitle")}
              icon="🗂️"
            />
            {rules.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
                {t("pricingRuleEmpty")}
              </div>
            ) : (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      background: "var(--color-surface)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{rule.name}</h3>
                        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                          {t(`pricingRuleTypeLabel.${rule.ruleType}`)} • {t("priority")}: {rule.priority}
                        </p>
                      </div>
                      <Badge variant={rule.isActive ? "success" : "warning"}>
                        {rule.isActive ? t("pricingRuleStatusActive") : t("pricingRuleStatusPaused")}
                      </Badge>
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
                      {rule.fixedMarkupAmount && (
                        <span>{t("pricingRuleFixedMarkupShort", { value: rule.fixedMarkupAmount })}</span>
                      )}
                      {rule.minMarginPercent && (
                        <span>{t("pricingRuleMinMarginShort", { value: rule.minMarginPercent })}</span>
                      )}
                      {rule.applyToCategories.length > 0 && (
                        <span>{t("pricingRuleScope", { value: rule.applyToCategories.join(", ") })}</span>
                      )}
                      <span>{rule.scheduleLabel}</span>
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <Button variant="ghost" size="sm" onClick={() => toggleRule(rule.id)}>
                        {rule.isActive ? t("pricingRulePause") : t("pricingRuleResume")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
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
