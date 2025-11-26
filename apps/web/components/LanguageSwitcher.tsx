import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";

export default function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { locale, pathname, asPath, query } = router;

  const switchTo = locale === "en" ? "ja" : "en";
  const switchLabel = switchTo === "en" ? t("langEnglish") : t("langJapanese");
  const buttonText = switchTo === "en" ? t("langEnglishShort") : t("langJapaneseShort");

  return (
    <button
      className="btn btn-ghost"
      style={{ padding: "6px 10px", fontSize: 13 }}
      onClick={() => router.push({ pathname, query }, asPath, { locale: switchTo })}
      aria-label={t("switchLanguage", { lang: switchLabel })}
    >
      {buttonText}
    </button>
  );
}
