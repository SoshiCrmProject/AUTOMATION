import { useRouter } from "next/router";
import { pushToast } from "./Toast";

export default function InlineLanguageSwitcher() {
  const router = useRouter();
  const { pathname, query, asPath, locale } = router;

  const switchLanguage = async (langCode: string) => {
    try {
      await router.push({ pathname, query }, asPath, { locale: langCode });
      pushToast(langCode === "ja" ? "言語が日本語に変更されました" : "Language changed to English", "success");
    } catch (err) {
      // Silently handle language switch errors
    }
  };

  return (
    <div 
      role="group" 
      aria-label="Language selection"
      style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "var(--radius-full)",
      padding: "6px 12px",
      fontSize: 13,
      fontWeight: 600
    }}>
      <button
        onClick={() => switchLanguage("en")}
        aria-label="Switch to English"
        aria-pressed={locale === "en"}
        style={{
          background: locale === "en" ? "white" : "transparent",
          color: locale === "en" ? "var(--color-primary)" : "white",
          border: "none",
          borderRadius: "var(--radius-full)",
          padding: "4px 12px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => switchLanguage("ja")}
        aria-label="Switch to Japanese"
        aria-pressed={locale === "ja"}
        style={{
          background: locale === "ja" ? "white" : "transparent",
          color: locale === "ja" ? "var(--color-primary)" : "white",
          border: "none",
          borderRadius: "var(--radius-full)",
          padding: "4px 12px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
      >
        🇯🇵 JA
      </button>
    </div>
  );
}
