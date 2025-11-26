import type { AppProps } from "next/app";
import { appWithTranslation } from "next-i18next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import "../styles/globals.css";
// api client is globally configured via interceptors; no need to import here
import Toast from "../components/Toast";
import nextI18NextConfig from "../next-i18next.config";

const OnboardingModal = dynamic(() => import("../components/OnboardingModal"), {
  ssr: false,
  loading: () => null
});

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const path = router.pathname || "";
  const hideOnboarding = path.startsWith("/login") || path.startsWith("/signup");

  return (
    <div className="shell">
      <Component {...pageProps} />
      {!hideOnboarding && <OnboardingModal />}
      <Toast />
    </div>
  );
}

export default appWithTranslation(MyApp, nextI18NextConfig);
