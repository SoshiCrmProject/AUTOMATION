import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { useState } from "react";

export default function LanguageSelector() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { locale, pathname, asPath, query } = router;
  const [showPopup, setShowPopup] = useState(false);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸", nativeName: "English" },
    { code: "ja", name: "Japanese", flag: "🇯🇵", nativeName: "日本語" }
  ];

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  const switchLanguage = (langCode: string) => {
    router.push({ pathname, query }, asPath, { locale: langCode });
    setShowPopup(false);
    
    // Show success toast
    const successMsg = langCode === "en" 
      ? "Language changed to English" 
      : "言語が日本語に変更されました";
    
    // Simple toast notification
    const toast = document.createElement("div");
    toast.textContent = `✅ ${successMsg}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, var(--color-success), #059669);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      z-index: 10000;
      font-weight: 600;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Language Button */}
      <button
        className="btn btn-ghost"
        style={{ 
          padding: "8px 14px", 
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600
        }}
        onClick={() => setShowPopup(!showPopup)}
        aria-label={t("switchLanguage")}
      >
        <span style={{ fontSize: 18 }}>{currentLang.flag}</span>
        <span>{currentLang.code.toUpperCase()}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {/* Language Popup */}
      {showPopup && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(4px)",
              zIndex: 9998,
              animation: "fadeIn 0.2s ease"
            }}
            onClick={() => setShowPopup(false)}
          />

          {/* Popup Card */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
              padding: 24,
              minWidth: 320,
              maxWidth: 400,
              zIndex: 9999,
              animation: "slideUp 0.3s ease"
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  🌍 {t("switchLanguage", { lang: "" }) || "Select Language"}
                </h3>
                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    padding: 4,
                    lineHeight: 1
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p style={{ 
                margin: "8px 0 0 0", 
                fontSize: 13, 
                color: "var(--color-text-muted)" 
              }}>
                {locale === "ja" 
                  ? "インターフェースの言語を選択してください" 
                  : "Choose your preferred language for the interface"}
              </p>
            </div>

            {/* Language Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {languages.map((lang) => {
                const isActive = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => switchLanguage(lang.code)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: isActive ? "var(--color-primary)" : "var(--color-elevated)",
                      color: isActive ? "white" : "var(--color-text)",
                      border: isActive ? "2px solid var(--color-primary)" : "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 500,
                      transition: "all 0.2s ease",
                      textAlign: "left"
                    }}
                    className={isActive ? "" : "hover-scale"}
                  >
                    <span style={{ fontSize: 28 }}>{lang.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{lang.nativeName}</div>
                      <div style={{ 
                        fontSize: 12, 
                        opacity: isActive ? 0.9 : 0.6,
                        marginTop: 2
                      }}>
                        {lang.name}
                      </div>
                    </div>
                    {isActive && (
                      <span style={{ fontSize: 18 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div style={{
              marginTop: 16,
              padding: 12,
              background: "var(--color-info-bg)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--color-text-muted)",
              lineHeight: 1.6
            }}>
              💡 <strong>{locale === "ja" ? "ヒント：" : "Tip:"}</strong> {locale === "ja" 
                ? "すべてのページ、ボタン、メッセージが選択した言語に即座に更新されます。"
                : "All pages, buttons, and messages will update to your selected language instantly."}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .hover-scale:hover {
          transform: scale(1.02);
          box-shadow: var(--shadow-sm);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
