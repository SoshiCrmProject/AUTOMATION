import { useEffect, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../../components/PageLayout";
import api from "../../lib/apiClient";
import { pushToast } from "../../components/Toast";
import { Card, CardHeader, Button, Badge, Input, Select, LoadingSpinner, EmptyState } from "../../components/ui";

type AdminUser = { id: string; email: string; role: string; isActive: boolean; createdAt: string };

export default function AdminUsersPage() {
  const { t } = useTranslation("common");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === "admin").length;
  const roles = Array.from(new Set(users.map((u) => u.role)));

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesSearch = user.email.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const heroAside = (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
      }}
    >
      {[{
        label: t("totalUsers") || "Total users",
        value: totalUsers,
        helper: t("adminTotalHint") || "Provisioned seats"
      }, {
        label: t("active") || "Active",
        value: activeUsers,
        helper: t("adminActiveHint") || "Enabled accounts"
      }, {
        label: t("admins") || "Admins",
        value: adminUsers,
        helper: t("adminRoleHint") || "Full-access owners"
      }].map((stat) => (
        <div key={stat.label} className="stat-card" style={{ padding: 20 }}>
          <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-text-light)", marginBottom: 6 }}>
            {stat.label}
          </p>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Input
        placeholder={t("searchUsers") || "Search by email"}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 0, minWidth: 220 }}
        icon={<span role="img" aria-hidden="true">🔎</span>}
      />
      <Select
        value={roleFilter}
        onChange={(event) => setRoleFilter(event.target.value)}
        options={[{ value: "all", label: t("allRoles") || "All roles" }, ...roles.map((role) => ({ value: role, label: role }))]}
        style={{ marginBottom: 0, minWidth: 180 }}
      />
      <Button type="button" variant="ghost" onClick={load}>
        {t("refreshData") || "Refresh"}
      </Button>
    </div>
  );

  const sidebar = (
    <div>
      <Card hover={false}>
        <CardHeader title={t("adminQuickActions") || "Quick actions"} icon="⚡" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.open("mailto:support@automation", "_blank")}
          >
            {t("contactSupport") || "Contact support"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/admin/audit")}>📝 {t("adminAuditTitle")}</Button>
          <Button type="button" onClick={() => window.open("https://status.autoship", "_blank")}>📡 Status page</Button>
        </div>
      </Card>
    </div>
  );

  const heroBadge = (
    <Badge variant={activeUsers === totalUsers ? "success" : "warning"}>
      {activeUsers}/{totalUsers} {t("active") || "active"}
    </Badge>
  );

  const actions = (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button type="button" onClick={() => window.open("mailto:hr@automation")}>➕ {t("inviteUser") || "Invite user"}</Button>
      <Button type="button" variant="ghost" onClick={load}>🔄 {t("syncDirectory") || "Sync directory"}</Button>
    </div>
  );

  return (
    <PageLayout
      activeHref="/admin/users"
      title={t("adminUsersTitle")}
      description={t("adminUsersDesc") || "Manage privileged users, reset access, and monitor workspace controls."}
      heroBadge={heroBadge}
      heroAside={heroAside}
      actions={actions}
      toolbar={toolbar}
      sidebar={sidebar}
      heroFooter={<span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("adminHeroFooter") || "SCIM sync runs every hour. Use the quick actions to force refresh."}</span>}
    >
      <Card hover={false}>
        <CardHeader
          title={t("adminTableTitle") || "Workspace directory"}
          subtitle={t("adminTableSubtitle") || "Toggle access, reset passwords, and audit roles."}
          icon="👥"
          action={<Badge variant="info">{filteredUsers.length} {t("visible") || "visible"}</Badge>}
        />
        {loading && <LoadingSpinner text={t("loading") || "Loading"} />}
        {!loading && filteredUsers.length === 0 && (
          <EmptyState
            icon="🧐"
            title={t("noUsersFound") || "No users match your filters"}
            description={t("adjustFilters") || "Try clearing the search or selecting another role."}
            action={<Button type="button" variant="ghost" onClick={() => { setSearch(""); setRoleFilter("all"); }}>{t("resetFilters") || "Reset filters"}</Button>}
          />
        )}
        {!loading && filteredUsers.length > 0 && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("adminEmail")}</th>
                  <th>{t("adminRole")}</th>
                  <th>{t("adminStatus")}</th>
                  <th>{t("adminCreated") || "Created"}</th>
                  <th>{t("adminActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <Badge variant={user.role === "admin" ? "warning" : "default"}>{user.role}</Badge>
                    </td>
                    <td>
                      <Badge variant={user.isActive ? "success" : "error"}>{user.isActive ? t("active") : t("inactive")}</Badge>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(user.id)}
                        loading={toggling.has(user.id)}
                      >
                        {user.isActive ? t("deactivate") : t("activate")}
                      </Button>
                      <Input
                        type="password"
                        placeholder={t("newPassword") || "Temp password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        style={{ marginBottom: 0 }}
                        fullWidth={false}
                      />
                      <Button
                        size="sm"
                        onClick={() => reset(user.id)}
                        loading={resetting.has(user.id)}
                        disabled={!newPassword}
                      >
                        {t("reset")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageLayout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
