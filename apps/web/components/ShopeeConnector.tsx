import { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "next-i18next";
import { pushToast } from "./Toast";

type Props = { onConnected?: () => void };

export default function ShopeeConnector({ onConnected }: Props) {
  const { t } = useTranslation("common");
  const [partnerId, setPartnerId] = useState("");
  const [partnerKey, setPartnerKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://partner.shopeemobile.com");
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    axios
      .get("/api/credentials/shopee", { headers })
      .then((res) => {
        if (res.data.partnerId) setPartnerId(res.data.partnerId);
        if (res.data.baseUrl) setBaseUrl(res.data.baseUrl);
      })
      .catch((e) => pushToast(e?.response?.data?.error ?? t("genericError"), "error"))
      .finally(() => setLoading(false));
  }, []);

  const saveShopee = async () => {
    const token = localStorage.getItem("token");
    setSaving(true);
    try {
      await axios.post(
        "/api/credentials/shopee",
        { partnerId, partnerKey, accessToken, baseUrl, shopId, shopName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPartnerKey("");
      setAccessToken("");
      setMessage(t("saved"));
      pushToast(t("shopeeSaveSuccess"));
      onConnected?.();
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t("shopeeSaveError");
      setMessage(msg);
      pushToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3>{t("connectShopee")}</h3>
      <input
        className="input"
        placeholder={t("partnerId")}
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
      />
      <input
        className="input"
        placeholder={t("partnerKey")}
        type="password"
        value={partnerKey}
        onChange={(e) => setPartnerKey(e.target.value)}
      />
      <input
        className="input"
        placeholder={t("accessToken")}
        type="password"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
      />
      <input
        className="input"
        placeholder={t("baseUrl")}
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
      />
      <input
        className="input"
        placeholder={t("shopId")}
        value={shopId}
        onChange={(e) => setShopId(e.target.value)}
      />
      <input
        className="input"
        placeholder={t("shopName")}
        value={shopName}
        onChange={(e) => setShopName(e.target.value)}
      />
      <button className="button" type="button" onClick={saveShopee}>
        {saving ? t("loading") : t("saveCredentials")}
      </button>
      {message && <p>{message}</p>}
      {loading && <p>{t("loading")}</p>}
    </div>
  );
}
