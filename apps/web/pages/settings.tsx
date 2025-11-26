import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import SettingsForm from "../components/SettingsForm";
import ConnectorStatus from "../components/ConnectorStatus";
import AppNav from "../components/AppNav";
import AutomationStatus from "../components/AutomationStatus";

export default function SettingsPage() {
  const { t } = useTranslation("common");
  return (
    <div className="container">
      <AppNav activeHref="/settings" />
      <h1>{t("autoShipping")}</h1>
      <div className="card" style={{ marginBottom: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <p style={{ marginTop: 0, color: "#0f172a", fontWeight: 700 }}>
          {t("instrNote")}
        </p>
        <ol style={{ color: "#475569", lineHeight: 1.5, paddingLeft: 18 }}>
          <li>{t("instr1")}</li>
          <li>{t("instr2")}</li>
          <li>{t("instr3")}</li>
          <li>{t("instr4")}</li>
          <li>{t("instr5")}</li>
          <li>{t("instr6")}</li>
          <li>{t("instr7")}</li>
          <li>{t("instr8")}</li>
        </ol>
        <p style={{ color: "#0f172a", fontWeight: 600 }}>{t("instrNote2")}</p>
      </div>
      <ConnectorStatus />
      <div style={{ marginTop: 12 }}>
        <AutomationStatus />
      </div>
      <SettingsForm />
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
