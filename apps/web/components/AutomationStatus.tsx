import useSWR from "swr";
import api from "../lib/apiClient";
import { useTranslation } from "next-i18next";

type Settings = {
  isActive: boolean;
  isDryRun: boolean;
  includeAmazonPoints: boolean;
  includeDomesticShipping: boolean;
  maxShippingDays: number;
  minExpectedProfit: number;
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function AutomationStatus() {
  const { t } = useTranslation("common");
  const { data } = useSWR<Settings>("/api/settings", fetcher);
  const active = data?.isActive;
  const dry = data?.isDryRun;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t("automationStatusTitle")}</h3>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="pill" style={{ background: active ? "#bbf7d0" : "#fecdd3" }}>
          {active ? t("on") : t("off")}
        </span>
        <span className="pill" style={{ background: dry ? "#e0e7ff" : "#e2e8f0" }}>
          {dry ? t("pillDryRun") : t("pillLive")}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 12, color: "#475569", fontSize: 14 }}>
        <div>{t("profitRuleLabel", { value: data?.minExpectedProfit ?? "—" })}</div>
        <div>{t("maxShippingLabel", { value: data?.maxShippingDays ?? "—" })}</div>
        <div>
          {data?.includeAmazonPoints ? t("pointsIncluded") : t("pointsExcluded")} ·{" "}
          {data?.includeDomesticShipping ? t("domesticIncluded") : t("domesticExcluded")}
        </div>
      </div>
    </div>
  );
}
