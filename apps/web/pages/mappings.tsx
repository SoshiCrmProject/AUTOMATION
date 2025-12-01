import { useEffect, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import api from "../lib/apiClient";
import Toast, { pushToast } from "../components/Toast";
import { Card, CardHeader, Button, Input, Textarea, Select, EmptyState, LoadingSpinner } from "../components/ui/index";

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
        return (
          m.shopeeItemId.toLowerCase().includes(term) ||
          m.amazonProductUrl.toLowerCase().includes(term) ||
          shopName.toLowerCase().includes(term)
        );
      }),
    [filter, mappings, shops]
  );

  return (
    <div className="shell">
      <AppNav activeHref="/mappings" />
      <Toast />
      <div className="container">
        <div
          className="page-section"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(59,130,246,0.12) 100%)",
            borderRadius: "var(--radius-xl)",
            padding: "36px",
            border: "1px solid var(--color-border)"
          }}
        >
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 800 }}>🔗 {t("mappingsTitle")}</h1>
          <p style={{ color: "var(--color-text-muted)", maxWidth: 720, marginTop: 12 }}>{t("mappingsDescFull")}</p>
        </div>

        <div className="grid grid-2" style={{ gap: 24, marginTop: 32 }}>
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

        <div style={{ marginTop: 32 }}>
        <Card>
          <CardHeader
            title={t("mappingTableTitle")}
            subtitle={t("mappingTableSubtitle")}
            icon="📋"
          />
          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("searchMappings") || "Search mappings..."}
              label={t("search")}
              fullWidth={false}
            />

            {loading ? (
              <LoadingSpinner text={t("loading") ?? "Loading"} />
            ) : filteredMappings.length === 0 ? (
              <EmptyState
                icon="🗂️"
                title={t("noMappings") ?? "No mappings yet"}
                description={t("noMappingsDesc")}
                action={
                  <Button onClick={() => setFilter("")} variant="ghost">
                    {t("clearForm")}
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
