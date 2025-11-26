import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useTranslation } from "next-i18next";
import ShopSelector from "./ShopSelector";
import ShopeeConnector from "./ShopeeConnector";
import api from "../lib/apiClient";
import { pushToast } from "./Toast";

type Shop = { id: string; name: string };

type Settings = {
  includeAmazonPoints: boolean;
  includeDomesticShipping: boolean;
  domesticShippingCost: number;
  maxShippingDays: number;
  minExpectedProfit: number;
  shopIds: string[];
  isActive: boolean;
  isDryRun: boolean;
  reviewBandPercent: number;
  overrides: Override[];
};

type Override = {
  shopId: string;
  maxShippingDays?: number;
  minExpectedProfit?: number;
  includeAmazonPoints?: boolean;
  includeDomesticShipping?: boolean;
  domesticShippingCost?: number;
};

export default function SettingsForm() {
  const { t } = useTranslation("common");
  const [shops, setShops] = useState<Shop[]>([]);
  const [settings, setSettings] = useState<Settings>({
    includeAmazonPoints: false,
    includeDomesticShipping: false,
    domesticShippingCost: 0,
    maxShippingDays: 7,
    minExpectedProfit: 0,
    shopIds: [],
    isActive: false,
    isDryRun: false,
    reviewBandPercent: 0,
    overrides: []
  });
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [amazonEmail, setAmazonEmail] = useState("");
  const [amazonPassword, setAmazonPassword] = useState("");
  const [credentialStatus, setCredentialStatus] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAmazon, setSavingAmazon] = useState(false);

  const refreshShopsAndSettings = () => {
    api.get("/api/shops").then((res) => setShops(res.data));
    api.get("/api/settings").then((res) => {
      if (res.data) {
        setSettings({
          includeAmazonPoints: res.data.includeAmazonPoints ?? false,
          includeDomesticShipping: res.data.includeDomesticShipping ?? false,
          domesticShippingCost: res.data.domesticShippingCost ?? 0,
          maxShippingDays: res.data.maxShippingDays,
          minExpectedProfit: res.data.minExpectedProfit,
          shopIds: (res.data.shopSelections ?? []).filter((s: any) => s?.isSelected).map((s: any) => s.shopId),
          isActive: res.data.isActive,
          isDryRun: res.data.isDryRun ?? false,
          reviewBandPercent: res.data.reviewBandPercent ?? 0,
          overrides: res.data.shopOverrides ?? []
        });
      }
    });
    api.get("/api/credentials/amazon").then((res) => {
      if (res.data?.email) setAmazonEmail(res.data.email);
    });
  };

  useEffect(() => {
    refreshShopsAndSettings();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    const errs: string[] = [];
    if (shops.length && settings.shopIds.length === 0) {
      errs.push(t("shopSelection"));
    }
    if (settings.maxShippingDays <= 0) {
      errs.push(t("maxShippingDays"));
    }
    if (settings.minExpectedProfit === undefined || settings.minExpectedProfit === null || Number.isNaN(settings.minExpectedProfit)) {
      errs.push(t("minProfit"));
    }
    if (errs.length) {
      setFormErrors(errs);
      pushToast(t("fieldRequired"), "error");
      return;
    }
    setFormErrors([]);
    setSavingSettings(true);
    try {
      await api.post("/api/settings", settings);
      setMessage(t("saved"));
      pushToast(t("settingsSaveSuccess"));
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t("settingsSaveError");
      setMessage(msg);
      pushToast(msg, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveAmazonCredentials = async () => {
    setSavingAmazon(true);
    try {
      await api.post("/api/credentials/amazon", { email: amazonEmail, password: amazonPassword });
      setAmazonPassword("");
      setCredentialStatus(t("saved"));
      pushToast(t("credentialsSaveSuccess"));
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t("credentialsSaveError");
      setCredentialStatus(msg);
      pushToast(msg, "error");
    } finally {
      setSavingAmazon(false);
    }
  };

  const toggleShop = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      shopIds: prev.shopIds.includes(id)
        ? prev.shopIds.filter((s) => s !== id)
        : [...prev.shopIds, id]
    }));
  };

  const upsertOverride = (overrides: Override[], patch: Partial<Override> & { shopId: string }) => {
    const existing = overrides.find((o) => o.shopId === patch.shopId);
    if (existing) {
      return overrides.map((o) => (o.shopId === patch.shopId ? { ...o, ...patch } : o));
    }
    return [...overrides, patch];
  };

  return (
    <>
    <form onSubmit={onSubmit}>
      <div className="card">
        <h3>① {t("autoOrdering")}</h3>
        <p>{t("autoOrderingDesc")}</p>
        <label>
          <input
            type="checkbox"
            checked={settings.isActive}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSettings({ ...settings, isActive: e.currentTarget.checked })
            }
          />{" "}
          {settings.isActive ? t("on") : t("off")}
        </label>
      </div>

      <div className="card">
        <h3>③ {t("includePoints")}</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.includeAmazonPoints}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSettings({ ...settings, includeAmazonPoints: e.currentTarget.checked })
            }
          />{" "}
          {t("includePointsLabel")}
        </label>
      </div>

      <div className="card">
        <h3>④ {t("includeDomestic")}</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.includeDomesticShipping}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSettings({ ...settings, includeDomesticShipping: e.target.checked })
            }
          />{" "}
          {t("includeDomesticLabel")}
        </label>
        <input
          className="input"
          type="number"
          value={settings.domesticShippingCost}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSettings({ ...settings, domesticShippingCost: Number(e.currentTarget.value) })
          }
          placeholder={t("domesticShippingCost")}
        />
      </div>

      <div className="card">
        <h3>⑤ {t("maxShippingDays")}</h3>
        <input
          className="input"
          type="number"
          value={settings.maxShippingDays}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSettings({ ...settings, maxShippingDays: Number(e.currentTarget.value) })
          }
        />
      </div>

      <div className="card">
        <h3>⑥ {t("minProfit")}</h3>
        <input
          className="input"
          type="number"
          value={settings.minExpectedProfit}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSettings({ ...settings, minExpectedProfit: Number(e.currentTarget.value) })
          }
        />
      </div>

      <div className="card">
        <h3>{t("dryRun")}</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.isDryRun}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSettings({ ...settings, isDryRun: e.currentTarget.checked })
            }
          />{" "}
          {t("dryRunDesc")}
        </label>
      </div>

      <div className="card">
        <h3>{t("reviewBand")}</h3>
        <p style={{ color: "#475569" }}>{t("reviewBandDesc")}</p>
        <input
          className="input"
          type="number"
          min={0}
          max={100}
          value={settings.reviewBandPercent}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSettings({ ...settings, reviewBandPercent: Number(e.currentTarget.value) })
          }
        />
      </div>

      <div className="card">
        <h3>⑦ {t("shopSelection")}</h3>
        <ShopSelector shops={shops} selected={settings.shopIds} onToggle={toggleShop} />
      </div>

      <div className="card">
        <h3>{t("shopOverrides")}</h3>
        <p style={{ color: "#475569" }}>{t("shopOverridesDesc")}</p>
        {shops.map((shop) => {
          const override = settings.overrides.find((o) => o.shopId === shop.id);
          return (
            <div key={shop.id} style={{ marginBottom: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <strong>{shop.name}</strong>
              <div className="grid grid-3">
                <input
                  className="input"
                  placeholder={t("maxShippingDays")}
                  type="number"
                  value={override?.maxShippingDays ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      overrides: upsertOverride(prev.overrides, {
                        shopId: shop.id,
                        maxShippingDays: e.currentTarget.value ? Number(e.currentTarget.value) : undefined
                      })
                    }))
                  }
                />
                <input
                  className="input"
                  placeholder={t("minProfit")}
                  type="number"
                  value={override?.minExpectedProfit ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      overrides: upsertOverride(prev.overrides, {
                        shopId: shop.id,
                        minExpectedProfit: e.currentTarget.value ? Number(e.currentTarget.value) : undefined
                      })
                    }))
                  }
                />
                <input
                  className="input"
                  placeholder={t("domesticShippingCost")}
                  type="number"
                  value={override?.domesticShippingCost ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      overrides: upsertOverride(prev.overrides, {
                        shopId: shop.id,
                        domesticShippingCost: e.currentTarget.value
                          ? Number(e.currentTarget.value)
                          : undefined
                      })
                    }))
                  }
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={override?.includeAmazonPoints ?? settings.includeAmazonPoints}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      overrides: upsertOverride(prev.overrides, {
                        shopId: shop.id,
                        includeAmazonPoints: e.currentTarget.checked
                      })
                    }))
                  }
                />{" "}
                {t("includePointsLabel")}
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={override?.includeDomesticShipping ?? settings.includeDomesticShipping}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings((prev) => ({
                      ...prev,
                      overrides: upsertOverride(prev.overrides, {
                        shopId: shop.id,
                        includeDomesticShipping: e.currentTarget.checked
                      })
                    }))
                  }
                />{" "}
                {t("includeDomesticLabel")}
              </label>
            </div>
          );
        })}
      </div>

      <button className="button" type="submit">
        {savingSettings ? t("loading") : t("saveActivate")}
      </button>
      {message && <p>{message}</p>}
      {formErrors.length > 0 && (
        <ul style={{ color: "#b91c1c" }}>
          {formErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </form>

      <ShopeeConnector onConnected={refreshShopsAndSettings} />

      <div className="card" style={{ marginTop: "16px" }}>
        <h3>{t("amazonCredentials")}</h3>
        <input
          className="input"
          type="email"
          placeholder={t("amazonEmail")}
          value={amazonEmail}
          onChange={(e) => setAmazonEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder={t("amazonPassword")}
          value={amazonPassword}
          onChange={(e) => setAmazonPassword(e.target.value)}
          required
        />
        <button className="button" type="button" onClick={saveAmazonCredentials}>
          {savingAmazon ? t("loading") : t("saveCredentials")}
        </button>
        {credentialStatus && <p>{credentialStatus}</p>}
      </div>
    </>
  );
}
