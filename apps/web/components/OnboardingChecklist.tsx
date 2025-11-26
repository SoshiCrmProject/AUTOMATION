import useSWR from "swr";
import Link from "next/link";
import api from "../lib/apiClient";
import { useTranslation } from "next-i18next";

type ShopeeCred = { partnerId: string | null; hasSecrets: boolean | null };
type AmazonCred = { email: string | null; hasPassword: boolean | null };
type Settings = { isActive: boolean | null };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function OnboardingChecklist() {
  const { t } = useTranslation("common");
  const { data: shopee, error: shopeeError } = useSWR<ShopeeCred>("/api/credentials/shopee", fetcher);
  const { data: amazon, error: amazonError } = useSWR<AmazonCred>("/api/credentials/amazon", fetcher);
  const { data: settings, error: settingsError } = useSWR<Settings>("/api/settings", fetcher);

  const steps = [
    {
      label: t("onboardingStepConnectShopee"),
      done: Boolean(shopee?.partnerId && shopee?.hasSecrets),
      link: "/settings"
    },
    {
      label: t("onboardingStepConnectAmazon"),
      done: Boolean(amazon?.hasPassword),
      link: "/settings"
    },
    {
      label: t("onboardingStepSetRules"),
      done: settings !== undefined,
      link: "/settings"
    },
    {
      label: t("onboardingStepActivate"),
      done: Boolean(settings?.isActive),
      link: "/settings"
    }
  ];

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t("onboardingChecklistTitle")}</h3>
      {!shopee && !amazon && !settings && !(shopeeError || amazonError || settingsError) && <p>{t("loading")}</p>}
      {(shopeeError || amazonError || settingsError) && (
        <p style={{ color: "#ef4444" }}>{t("genericError")}</p>
      )}
      <div className="grid grid-2">
        {steps.map((step) => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill" style={{ background: step.done ? "#bbf7d0" : "#e2e8f0" }}>
              {step.done ? "✓" : "•"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{step.label}</div>
              {!step.done && (
                <Link className="btn btn-ghost" href={step.link} style={{ padding: "6px 10px", fontSize: 13 }}>
                  {t("go")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
