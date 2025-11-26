import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import api from "../lib/apiClient";
import { pushToast } from "./Toast";
import InlineLanguageSwitcher from "./InlineLanguageSwitcher";


type Shop = { id: string; name: string };

export default function OnboardingModal() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopee, setShopee] = useState({
    partnerId: "",
    partnerKey: "",
    accessToken: "",
    baseUrl: "https://partner.shopeemobile.com",
    shopId: "",
    shopName: ""
  });
  const [amazon, setAmazon] = useState({ email: "", password: "" });
  const [settings, setSettings] = useState({
    includeAmazonPoints: false,
    includeDomesticShipping: false,
    domesticShippingCost: 0,
    maxShippingDays: 7,
    minExpectedProfit: 0,
    shopIds: [] as string[],
    isActive: true,
    isDryRun: false,
    reviewBandPercent: 0,
    overrides: [] as any[]
  });

  const steps = useMemo(
    () => [
      { title: t("onboardingModalStep1Title"), desc: t("onboardingModalStep1Desc"), type: "welcome" as const },
      { title: t("onboardingModalStep2Title"), desc: t("onboardingModalStep2Desc"), type: "shopee" as const },
      { title: t("onboardingModalStep3Title"), desc: t("onboardingModalStep3Desc"), type: "amazon" as const },
      { title: t("onboardingModalStep4Title"), desc: t("onboardingModalStep4Desc"), type: "settings" as const },
      { title: t("onboardingModalStep5Title"), desc: t("onboardingModalStep5Desc"), type: "done" as const }
    ],
    [t]
  );

  useEffect(() => {
    const load = async () => {
      if (typeof globalThis === "undefined" || !(globalThis as any).localStorage) return;
      const token = localStorage.getItem("token");
      const dismissed = localStorage.getItem("onboarding_dismissed") === "1";
      const path = router.pathname;
      // Do not show on auth pages or when logged out, or if user dismissed.
      if (!token || path.startsWith("/login") || path.startsWith("/signup") || dismissed) {
        setInitializing(false);
        setOpen(false);
        return;
      }
      try {
        const [shopsRes, shopeeRes, amazonRes, settingsRes] = await Promise.allSettled([
          api.get("/api/shops"),
          api.get("/api/credentials/shopee"),
          api.get("/api/credentials/amazon"),
          api.get("/api/settings")
        ]);
        if (shopsRes.status === "fulfilled") {
          setShops(shopsRes.value.data);
          const allIds = shopsRes.value.data.map((s: Shop) => s.id);
          setSettings((prev) => ({ ...prev, shopIds: allIds }));
        }
        if (shopeeRes.status === "fulfilled" && shopeeRes.value.data) {
          setShopee((prev) => ({
            ...prev,
            partnerId: shopeeRes.value.data.partnerId ?? "",
            baseUrl: shopeeRes.value.data.baseUrl ?? prev.baseUrl,
            shopId: shopeeRes.value.data.shopId ?? "",
            shopName: shopeeRes.value.data.shopName ?? ""
          }));
        }
        if (amazonRes.status === "fulfilled" && amazonRes.value.data?.email) {
          setAmazon((prev) => ({ ...prev, email: amazonRes.value.data.email }));
        }
        if (settingsRes.status === "fulfilled" && settingsRes.value.data) {
          const s = settingsRes.value.data;
          setSettings((prev) => ({
            ...prev,
            includeAmazonPoints: s.includeAmazonPoints,
            includeDomesticShipping: s.includeDomesticShipping,
            domesticShippingCost: s.domesticShippingCost ?? 0,
            maxShippingDays: s.maxShippingDays,
            minExpectedProfit: s.minExpectedProfit,
            shopIds: s.shopSelections?.filter((x: any) => x.isSelected).map((x: any) => x.shopId) ?? prev.shopIds,
            isActive: s.isActive,
            isDryRun: s.isDryRun ?? false,
            reviewBandPercent: s.reviewBandPercent ?? 0,
            overrides: s.shopOverrides ?? []
          }));
        }
        setOpen(true);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? t("genericError"));
      } finally {
        setInitializing(false);
      }
    };
    load();
  }, [t, router.pathname]);

  const close = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("onboarding_dismissed", "1");
    }
    setOpen(false);
  };

  const saveShopee = async () => {
    if (!shopee.partnerId || !shopee.partnerKey || !shopee.accessToken || !shopee.shopId) {
      setError(t("fieldRequired"));
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/credentials/shopee", shopee);
      pushToast(t("shopeeSaveSuccess"));
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t("shopeeSaveError");
      setError(msg);
      pushToast(msg, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAmazon = async () => {
    if (!amazon.email || !amazon.password) {
      setError(t("fieldRequired"));
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/credentials/amazon", amazon);
      setAmazon((prev) => ({ ...prev, password: "" }));
      pushToast(t("credentialsSaveSuccess"));
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t("credentialsSaveError");
      setError(msg);
      pushToast(msg, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.shopIds.length && shops.length) {
      setError(t("fieldRequired"));
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/settings", settings);
      pushToast(t("settingsSaveSuccess"));
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? t("settingsSaveError");
      setError(msg);
      pushToast(msg, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    setError("");
    const type = steps[step].type;
    if (type === "welcome" || type === "done") {
      if (step === steps.length - 1) {
        close();
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (type === "shopee") {
      const ok = await saveShopee();
      if (ok) setStep((s) => s + 1);
      return;
    }
    if (type === "amazon") {
      const ok = await saveAmazon();
      if (ok) setStep((s) => s + 1);
      return;
    }
    if (type === "settings") {
      const ok = await saveSettings();
      if (ok) {
        close();
      }
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  if (!open || initializing) return null;

  const current = steps[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 10000
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: "100%",
          padding: 28,
          position: "relative",
          background: "#fff",
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.25)"
        }}
      >
        <button
          onClick={close}
          aria-label={t("close")}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            border: "none",
            background: "transparent",
            fontSize: 20,
            cursor: "pointer",
            color: "#475569"
          }}
        >
          ×
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ margin: 0, color: "#0f172a", fontWeight: 700, letterSpacing: 0.5 }}>
            {t("onboardingModalTitle")}
          </p>
          <InlineLanguageSwitcher />
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {steps.map((_, idx) => (
              <span
                key={idx}
                className="pill"
                style={{
                  background: idx === step ? "#2563eb" : "#e2e8f0",
                  color: idx === step ? "#fff" : "#0f172a"
                }}
              >
                {idx + 1} / {steps.length}
              </span>
            ))}
          </div>
          <h3 id="onboarding-modal-title" style={{ margin: "8px 0", color: "#0f172a" }}>
            {current.title}
          </h3>
          <p style={{ color: "#475569", lineHeight: 1.5 }}>{current.desc}</p>
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}

          {current.type === "welcome" && (
            <div style={{ color: "#475569", lineHeight: 1.5 }}>
              <p>{t("onboardingModalWelcomeBlurb")}</p>
            </div>
          )}

          {current.type === "shopee" && (
            <div className="grid grid-2">
              <div>
                <label className="label">{t("partnerId")}</label>
                <input
                  className="input"
                  value={shopee.partnerId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, partnerId: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("partnerKey")}</label>
                <input
                  className="input"
                  type="password"
                  value={shopee.partnerKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, partnerKey: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("accessToken")}</label>
                <input
                  className="input"
                  type="password"
                  value={shopee.accessToken}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, accessToken: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("baseUrl")}</label>
                <input
                  className="input"
                  value={shopee.baseUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, baseUrl: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("shopId")}</label>
                <input
                  className="input"
                  value={shopee.shopId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, shopId: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("shopName")}</label>
                <input
                  className="input"
                  value={shopee.shopName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShopee({ ...shopee, shopName: e.currentTarget.value })
                  }
                />
              </div>
            </div>
          )}

          {current.type === "amazon" && (
            <div className="grid grid-2">
              <div>
                <label className="label">{t("amazonEmail")}</label>
                <input
                  className="input"
                  type="email"
                  value={amazon.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAmazon({ ...amazon, email: e.currentTarget.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("amazonPassword")}</label>
                <input
                  className="input"
                  type="password"
                  value={amazon.password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAmazon({ ...amazon, password: e.currentTarget.value })
                  }
                />
              </div>
            </div>
          )}

          {current.type === "settings" && (
            <div className="grid grid-2">
              <div>
                <label className="label">{t("maxShippingDays")}</label>
                <input
                  className="input"
                  type="number"
                  value={settings.maxShippingDays}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, maxShippingDays: Number(e.currentTarget.value) })
                  }
                />
              </div>
              <div>
                <label className="label">{t("minProfit")}</label>
                <input
                  className="input"
                  type="number"
                  value={settings.minExpectedProfit}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, minExpectedProfit: Number(e.currentTarget.value) })
                  }
                />
              </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.includeAmazonPoints}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, includeAmazonPoints: e.currentTarget.checked })
                    }
                  />
                  {t("includePointsLabel")}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.includeDomesticShipping}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSettings({
                        ...settings,
                        includeDomesticShipping: e.currentTarget.checked
                      })
                    }
                  />
                  {t("includeDomesticLabel")}
                </label>
              <div>
                <label className="label">{t("domesticShippingCost")}</label>
                <input
                  className="input"
                  type="number"
                  value={settings.domesticShippingCost}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, domesticShippingCost: Number(e.currentTarget.value) })
                  }
                />
              </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.isActive}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSettings({ ...settings, isActive: e.currentTarget.checked })
                    }
                  />
                  {t("autoShipping")}
                </label>
            </div>
          )}

          {current.type === "done" && (
            <div style={{ color: "#475569", lineHeight: 1.5 }}>
              <p>{t("onboardingModalCompleteDesc")}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={back} disabled={step === 0 || saving}>
              {t("prev")}
            </button>
            <button className="btn" onClick={handleNext} disabled={saving}>
              {saving ? t("loading") : step === steps.length - 1 ? t("finish") : t("next")}
            </button>
            <button className="btn btn-ghost" onClick={close}>
              {t("skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
