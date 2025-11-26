import { useEffect, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../../components/AppNav";
import api from "../../lib/apiClient";
import { pushToast } from "../../components/Toast";

type AdminUser = { id: string; email: string; role: string; isActive: boolean; createdAt: string };

export default function AdminUsersPage() {
  const { t } = useTranslation("common");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/users");
      setUsers(res.data);
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("genericError"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string) => {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/admin/users/${id}/toggle`);
      pushToast(t("adminToggleSuccess"));
      load();
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("adminToggleError"), "error");
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const reset = async (id: string) => {
    if (!newPassword) return;
    setResetting((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/admin/users/${id}/reset-password`, { password: newPassword });
      setNewPassword("");
      pushToast(t("passwordReset"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("adminResetError"), "error");
    } finally {
      setResetting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="container">
      <AppNav activeHref="/admin/users" />
      <div className="card">
        <h1>{t("adminUsersTitle")}</h1>
        <p>{t("adminUsersDesc")}</p>
      </div>
      <div className="card">
        {loading && <p>{t("loading")}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>{t("adminEmail")}</th>
              <th>{t("adminRole")}</th>
              <th>{t("adminStatus")}</th>
              <th>{t("adminActions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? t("active") : t("inactive")}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => toggle(u.id)}
                    style={{ marginRight: 8 }}
                    disabled={toggling.has(u.id)}
                  >
                    {toggling.has(u.id) ? t("loading") : u.isActive ? t("deactivate") : t("activate")}
                  </button>
                  <input
                    className="input"
                    style={{ width: 160, display: "inline-block", marginRight: 8 }}
                    placeholder={t("newPassword")}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button className="button" onClick={() => reset(u.id)} disabled={resetting.has(u.id)}>
                    {resetting.has(u.id) ? t("loading") : t("reset")}
                  </button>
                </td>
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
