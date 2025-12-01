import { useEffect, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../../components/PageLayout";
import api from "../../lib/apiClient";
import { pushToast } from "../../components/Toast";
import { Card, CardHeader, Button, Badge, Input, Select, LoadingSpinner, EmptyState } from "../../components/ui";

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
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/admin/audit")
      .then((res) => setLogs(res.data))
      .catch((e: any) => pushToast(e?.response?.data?.error ?? t("genericError"), "error"))
      .finally(() => setLoading(false));
  }, []);

  const actions = Array.from(new Set(logs.map((log) => log.action)));
  const now = Date.now();
  const last24h = logs.filter((log) => new Date(log.createdAt).getTime() > now - 24 * 60 * 60 * 1000).length;
  const uniqueActors = new Set(logs.map((log) => log.user?.email)).size;
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesSearch =
        log.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [logs, actionFilter, search]);

  const heroAside = (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
      }}
    >
      {[{
        label: t("adminEvents24h") || "Events (24h)",
        value: last24h,
        helper: t("adminEventsHint") || "Recent privileged changes"
      }, {
        label: t("uniqueActors") || "Unique actors",
        value: uniqueActors,
        helper: t("uniqueActorsHint") || "Distinct accounts"
      }, {
        label: t("actionsTracked") || "Actions tracked",
        value: actions.length,
        helper: t("actionsTrackedHint") || "Signals tracked"
      }].map((stat) => (
        <div key={stat.label} className="stat-card" style={{ padding: 20 }}>
          <p style={{ fontSize: 12, textTransform: "uppercase", color: "var(--color-text-light)", marginBottom: 6 }}>{stat.label}</p>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Input
        placeholder={t("searchAudit") || "Search actor or action"}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 0, minWidth: 220 }}
        icon={<span aria-hidden="true">🔍</span>}
      />
      <Select
        value={actionFilter}
        onChange={(event) => setActionFilter(event.target.value)}
        options={[{ value: "all", label: t("allActions") || "All actions" }, ...actions.map((action) => ({ value: action, label: action }))]}
        style={{ marginBottom: 0, minWidth: 200 }}
      />
      <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
        {t("refreshData") || "Refresh"}
      </Button>
    </div>
  );

  const heroBadge = (
    <Badge variant="info">
      {filteredLogs.length} {t("records") || "records"}
    </Badge>
  );

  return (
    <PageLayout
      activeHref="/admin/audit"
      title={t("adminAuditTitle")}
      description={t("adminAuditDesc") || "Every privileged update is mirrored here for compliance."}
      heroBadge={heroBadge}
      heroAside={heroAside}
      toolbar={toolbar}
      actions={<Button type="button" onClick={() => window.open("/api/admin/audit/export", "_blank")}>⬇️ {t("exportCsv") || "Export CSV"}</Button>}
      heroFooter={<span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{t("auditHeroFooter") || "Retention: 90 days. Export for long term storage."}</span>}
    >
      <Card hover={false}>
        <CardHeader
          title={t("auditTimeline") || "Audit timeline"}
          subtitle={t("auditTimelineDesc") || "Newest events first with JSON detail"}
          icon="🕒"
          action={<Badge variant="warning">{actions.length} {(t("actionsTracked") || "actions")}</Badge>}
        />
        {loading && <LoadingSpinner text={t("loading") || "Loading"} />}
        {!loading && filteredLogs.length === 0 && (
          <EmptyState
            icon="📭"
            title={t("noAuditResults") || "No events found"}
            description={t("noAuditDesc") || "Try clearing search filters to see more history."}
            action={<Button type="button" variant="ghost" onClick={() => { setSearch(""); setActionFilter("all"); }}>{t("resetFilters") || "Reset filters"}</Button>}
          />
        )}
        {!loading && filteredLogs.length > 0 && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("timeLabel")}</th>
                  <th>{t("userLabel")}</th>
                  <th>{t("actionLabel")}</th>
                  <th>{t("detailLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user?.email ?? "-"}</td>
                    <td>
                      <Badge variant="default">{log.action}</Badge>
                    </td>
                    <td>
                      <code style={{ fontSize: 12 }}>
                        {log.detail ? JSON.stringify(log.detail) : "-"}
                      </code>
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
