import { useEffect, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../../components/AppNav";
import api from "../../lib/apiClient";
import { pushToast } from "../../components/Toast";

type AuditLog = {
  id: string;
  action: string;
  detail: Record<string, any> | null;
  createdAt: string;
  user: { email: string };
};

export default function AdminAuditPage() {
  const { t } = useTranslation("common");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/admin/audit")
      .then((res) => setLogs(res.data))
      .catch((e: any) => pushToast(e?.response?.data?.error ?? t("genericError"), "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <AppNav activeHref="/admin/users" />
      <div className="card">
        <h1>{t("adminAuditTitle")}</h1>
        <p>{t("adminAuditDesc")}</p>
      </div>
      <div className="card">
        {loading && <p>{t("loading")}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>{t("userLabel")}</th>
              <th>{t("actionLabel")}</th>
              <th>{t("detailLabel")}</th>
              <th>{t("timeLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.user?.email ?? "-"}</td>
                <td>{log.action}</td>
                <td>
                  <code>{log.detail ? JSON.stringify(log.detail) : "-"}</code>
                </td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
