import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Link from "next/link";

export default function Login() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) window.location.href = "/dashboard";
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      if (remember) {
        localStorage.setItem("token", res.data.token);
        sessionStorage.removeItem("token");
      } else {
        sessionStorage.setItem("token", res.data.token);
        localStorage.removeItem("token");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.error ?? t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="card" style={{ marginTop: 40 }}>
        <LanguageSwitcher />
        <h2 style={{ margin: "12px 0" }}>{t("login")}</h2>
        <p style={{ color: "#cbd5e1" }}>{t("loginDesc")}</p>
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
          <label style={{ color: "#cbd5e1", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            {t("rememberMe")}
          </label>
          {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
          <button className="btn" type="submit" style={{ width: "100%", marginTop: 12 }}>
            {loading ? t("loading") : t("login")}
          </button>
        </form>
        <p style={{ color: "#94a3b8", marginTop: 12 }}>
          {t("noAccount") ?? "No account?"}{" "}
          <Link href="/signup" style={{ color: "#2563eb" }}>
            {t("signup")}
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
