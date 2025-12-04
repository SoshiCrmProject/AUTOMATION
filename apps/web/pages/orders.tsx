import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import PageLayout from "../components/PageLayout";
import Toast, { pushToast } from "../components/Toast";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { ordersTour } from "../components/tourConfigs";
import {
  Card,
  CardHeader,
  StatCard,
  Button,
  Badge,
  Input,
  Select,
  Table,
  Modal,
  Alert,
  LoadingSpinner,
  EmptyState,
} from "../components/ui/index";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type Order = {
  id: string;
  shopeeOrderSn: string;
  processingStatus: string;
  processingMode?: string | null;
  amazonOrder?: { amazonOrderId: string | null; trackingNumber?: string | null } | null;
  errorItems: { reason: string; errorCode: string; amazonProductUrl?: string | null }[];
  rawPayload?: any;
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  itemCount?: number;
};

type OrderStats = {
  total: number;
  fulfilled: number;
  failed: number;
  pending: number;
  todayProcessed: number;
};

export default function OrdersPage() {
  const { t } = useTranslation("common");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showTour, setShowTour] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: orders, error, mutate: refreshOrders } = useSWR<Order[]>(
    "/orders/recent",
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: autoRefresh ? 30000 : 0,
    }
  );

  const isLoading = !orders && !error;
  const ordersArray = Array.isArray(orders) ? orders : [];

  const stats: OrderStats = useMemo(() => {
    if (!ordersArray.length) {
      return { total: 0, fulfilled: 0, failed: 0, pending: 0, todayProcessed: 0 };
    }

    const today = new Date().toDateString();
    return {
      total: ordersArray.length,
      fulfilled: ordersArray.filter((o) => o.processingStatus === "FULFILLED").length,
      failed: ordersArray.filter((o) => o.processingStatus === "FAILED" || o.processingStatus === "SKIPPED").length,
      pending: ordersArray.filter((o) => !o.amazonOrder && ["QUEUED", "PROCESSING", "UNPROCESSED"].includes(o.processingStatus)).length,
      todayProcessed: ordersArray.filter((o) => new Date(o.updatedAt).toDateString() === today).length,
    };
  }, [ordersArray]);

  useEffect(() => {
    if (!ordersArray.length) return;

    const today = new Date().toDateString();
    const fulfilledToday = ordersArray.filter(
      (order) => new Date(order.updatedAt).toDateString() === today && order.processingStatus === "FULFILLED"
    ).length;

    if (fulfilledToday > stats.todayProcessed && fulfilledToday > 0) {
      pushToast(`🎉 ${fulfilledToday} ${t("ordersProcessedToday") || "orders processed today"}!`, "success");
    }
  }, [ordersArray, stats.todayProcessed, t]);

  const filteredOrders = useMemo(() => {
    return ordersArray.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "fulfilled" && order.processingStatus === "FULFILLED") ||
        (statusFilter === "failed" && ["FAILED", "SKIPPED"].includes(order.processingStatus)) ||
        (statusFilter === "pending" && !order.amazonOrder && ["QUEUED", "PROCESSING", "UNPROCESSED"].includes(order.processingStatus));

      const matchesSearch =
        !searchTerm ||
        order.shopeeOrderSn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.amazonOrder?.amazonOrderId?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [ordersArray, statusFilter, searchTerm]);

  const errorInsights = useMemo(() => {
    if (!ordersArray.length) return [] as { code: string; reason?: string; count: number }[];

    const counts: Record<string, { code: string; reason?: string; count: number }> = {};
    ordersArray.forEach((order) => {
      order.errorItems?.forEach((err) => {
        const key = err.errorCode || err.reason || "UNKNOWN";
        if (!counts[key]) {
          counts[key] = {
            code: err.errorCode || key,
            reason: err.reason,
            count: 0,
          };
        }
        counts[key].count += 1;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [ordersArray]);

  const handlePollNow = async () => {
    setLoading(true);
    try {
      await api.post("/orders/poll-now");
      pushToast(t("orderPollingTriggered") || "Order polling triggered", "success");
      refreshOrders();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("orderPollingFailed") || "Failed to trigger polling", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await api.post(`/orders/retry/${orderId}`);
      pushToast(t("orderRetryQueued") || "Order retry initiated", "success");
      refreshOrders();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("orderRetryFailed") || "Failed to retry order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualMark = async (orderId: string) => {
    setLoading(true);
    try {
      await api.post(`/orders/manual/${orderId}`);
      pushToast(t("orderMarkedManual") || "Order marked as manual", "success");
      refreshOrders();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("orderManualFailed") || "Failed to mark order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedOrders.size === 0) return;

    setLoading(true);
    try {
      await Promise.all(Array.from(selectedOrders).map((id) => api.post(`/orders/retry/${id}`)));
      pushToast(`✅ ${selectedOrders.size} ${t("ordersQueuedForRetry") || "orders queued for retry"}`, "success");
      setSelectedOrders(new Set());
      refreshOrders();
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("orderBulkRetryFailed") || "Some retries failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleExportCSV = async () => {
    if (typeof window === "undefined") return;
    try {
      const response = await api.get("/orders/processed/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      pushToast(t("ordersExported") || "Orders exported", "success");
    } catch (err: any) {
      pushToast(err.response?.data?.error || t("ordersExportFailed") || "Failed to export orders", "error");
    }
  };

  const handleManualRefresh = () => {
    refreshOrders();
    pushToast(t("ordersRefreshing") || "Refreshing orders");
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
    pushToast(!autoRefresh ? t("autoRefreshEnabled") || "Auto-refresh enabled" : t("autoRefreshDisabled") || "Auto-refresh paused");
  };

  const handleReplayTour = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("tour_completed_orders");
    setShowTour(true);
    window.location.reload();
  };

  const selectionCount = selectedOrders.size;
  const allVisibleSelected = filteredOrders.length > 0 && selectionCount === filteredOrders.length;

  const tableRows = filteredOrders.map((order) => ({
    _id: order.id,
    _order: order,
    shopeeOrder: (
      <div>
        <div style={{ fontWeight: 600 }}>{order.shopeeOrderSn}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {order.itemCount ? `${order.itemCount} ${t("items") || "items"}` : ""}
          {order.itemCount && order.totalAmount ? " · " : ""}
          {order.totalAmount ? `₱${order.totalAmount.toLocaleString()}` : ""}
        </div>
      </div>
    ),
    amazonOrder: order.amazonOrder?.amazonOrderId ? (
      <div style={{ fontSize: 13 }}>
        <code>{order.amazonOrder.amazonOrderId}</code>
        {order.amazonOrder?.trackingNumber && (
          <div style={{ marginTop: 4, color: "var(--color-text-muted)" }}>
            {order.amazonOrder.trackingNumber}
          </div>
        )}
      </div>
    ) : (
      <span style={{ color: "var(--color-text-muted)" }}>—</span>
    ),
    status: getStatusBadge(order.processingStatus),
    mode: order.processingMode ? <Badge variant="info">{order.processingMode}</Badge> : <span style={{ color: "var(--color-text-muted)" }}>—</span>,
    errors: order.errorItems.length > 0 ? <Badge variant="error">{order.errorItems.length}</Badge> : <span style={{ color: "var(--color-text-muted)" }}>0</span>,
    date: (
      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        {new Date(order.updatedAt).toLocaleString()}
      </span>
    ),
    actions: (
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(order);
            setShowDetailModal(true);
          }}
        >
          {t("view") || "View"}
        </Button>
        {order.processingStatus === "FAILED" && (
          <Button
            variant="warning"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRetryOrder(order.id);
            }}
            disabled={loading}
          >
            {t("retry") || "Retry"}
          </Button>
        )}
        {!order.amazonOrder && (
          <Button
            variant="success"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleManualMark(order.id);
            }}
            disabled={loading}
          >
            {t("manual") || "Manual"}
          </Button>
        )}
      </div>
    ),
  }));

  const orderColumns = [
    { key: "shopeeOrder", header: t("shopeeOrder") || "Shopee Order" },
    { key: "amazonOrder", header: t("amazonOrder") || "Amazon Order", width: "200px" },
    { key: "status", header: t("status") || "Status", width: "140px" },
    { key: "mode", header: t("mode") || "Mode", width: "120px" },
    { key: "errors", header: t("errors") || "Errors", width: "90px", align: "center" as const },
    { key: "date", header: t("updatedAt") || "Updated", width: "170px" },
    { key: "actions", header: t("actions") || "Actions", width: "220px" },
  ];

  const heroBadge = (
    <Badge variant={autoRefresh ? "success" : "warning"}>
      {autoRefresh ? t("liveAutoRefresh") || "Live auto-refresh" : t("manualMode") || "Manual refresh"}
    </Badge>
  );

  const heroHighlights = [
    {
      label: t("processedToday") || "Processed today",
      value: stats.todayProcessed.toLocaleString(),
      helper: t("ordersProcessedTodayHelper") || "Synced within the last 24h",
    },
    {
      label: t("pending") || "Pending",
      value: stats.pending.toLocaleString(),
      helper: t("ordersAwaitingAction") || "Awaiting automation",
    },
    {
      label: t("failed") || "Failed",
      value: stats.failed.toLocaleString(),
      helper: t("ordersNeedReview") || "Needs manual review",
    },
  ];

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {heroHighlights.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{stat.label}</span>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{stat.value}</div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {stats.todayProcessed > 0
        ? `${stats.todayProcessed} ${t("ordersProcessedToday") || "orders processed today"}.`
        : t("ordersHeroFooter") || "Live analytics refresh every 30 seconds when enabled."}
    </span>
  );

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div className="full-width-mobile" style={{ flex: "1 1 240px", minWidth: 200 }}>
        <Input
          placeholder={t("searchByOrderID") || "Search orders"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={t("search") || "Search"}
        />
      </div>
      <div className="full-width-mobile" style={{ flex: "0 0 200px", minWidth: 180 }}>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: t("allOrders") || "All orders" },
            { value: "fulfilled", label: t("fulfilled") || "Fulfilled" },
            { value: "failed", label: t("failed") || "Failed" },
            { value: "pending", label: t("pending") || "Pending" },
          ]}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        className="full-width-mobile"
        onClick={() => {
          setStatusFilter("all");
          setSearchTerm("");
        }}
      >
        🧼 {t("clearFilters") || "Clear filters"}
      </Button>
    </div>
  );

  const actions = (
    <div className="stack-md wrap">
      <Button type="button" className="full-width-mobile" onClick={handlePollNow} disabled={loading}>
        🔄 {t("pollNow") || "Poll now"}
      </Button>
      <Button type="button" className="full-width-mobile" variant="ghost" onClick={handleManualRefresh}>
        ♻️ {t("refreshData") || "Refresh"}
      </Button>
      <Button type="button" className="full-width-mobile" variant="ghost" onClick={handleExportCSV}>
        📊 {t("exportCsv") || "Export CSV"}
      </Button>
      <Button
        type="button"
        className="full-width-mobile"
        variant={autoRefresh ? "primary" : "ghost"}
        onClick={handleToggleAutoRefresh}
      >
        {autoRefresh ? `⚡ ${t("live") || "Live"}` : `⏸️ ${t("paused") || "Paused"}`}
      </Button>
      <Button
        type="button"
        className="full-width-mobile"
        variant="ghost"
        onClick={handleBulkRetry}
        disabled={selectedOrders.size === 0 || loading}
      >
        🔁 {t("retrySelected") || "Retry selected"}
      </Button>
    </div>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card hover={false}>
        <CardHeader title={t("fulfillmentHealth") || "Fulfillment health"} subtitle={t("ordersHealthSubtitle") || "Live status"} icon="🩺" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: t("fulfilled") || "Fulfilled", value: stats.fulfilled, variant: "success" },
            { label: t("failed") || "Failed", value: stats.failed, variant: "error" },
            { label: t("pending") || "Pending", value: stats.pending, variant: "warning" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{item.label}</span>
              <Badge variant={item.variant as any}>{item.value.toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      </Card>
      {errorInsights.length > 0 && (
        <Card hover={false}>
          <CardHeader
            title={t("topFailureReasons") || "Top failure reasons"}
            subtitle={t("topFailureReasonsSubtitle") || "Most common blockers in the queue"}
            icon="🚨"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {errorInsights.map((insight) => (
              <div
                key={`${insight.code}-${insight.reason || "unknown"}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="error">{insight.code}</Badge>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    × {insight.count.toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                  {insight.reason || t("noDetailsAvailable") || "Details unavailable"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card hover={false}>
        <CardHeader title={t("orderShortcuts") || "Shortcuts"} subtitle={t("orderShortcutsSubtitle") || "Daily workflows"} icon="⚙️" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={() => window.open("/analytics", "_self")}>
            📈 {t("viewAnalytics") || "View analytics"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.open("/crm", "_self")}>
            👥 {t("viewCustomers") || "View customers"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.open("mailto:support@automation?subject=Order%20assist", "_blank")}>
            ✉️ {t("contactSupport") || "Contact support"}
          </Button>
        </div>
      </Card>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FULFILLED":
        return <Badge variant="success">{t("fulfilled") || "Fulfilled"}</Badge>;
      case "FAILED":
      case "SKIPPED":
        return <Badge variant="error">{t("failed") || "Failed"}</Badge>;
      case "PROCESSING":
        return <Badge variant="warning">{t("processing") || "Processing"}</Badge>;
      case "QUEUED":
        return <Badge variant="info">{t("queued") || "Queued"}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <>
      <PageLayout
        activeHref="/orders"
        title="📦 Order Management"
        description={t("ordersHeroDescription") || "Track, process, and manage orders across platforms."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        toolbar={toolbar}
        actions={actions}
        sidebar={sidebar}
        heroBackground="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {isLoading && <LoadingSpinner text={t("loadingOrders") || "Loading orders"} />}

          {error && (
            <Alert variant="error" title={t("failedToLoadOrders") || "Failed to load orders"}>
              {t("tryRefreshing") || "Please try refreshing the page."}
            </Alert>
          )}

          {!isLoading && !error && (
            <>
              <Card>
                <CardHeader
                  title={t("operationsPulse") || "Operations pulse"}
                  subtitle={t("ordersPulseSubtitle") || "Snapshot of current workload"}
                  icon="📋"
                />
                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <StatCard icon="📦" label={t("totalOrders") || "Total"} value={stats.total.toLocaleString()} color="primary" />
                  <StatCard icon="✅" label={t("fulfilled") || "Fulfilled"} value={stats.fulfilled.toLocaleString()} color="success" />
                  <StatCard icon="⚠️" label={t("failed") || "Failed"} value={stats.failed.toLocaleString()} color="error" />
                  <StatCard icon="⏳" label={t("pending") || "Pending"} value={stats.pending.toLocaleString()} color="warning" />
                </div>
              </Card>

              <Card>
                <CardHeader title={t("filters") || "Filters"} icon="🔍" />
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <Input
                    label={t("searchByOrderID") || "Search orders"}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t("searchByOrderID") || "Search by Shopee or Amazon ID"}
                  />
                  <Select
                    label={t("status") || "Status"}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: t("allOrders") || "All" },
                      { value: "fulfilled", label: t("fulfilled") || "Fulfilled" },
                      { value: "failed", label: t("failed") || "Failed" },
                      { value: "pending", label: t("pending") || "Pending" },
                    ]}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <Button type="button" variant="ghost" onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}>
                    🧼 {t("clearFilters") || "Clear filters"}
                  </Button>
                  {selectionCount > 0 && (
                    <>
                      <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                        {selectionCount} {t("ordersSelected") || "selected"}
                      </span>
                      <Button type="button" size="sm" onClick={handleBulkRetry} disabled={loading}>
                        🔁 {t("retrySelected") || "Retry selected"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedOrders(new Set())}>
                        {t("clearSelection") || "Clear selection"}
                      </Button>
                    </>
                  )}
                  {filteredOrders.length > 0 && (
                    <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() => {
                          if (allVisibleSelected) {
                            setSelectedOrders(new Set());
                          } else {
                            setSelectedOrders(new Set(filteredOrders.map((order) => order.id)));
                          }
                        }}
                      />
                      {allVisibleSelected ? t("deselectVisible") || "Deselect visible" : t("selectVisible") || "Select visible"}
                    </label>
                  )}
                </div>
              </Card>

              {filteredOrders.length > 0 ? (
                <Card>
                  <CardHeader
                    title={t("ordersTableTitle") || "Order queue"}
                    subtitle={`${filteredOrders.length} ${t("orders") || "orders"}`}
                    icon="🗂️"
                  />
                  <Table
                    columns={orderColumns}
                    data={tableRows}
                    selectedRows={selectedOrders}
                    onSelectRow={toggleOrderSelection}
                    idKey="_id"
                    emptyMessage={t("noOrdersFound") || "No orders found"}
                    onRowClick={(row) => {
                      setSelectedOrder(row._order);
                      setShowDetailModal(true);
                    }}
                  />
                </Card>
              ) : (
                <EmptyState
                  icon="📦"
                  title={t("noOrdersFound") || "No orders found"}
                  description={t("descriptionAdjustFilters") || "Try adjusting filters or pulling new data."}
                  action={
                    <Button type="button" onClick={handleManualRefresh} variant="ghost">
                      ♻️ {t("refreshData") || "Refresh"}
                    </Button>
                  }
                />
              )}
            </>
          )}
        </div>
      </PageLayout>

      {selectedOrder && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          title={`${t("order")} · ${selectedOrder.shopeeOrderSn}`}
          size="lg"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>{t("orderInformation") || "Order information"}</h4>
              <div className="grid grid-2" style={{ gap: 16 }}>
                <div>
                  <label className="label">Shopee Order SN</label>
                  <div style={{ fontSize: 14 }}>
                    <code>{selectedOrder.shopeeOrderSn}</code>
                  </div>
                </div>
                <div>
                  <label className="label">Amazon Order ID</label>
                  <div style={{ fontSize: 14 }}>
                    {selectedOrder.amazonOrder?.amazonOrderId ? (
                      <code>{selectedOrder.amazonOrder.amazonOrderId}</code>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>—</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">{t("status") || "Status"}</label>
                  <div>{getStatusBadge(selectedOrder.processingStatus)}</div>
                </div>
                <div>
                  <label className="label">{t("processingMode") || "Processing mode"}</label>
                  <div style={{ fontSize: 14 }}>
                    {selectedOrder.processingMode || <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                  </div>
                </div>
                <div>
                  <label className="label">{t("createdAt") || "Created"}</label>
                  <div style={{ fontSize: 14 }}>{new Date(selectedOrder.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <label className="label">{t("updatedAt") || "Updated"}</label>
                  <div style={{ fontSize: 14 }}>{new Date(selectedOrder.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {selectedOrder.errorItems.length > 0 && (
              <div>
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                  {t("errors") || "Errors"} ({selectedOrder.errorItems.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedOrder.errorItems.map((err, idx) => (
                    <div
                      key={`${err.errorCode}-${idx}`}
                      style={{
                        padding: 16,
                        background: "var(--color-elevated)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-error)",
                      }}
                    >
                      <Badge variant="error">{err.errorCode}</Badge>
                      <p style={{ margin: "8px 0", fontSize: 14 }}>{err.reason}</p>
                      {err.amazonProductUrl && (
                        <a
                          href={err.amazonProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, color: "var(--color-primary)" }}
                        >
                          {t("viewProduct") || "View product"} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {selectedOrder.processingStatus === "FAILED" && (
                <Button
                  onClick={() => {
                    handleRetryOrder(selectedOrder.id);
                    setShowDetailModal(false);
                  }}
                  variant="warning"
                  fullWidth
                  disabled={loading}
                >
                  🔄 {t("retryOrder") || "Retry order"}
                </Button>
              )}
              {!selectedOrder.amazonOrder && (
                <Button
                  onClick={() => {
                    handleManualMark(selectedOrder.id);
                    setShowDetailModal(false);
                  }}
                  variant="success"
                  fullWidth
                  disabled={loading}
                >
                  ✅ {t("markManual") || "Mark as manual"}
                </Button>
              )}
              <Button onClick={() => setShowDetailModal(false)} variant="ghost" fullWidth>
                {t("close") || "Close"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Toast />

      <OnboardingTour pageName="orders" steps={ordersTour} onComplete={() => setShowTour(false)} />
      {!showTour && <HelpButton onClick={handleReplayTour} />}
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
