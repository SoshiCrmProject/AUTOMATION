import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Link from "next/link";
import api from "../lib/apiClient";

export default function Signup() {
  const { t, i18n } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) window.location.href = "/dashboard";
    }
  }, []);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/\d/.test(pwd)) return false;
    return true;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwordMismatch") || "Passwords do not match");
      return;
    }
    if (!validatePassword(password)) {
      setError(t("passwordWeak") || "Password must include upper, lower, and number");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", { email, password, locale: i18n.language || "en" });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.error ?? t("signupFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="card" style={{ marginTop: 40 }}>
        <LanguageSwitcher />
        <h2 style={{ margin: "12px 0" }}>{t("signup") ?? "Sign up"}</h2>
        <p style={{ color: "#cbd5e1" }}>{t("signupDesc")}</p>
        <form onSubmit={onSubmit}>
          <label className="label">{t("email")}</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            required
          />
          <label className="label">{t("password")}</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            required
          />
          <label className="label">{t("confirmPassword") ?? "Confirm password"}</label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("confirmPassword") ?? "Confirm password"}
            required
          />
          {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
          <button className="btn" type="submit" style={{ width: "100%", marginTop: 12 }}>
            {loading ? t("loading") : t("signup") ?? "Sign up"}
          </button>
        </form>
        <p style={{ color: "#94a3b8", marginTop: 12 }}>
          {t("haveAccount") ?? "Already have an account?"}{" "}
          <Link href="/login" style={{ color: "#2563eb" }}>
            {t("login")}
          </Link>
        </p>
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
