import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { useEffect, useRef, useState } from "react";
import { pushToast } from "./Toast";

export default function LanguageSelector() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { locale, pathname, asPath, query } = router;
  const [showPopup, setShowPopup] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸", nativeName: "English" },
    { code: "ja", name: "Japanese", flag: "🇯🇵", nativeName: "日本語" }
  ];

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  const switchLanguage = (langCode: string) => {
    router.push({ pathname, query }, asPath, { locale: langCode });
    setShowPopup(false);
    pushToast(
      langCode === "ja"
        ? "言語が日本語に変更されました"
        : "Language changed to English"
    );
  };

  useEffect(() => {
    if (!showPopup) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  return (
    <div className="language-selector" ref={containerRef}>
      <button
        className="language-selector__trigger"
        onClick={() => setShowPopup((prev) => !prev)}
        aria-expanded={showPopup}
        aria-haspopup="listbox"
      >
        <span aria-hidden="true">{currentLang.flag}</span>
        <span>{currentLang.code.toUpperCase()}</span>
        <span className="language-selector__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {showPopup && (
        <div className="language-selector__popover" role="listbox">
          <header>
            <p>{t("switchLanguage") || "Switch language"}</p>
            <span>{t("instantApply") || "Instant apply"}</span>
          </header>
          <div className="language-selector__options">
            {languages.map((lang) => {
              const isActive = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  className={`language-selector__option ${isActive ? "is-active" : ""}`}
                  onClick={() => switchLanguage(lang.code)}
                  role="option"
                  aria-selected={isActive}
                >
                  <span className="language-selector__flag" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <span className="language-selector__label">
                    <strong>{lang.nativeName}</strong>
                    <small>{lang.name}</small>
                  </span>
                  {isActive && <span className="language-selector__check">✓</span>}
                </button>
              );
            })}
          </div>
          <footer>
            <small>
              {locale === "ja"
                ? "言語は即座に切り替わります"
                : "Language updates instantly across the workspace"}
            </small>
          </footer>
        </div>
      )}
    </div>
  );
}
