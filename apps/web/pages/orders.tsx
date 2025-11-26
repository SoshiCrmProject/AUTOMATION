import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import Link from "next/link";
import { useMemo, useState } from "react";
import api from "../lib/apiClient";
import { pushToast } from "../components/Toast";
import StatusBadge from "../components/StatusBadge";

type Order = {
  id: string;
  shopeeOrderSn: string;
  processingStatus: string;
  processingMode?: string | null;
  amazonOrder?: { amazonOrderId: string | null } | null;
  errorItems: { reason: string; errorCode: string; amazonProductUrl?: string | null }[];
  rawPayload?: any;
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function OrdersPage() {
  const { t } = useTranslation("common");
  const { data, error } = useSWR<Order[]>("/api/orders/recent", fetcher, { revalidateOnFocus: false });
  const [filter, setFilter] = useState<"all" | "processed" | "error" | "pending">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [polling, setPolling] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"order" | "status">("order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const triggerPoll = async () => {
    setPolling(true);
    try {
      await api.post("/api/orders/poll-now", {});
      pushToast(t("actionPollSuccess"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("actionPollError"), "error");
    } finally {
      setPolling(false);
    }
  };

  const retryOrder = async (id: string) => {
    setRetrying((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/orders/retry/${id}`);
      pushToast(t("retrySuccess"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("actionRetryError"), "error");
    } finally {
      setRetrying((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const manualMark = async (id: string) => {
    setMarking((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/orders/manual/${id}`);
      pushToast(t("actionManualSuccess"));
    } catch (e: any) {
      pushToast(e?.response?.data?.error ?? t("actionManualError"), "error");
    } finally {
      setMarking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const statusPill = (order: Order) => (
    <StatusBadge
      status={order.processingStatus}
      labels={{
        success: t("statusProcessed"),
        error: t("statusError"),
        pending: t("statusPending"),
        manual: t("ordersTableManual")
      }}
    />
  );

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    const filtered = data
      .filter((order) => {
        if (filter === "processed") return order.processingStatus === "FULFILLED";
        if (filter === "error") return order.processingStatus === "FAILED" || order.processingStatus === "SKIPPED" || order.errorItems.length;
        if (filter === "pending")
          return !order.amazonOrder && (order.processingStatus === "QUEUED" || order.processingStatus === "PROCESSING" || order.processingStatus === "UNPROCESSED");
        return true;
      })
      .filter((order) => order.shopeeOrderSn.toLowerCase().includes(search.toLowerCase()));

    return filtered.sort((a, b) => {
      if (sortBy === "order") {
        return sortDir === "asc"
          ? a.shopeeOrderSn.localeCompare(b.shopeeOrderSn)
          : b.shopeeOrderSn.localeCompare(a.shopeeOrderSn);
      }
      return sortDir === "asc"
        ? a.processingStatus.localeCompare(b.processingStatus)
        : b.processingStatus.localeCompare(a.processingStatus);
    });
  }, [data, filter, search, sortBy, sortDir]);

  return (
    <div className="container">
      <AppNav activeHref="/orders" />
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>{t("orders")}</h1>
            <p>{t("ordersDesc")}</p>
          </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={triggerPoll} disabled={polling}>
            {polling ? t("loading") : t("pollButton")}
          </button>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          {(["all", "processed", "error", "pending"] as const).map((f) => (
            <button
              key={f}
              className="button"
              style={{ background: filter === f ? "#2563eb" : "#cbd5e1", color: filter === f ? "#fff" : "#0f172a" }}
              onClick={() => setFilter(f)}
            >
              {f === "all" && t("filterAll")}
              {f === "processed" && t("filterProcessed")}
              {f === "error" && t("filterError")}
              {f === "pending" && t("filterPending")}
            </button>
          ))}
          <input
            className="input"
            placeholder={t("searchOrderId")}
            style={{ maxWidth: 240, marginBottom: 0 }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {!data && !error && <p>{t("loading")}</p>}
        {error && <p style={{ color: "#ef4444" }}>{t("genericError")}</p>}
        {filteredOrders.length === 0 && data && <p>{t("noOrdersMsg") ?? t("noOrders")}</p>}
        {filteredOrders.length > 0 && (
          <div className="table-responsive">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortBy("order");
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  }}
                >
                  {t("orders")} {sortBy === "order" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortBy("status");
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  }}
                >
                  {t("ordersTableStatus")} {sortBy === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th>{t("ordersTableDecision")}</th>
                <th>{t("ordersTableAmazon")}</th>
                <th>{t("ordersTableAction")}</th>
                <th>{t("ordersTableManual")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders
                .slice((page - 1) * pageSize, page * pageSize)
                .map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`} style={{ color: "#2563eb" }}>
                        {order.shopeeOrderSn}
                      </Link>
                    </td>
                    <td>{statusPill(order)}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {order.errorItems.length
                          ? order.errorItems[0].reason || order.errorItems[0].errorCode
                          : order.processingStatus}
                        {order.processingMode ? <span style={{ color: "#475569", fontSize: 12 }}>{order.processingMode}</span> : null}
                      </div>
                    </td>
                    <td>
                      {order.amazonOrder ? order.amazonOrder.amazonOrderId || t("statusPending") : "-"}
                    </td>
                    <td>
                      {order.processingStatus !== "FULFILLED" && (
                        <button
                          className="btn btn-ghost"
                          onClick={() => retryOrder(order.id)}
                          disabled={retrying.has(order.id)}
                        >
                          {retrying.has(order.id) ? t("loading") : t("retry")}
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {order.rawPayload?.amazonProductUrl || order.errorItems[0]?.amazonProductUrl ? (
                          <a
                            className="btn btn-ghost"
                            href={order.rawPayload?.amazonProductUrl || order.errorItems[0]?.amazonProductUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("amazonPage")}
                          </a>
                        ) : null}
                        <button
                          className="btn btn-ghost"
                          onClick={() => manualMark(order.id)}
                          disabled={marking.has(order.id)}
                        >
                          {marking.has(order.id) ? t("loading") : t("manualOrder")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
        {filteredOrders.length > pageSize && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("prev")}</button>
            <button className="btn btn-ghost" disabled={page * pageSize >= filteredOrders.length} onClick={() => setPage((p) => p + 1)}>{t("next")}</button>
          </div>
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
