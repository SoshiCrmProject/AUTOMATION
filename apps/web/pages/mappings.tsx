import { useEffect, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import api from "../lib/apiClient";
import Toast, { pushToast } from "../components/Toast";
import {
  Card,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  EmptyState,
  LoadingSpinner,
  StatCard,
  Badge
} from "../components/ui/index";

type Mapping = {
  id: string;
  shopId: string;
  shopeeItemId: string;
  amazonProductUrl: string;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
};

type Shop = { id: string; name: string };

export default function MappingsPage() {
  const { t } = useTranslation("common");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [shopeeItemId, setShopeeItemId] = useState("");
  const [amazonProductUrl, setAmazonProductUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [shopsRes, mapRes] = await Promise.all([api.get("/api/shops"), api.get("/api/mappings")]);
      setShops(shopsRes.data || []);
      setMappings(mapRes.data || []);
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("genericError"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!shopId || !shopeeItemId || !amazonProductUrl) {
      pushToast(t("fieldRequired"), "error");
      return;
    }
    setSavingMapping(true);
    try {
      await api.post("/api/mappings", { shopId, shopeeItemId, amazonProductUrl, notes: notes || undefined });
      setShopId("");
      setShopeeItemId("");
      setAmazonProductUrl("");
      setNotes("");
      pushToast(t("mappingSaved"));
      await load();
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("genericError"), "error");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      pushToast(t("fieldRequired"), "error");
      return;
    }
    const rows = csvText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [shop, sItem, aUrl, note] = line.split(",");
        return { shopId: shop?.trim(), shopeeItemId: sItem?.trim(), amazonProductUrl: aUrl?.trim(), notes: note?.trim() || undefined };
      })
      .filter((row) => row.shopId && row.shopeeItemId && row.amazonProductUrl);

    if (rows.length === 0) {
      pushToast(t("csvNoValidRows"), "error");
      return;
    }

    setImporting(true);
    try {
      await api.post("/api/mappings/import", { rows });
      setCsvText("");
      await load();
      pushToast(t("csvRowsImported"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("genericError"), "error");
    } finally {
      setImporting(false);
    }
  };

  const filteredMappings = useMemo(
    () =>
      mappings.filter((m) => {
        const shopName = shops.find((s) => s.id === m.shopId)?.name || "";
        const term = filter.toLowerCase();
        const matchesText =
          m.shopeeItemId.toLowerCase().includes(term) ||
          m.amazonProductUrl.toLowerCase().includes(term) ||
          shopName.toLowerCase().includes(term);
        const matchesShop = shopFilter === "all" || m.shopId === shopFilter;
        return matchesText && matchesShop;
      }),
    [filter, mappings, shops, shopFilter]
  );

  const heroStats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter((m) => m.isActive).length;
    const uniqueShops = new Set(mappings.map((m) => m.shopId)).size;
    const lastCreatedTs = mappings.reduce((latest, mapping) => {
      if (!mapping.createdAt) return latest;
      const ts = new Date(mapping.createdAt).getTime();
      return ts > latest ? ts : latest;
    }, 0);

    return {
      total,
      active,
      inactive: Math.max(total - active, 0),
      uniqueShops,
      lastCreated: lastCreatedTs ? new Date(lastCreatedTs).toISOString() : null
    };
  }, [mappings]);

  const heroHighlights = useMemo(
    () => [
      {
        label: t("totalMappingsLabel") || "Total mappings",
        value: heroStats.total.toLocaleString(),
        helper: t("mappingsTotalHelper") || "Records synced across all shops"
      },
      {
        label: t("activeMappingsLabel") || "Active",
        value: heroStats.active.toLocaleString(),
        helper: t("mappingsActiveHelper") || "Eligible for automation"
      },
      {
        label: t("shopCoverageLabel") || "Shop coverage",
        value: shops.length ? `${heroStats.uniqueShops}/${shops.length}` : heroStats.uniqueShops.toString(),
        helper: t("mappingsCoverageHelper") || "Shops with at least one mapping"
      }
    ],
    [heroStats.active, heroStats.total, heroStats.uniqueShops, shops.length, t]
  );

  const heroBadge = (
    <Badge variant={heroStats.total > 0 ? "success" : "warning"} size="lg">
      {heroStats.total > 0
        ? `${heroStats.active}/${heroStats.total} ${t("mappingsActiveShort") || "active"}`
        : t("mappingsAwaitingSetup") || "Awaiting setup"}
    </Badge>
  );

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow: "var(--shadow-xs)"
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</p>
          <strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{stat.value}</strong>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{stat.helper}</span>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
      {heroStats.lastCreated
        ? `${t("lastMappingAdded") || "Last mapping added"}: ${new Date(heroStats.lastCreated).toLocaleString()}`
        : t("mappingsHeroFooter") || "Create a mapping to start syncing Shopee items."}
    </span>
  );

  const handleApplyTemplate = () => {
    if (!mappings.length) {
      pushToast(t("csvTemplateUnavailable") || "Add a mapping to export it", "warning");
      return;
    }

    const rows = mappings.slice(0, Math.min(10, mappings.length)).map((mapping) => {
      const safeNotes = (mapping.notes || "")
        .replace(/\r?\n/g, " ")
        .replace(/,/g, ";")
        .trim();
      return [mapping.shopId, mapping.shopeeItemId, mapping.amazonProductUrl, safeNotes].join(",");
    });

    const payload = ["shopId,shopeeItemId,amazonProductUrl,notes", ...rows].join("\n");
    setCsvText(payload);
    pushToast(t("csvTemplateApplied") || "Existing mappings copied", "success");
  };

  const toolbar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <div style={{ flex: "1 1 240px", minWidth: 220 }}>
        <Input
          label={t("searchMappings") || "Search mappings"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("search") || "Search"}
        />
      </div>
      <div style={{ flex: "1 1 200px", minWidth: 200 }}>
        <Select
          label={t("shopSelection") || "Shop"}
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          options={[{ value: "all", label: t("allShops") || "All shops" }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>
      <Button variant="ghost" onClick={() => { setFilter(""); setShopFilter("all"); }}>
        {t("clearFilters") || "Clear filters"}
      </Button>
    </div>
  );

  const actions = (
    <Button variant="ghost" onClick={load} loading={loading}>
      {t("refreshData") || "Refresh data"}
    </Button>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader
          title={t("bulkImportTips") || "Bulk import tips"}
          subtitle={t("bulkImportHint") || "Paste CSV rows with shop, Shopee ID, and Amazon URL"}
          icon="💡"
        />
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 13 }}>
          {[t("csvTipHeaders") || "Skip headers and keep columns comma-separated.", t("csvTipValidation") || "Only valid rows will be imported.", t("csvTipNotes") || "Trailing text fills the optional notes field."].map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button size="sm" onClick={handleApplyTemplate}>
            {t("copyExistingMappings") || "Copy existing mappings"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCsvText("")}>
            {t("clearForm") || "Clear"}
          </Button>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader
          title={t("mappingStatus") || "Mapping status"}
          subtitle={t("mappingStatusSubtitle") || "Snapshot across your catalog"}
          icon="📊"
        />
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{t("activeMappingsLabel") || "Active"}</span>
            <strong>{heroStats.active.toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{t("inactiveMappings") || "Inactive"}</span>
            <strong>{heroStats.inactive.toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{t("shopCoverageLabel") || "Shop coverage"}</span>
            <strong>{shops.length ? `${heroStats.uniqueShops}/${shops.length}` : heroStats.uniqueShops.toString()}</strong>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/mappings"
        title={`🔗 ${t("mappingsTitle")}`}
        description={t("mappingsDescFull")}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, rgba(191,219,254,0.6) 0%, rgba(224,242,254,0.8) 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card>
            <CardHeader
              title={t("mappingPulse") || "Catalog pulse"}
              subtitle={t("mappingPulseSubtitle") || "Live view of mapping readiness"}
              icon="📈"
            />
            <div className="grid grid-3" style={{ gap: 16 }}>
              <StatCard icon="🔗" label={t("totalMappingsLabel") || "Total mappings"} value={heroStats.total.toLocaleString()} color="primary" />
              <StatCard icon="⚡" label={t("activeMappingsLabel") || "Active"} value={heroStats.active.toLocaleString()} color="success" />
              <StatCard
                icon="🏬"
                label={t("shopCoverageLabel") || "Shop coverage"}
                value={shops.length ? `${heroStats.uniqueShops}/${shops.length}` : heroStats.uniqueShops.toString()}
                color="info"
              />
            </div>
          </Card>

          <div className="grid grid-2" style={{ gap: 24 }}>
            <Card>
              <CardHeader
                title={t("mappingFormTitle")}
                subtitle={t("mappingFormSubtitle")}
                icon="🛠️"
              />
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <Select
                  label={t("shopSelection")}
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  options={[{ value: "", label: t("selectPlaceholder") }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                />
                <Input
                  label={t("shopeeItemId")}
                  value={shopeeItemId}
                  onChange={(e) => setShopeeItemId(e.target.value)}
                  placeholder="12345678"
                />
                <Input
                  label={t("amazonProduct")}
                  value={amazonProductUrl}
                  onChange={(e) => setAmazonProductUrl(e.target.value)}
                  placeholder="https://www.amazon.co.jp/dp/B0XXXXXXX"
                />
                <Textarea
                  label={t("notes") || "Notes"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button onClick={create} loading={savingMapping} fullWidth>
                  {t("saveMappingBtn")}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader
                title={t("bulkImportHint")}
                subtitle={t("csvPlaceholder")}
                icon="📥"
              />
              <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={t("csvPlaceholder")}
                  label={t("bulkImportHint")}
                />
                <Button variant="ghost" onClick={handleImport} loading={importing}>
                  {t("importCsvBtn")}
                </Button>
                <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-muted)", fontSize: 14 }}>
                  <li>{t("bulkImportHint")}</li>
                  <li>{t("searchMappings")}</li>
                </ul>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={t("mappingTableTitle")}
              subtitle={t("mappingTableSubtitle")}
              icon="📋"
            />
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {loading ? (
                <LoadingSpinner text={t("loading") ?? "Loading"} />
              ) : filteredMappings.length === 0 ? (
                <EmptyState
                  icon="🗂️"
                  title={t("noMappings") ?? "No mappings yet"}
                  description={t("noMappingsDesc")}
                  action={
                    <Button
                      onClick={() => {
                        setFilter("");
                        setShopFilter("all");
                      }}
                      variant="ghost"
                    >
                      {t("clearFilters") || t("clearForm") || "Clear"}
                    </Button>
                  }
                />
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>{t("shopSelection")}</th>
                        <th>{t("shopeeProduct")}</th>
                        <th>{t("amazonProduct")}</th>
                        <th>{t("status") || "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMappings.map((m) => (
                        <tr key={m.id}>
                          <td>{shops.find((s) => s.id === m.shopId)?.name ?? m.shopId}</td>
                          <td>{m.shopeeItemId}</td>
                          <td>
                            <a href={m.amazonProductUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                              {m.amazonProductUrl}
                            </a>
                            {m.notes ? <div style={{ color: "#475569", fontSize: 12 }}>{m.notes}</div> : null}
                          </td>
                          <td>{m.isActive ? t("on") : t("off")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
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
