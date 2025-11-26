import useSWR from "swr";
import axios from "axios";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import { useState } from "react";
import api from "../lib/apiClient";

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return axios
    .get(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);
};

export default function ReviewPage() {
  const { t } = useTranslation("common");
  const { data, error } = useSWR("/api/orders/errors", fetcher, { revalidateOnFocus: false });
  const [message, setMessage] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const retry = async (orderId: string) => {
    setMessage("");
    setLoadingId(orderId);
    try {
      await api.post(`/api/orders/retry/${orderId}`);
      setMessage(t("retrySuccess"));
    } catch (e: any) {
      setMessage(e?.response?.data?.error ?? t("actionRetryError"));
    } finally {
      setLoadingId(null);
    }
  };

  const items =
    data?.filter(
      (item: any) => item.reason?.toLowerCase().includes("manual review") || item.reason?.toLowerCase().includes("review")
    ) ?? [];

  return (
    <div className="container">
      <AppNav activeHref="/review" />
      <div className="card">
        <h1>{t("reviewQueueTitle")}</h1>
        <p style={{ color: "#475569" }}>{t("reviewDesc")}</p>
        {message && <p>{message}</p>}
        {error && <p style={{ color: "#ef4444" }}>{t("genericError")}</p>}
        {items.length === 0 && <p>{t("noManualReview")}</p>}
        {items.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>{t("orders")}</th>
                <th>{t("reason")}</th>
                <th>{t("ordersTableAction")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.shopeeOrderId ?? "-"}</td>
                  <td>{item.reason}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() => retry(item.shopeeOrderId)}
                      disabled={loadingId === item.shopeeOrderId}
                    >
                      {loadingId === item.shopeeOrderId ? t("loading") : t("retry")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
