import { useEffect, useMemo, useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import api from "../lib/apiClient";
import { pushToast } from "../components/Toast";

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
  const [message, setMessage] = useState("");
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
    setMessage("");
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
      setMessage(t("mappingSaved"));
      pushToast(t("mappingSaved"));
      load();
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("genericError"), "error");
    } finally {
      setSavingMapping(false);
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
    <div className="container">
      <AppNav activeHref="/mappings" />
      <div className="card">
        <h1>{t("mappingsTitle")}</h1>
        <p style={{ color: "#475569" }}>{t("mappingsDescFull")}</p>
        <div className="grid grid-3" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">{t("shopSelection")}</label>
            <select className="select" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">{t("selectPlaceholder")}</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("shopeeItemId")}</label>
            <input className="input" value={shopeeItemId} onChange={(e) => setShopeeItemId(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("amazonProduct")}</label>
            <input className="input" value={amazonProductUrl} onChange={(e) => setAmazonProductUrl(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-1" style={{ marginBottom: 12 }}>
          <label className="label">{t("notes") || "Notes"}</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn" onClick={create} disabled={savingMapping}>
          {savingMapping ? t("loading") : t("saveMappingBtn")}
        </button>
        {message && <p>{message}</p>}
      </div>
      <div className="card">
        <h3>{t("mappingsTitle")}</h3>
        {loading && <p>{t("loading")}</p>}
        <input
          className="input"
          placeholder={t("searchMappings") || "Search mappings..."}
          style={{ maxWidth: 300 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filteredMappings.length === 0 && !loading ? (
          <p>{t("noMappings") ?? "No mappings yet."}</p>
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
      <div className="card">
        <h3>{t("bulkImportHint")}</h3>
        <textarea
          className="input"
          style={{ minHeight: 120 }}
          placeholder={t("csvPlaceholder")}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <button
          className="btn btn-ghost"
          onClick={async () => {
            setImporting(true);
            try {
              const rows = csvText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [shop, sItem, aUrl, note] = line.split(",");
                  return { shopId: shop, shopeeItemId: sItem, amazonProductUrl: aUrl, notes: note };
                });
              await api.post("/api/mappings/import", { rows });
              setCsvText("");
              load();
              pushToast(t("mappingSaved"));
            } catch (e: any) {
              pushToast(e?.response?.data?.error ?? t("genericError"), "error");
            } finally {
              setImporting(false);
            }
          }}
          disabled={importing}
        >
          {importing ? t("loading") : t("importCsvBtn")}
        </button>
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
