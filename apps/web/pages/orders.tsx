import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import AppNav from "../components/AppNav";
import { useMemo, useState, useEffect } from "react";
import api from "../lib/apiClient";
import Toast, { pushToast } from "../components/Toast";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { ordersTour } from "../components/tourConfigs";
import { 
  Card, CardHeader, StatCard, Button, Badge, Input, Select,
  Table, Modal, Tabs, Alert, LoadingSpinner, EmptyState 
} from "../components/ui/index";

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

const fetcher = (url: string) => api.get(url).then((res) => res.data);

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
      refreshInterval: autoRefresh ? 30000 : 0 // Auto-refresh every 30 seconds if enabled
    }
  );

  // Show notification when orders update
  useEffect(() => {
    if (orders && orders.length > 0) {
      const todayProcessed = orders.filter(o => {
        const updatedToday = new Date(o.updatedAt).toDateString() === new Date().toDateString();
        return updatedToday && o.processingStatus === "FULFILLED";
      }).length;
      
      if (todayProcessed > (stats.todayProcessed || 0) && todayProcessed > 0) {
        pushToast(`🎉 ${todayProcessed} orders processed today!`, "success");
      }
    }
  }, [orders]);

  const isLoading = !orders && !error;
  const ordersArray = Array.isArray(orders) ? orders : [];

  // Calculate stats
  const stats: OrderStats = useMemo(() => {
    if (!ordersArray.length) return { total: 0, fulfilled: 0, failed: 0, pending: 0, todayProcessed: 0 };
    
    const today = new Date().toDateString();
    return {
      total: ordersArray.length,
      fulfilled: ordersArray.filter(o => o.processingStatus === "FULFILLED").length,
      failed: ordersArray.filter(o => o.processingStatus === "FAILED" || o.processingStatus === "SKIPPED").length,
      pending: ordersArray.filter(o => !o.amazonOrder && ["QUEUED", "PROCESSING", "UNPROCESSED"].includes(o.processingStatus)).length,
      todayProcessed: ordersArray.filter(o => new Date(o.updatedAt).toDateString() === today).length
    };
  }, [ordersArray]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return ordersArray.filter(order => {
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "fulfilled" && order.processingStatus === "FULFILLED") ||
        (statusFilter === "failed" && (order.processingStatus === "FAILED" || order.processingStatus === "SKIPPED")) ||
        (statusFilter === "pending" && !order.amazonOrder && ["QUEUED", "PROCESSING", "UNPROCESSED"].includes(order.processingStatus));
      
      const matchesSearch = !searchTerm ||
        order.shopeeOrderSn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.amazonOrder?.amazonOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [ordersArray, statusFilter, searchTerm]);

  // Handlers
  const handlePollNow = async () => {
    setLoading(true);
    try {
      await api.post("/orders/poll-now");
      pushToast("Order polling triggered successfully", "success");
      refreshOrders();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to trigger polling", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await api.post(`/orders/retry/${orderId}`);
      pushToast("Order retry initiated", "success");
      refreshOrders();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to retry order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualMark = async (orderId: string) => {
    setLoading(true);
    try {
      await api.post(`/orders/manual/${orderId}`);
      pushToast("Order marked as manually processed", "success");
      refreshOrders();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to mark order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedOrders.size === 0) return;
    
    setLoading(true);
    try {
      // Retry all selected orders in parallel
      await Promise.all(
        Array.from(selectedOrders).map(id => api.post(`/orders/retry/${id}`))
      );
      pushToast(`✅ ${selectedOrders.size} orders queued for retry`, "success");
      setSelectedOrders(new Set());
      refreshOrders();
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Some retries failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrders(newSet);
  };

  const selectAllVisible = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get("/orders/processed/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      pushToast("Orders exported successfully", "success");
    } catch (error: any) {
      pushToast(error.response?.data?.error || "Failed to export orders", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FULFILLED":
        return <Badge variant="success">Fulfilled</Badge>;
      case "FAILED":
      case "SKIPPED":
        return <Badge variant="error">Failed</Badge>;
      case "PROCESSING":
        return <Badge variant="warning">Processing</Badge>;
      case "QUEUED":
        return <Badge variant="info">Queued</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/orders" />
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          padding: "48px 32px",
          borderRadius: "var(--radius-xl)",
          marginBottom: 32,
          boxShadow: "var(--shadow-lg)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36, margin: 0, color: "#fff" }}>
                📦 Order Management
              </h1>
              <p style={{ color: "rgba(255,255,255,0.9)", marginTop: 8, fontSize: 16 }}>
                Track, process, and manage all orders across platforms
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={handlePollNow} disabled={loading} variant="ghost">
                🔄 Poll Now
              </Button>
              <Button onClick={handleExportCSV} variant="ghost">
                📊 Export CSV
              </Button>
              <Button 
                onClick={() => setAutoRefresh(!autoRefresh)} 
                variant={autoRefresh ? "primary" : "ghost"}
                title={autoRefresh ? "Auto-refresh enabled (30s)" : "Auto-refresh disabled"}
              >
                {autoRefresh ? "⚡ Live" : "⏸️ Paused"}
              </Button>
            </div>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}

        {error && (
          <Alert variant="error">
            <strong>Failed to load orders</strong>
            <p style={{ marginTop: 4 }}>Please try refreshing the page</p>
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <StatCard
                icon="📦"
                label="Total Orders"
                value={stats.total.toLocaleString()}
                color="primary"
              />
              <StatCard
                icon="✅"
                label="Fulfilled"
                value={stats.fulfilled.toLocaleString()}
                color="success"
              />
              <StatCard
                icon="⚠️"
                label="Failed"
                value={stats.failed.toLocaleString()}
                color="error"
              />
              <StatCard
                icon="⏳"
                label="Pending"
                value={stats.pending.toLocaleString()}
                color="warning"
              />
            </div>

            {/* Filters and Actions */}
            <div style={{ marginBottom: 24 }}>
              <Card>
              <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
                <Input
                  label="Search Orders"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Shopee or Amazon order ID..."
                />
                <Select
                  label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Orders" },
                    { value: "fulfilled", label: "✅ Fulfilled" },
                    { value: "failed", label: "⚠️ Failed" },
                    { value: "pending", label: "⏳ Pending" }
                  ]}
                />
              </div>
              {selectedOrders.size > 0 && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                    {selectedOrders.size} order(s) selected
                  </span>
                  <Button onClick={handleBulkRetry} variant="primary" size="sm" disabled={loading}>
                    🔄 Retry Selected
                  </Button>
                  <Button onClick={() => setSelectedOrders(new Set())} variant="ghost" size="sm">
                    Clear Selection
                  </Button>
                </div>
              )}  
            </Card>
            </div>

            {/* Orders Table */}
            {filteredOrders.length > 0 ? (
              <Card>
                <CardHeader 
                  title="📋 Order List" 
                  subtitle={`${filteredOrders.length} orders`} 
                />
                <Table
                  columns={[
                    { 
                      key: "select", 
                      header: "", 
                      width: "50px",
                      render: (row: any) => (
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(row._order.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedOrders);
                            if (e.target.checked) {
                              newSet.add(row._order.id);
                            } else {
                              newSet.delete(row._order.id);
                            }
                            setSelectedOrders(newSet);
                          }}
                        />
                      )
                    },
                    { key: "shopeeOrder", header: "Shopee Order" },
                    { key: "amazonOrder", header: "Amazon Order", width: "180px" },
                    { key: "status", header: "Status", width: "120px" },
                    { key: "mode", header: "Mode", width: "100px" },
                    { key: "errors", header: "Errors", width: "80px" },
                    { key: "date", header: "Updated", width: "130px" },
                    { key: "actions", header: "Actions", width: "220px" }
                  ]}
                  data={filteredOrders.map((order, index) => ({
                    _order: order,
                    select: null,
                    shopeeOrder: (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {order.shopeeOrderSn}
                        </div>
                      </div>
                    ),
                    amazonOrder: order.amazonOrder?.amazonOrderId ? (
                      <div style={{ fontSize: 13 }}>
                        <code>{order.amazonOrder.amazonOrderId}</code>
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>—</span>
                    ),
                    status: getStatusBadge(order.processingStatus),
                    mode: order.processingMode ? (
                      <Badge variant="info">{order.processingMode}</Badge>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>—</span>
                    ),
                    errors: order.errorItems.length > 0 ? (
                      <Badge variant="error">{order.errorItems.length}</Badge>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>0</span>
                    ),
                    date: (
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        {new Date(order.updatedAt).toLocaleDateString()}
                      </span>
                    ),
                    actions: (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                        >
                          View
                        </Button>
                        {order.processingStatus === "FAILED" && (
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleRetryOrder(order.id)}
                            disabled={loading}
                          >
                            Retry
                          </Button>
                        )}
                        {!order.amazonOrder && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleManualMark(order.id)}
                            disabled={loading}
                          >
                            Manual
                          </Button>
                        )}
                      </div>
                    )
                  }))}
                  onRowClick={(row: any) => {
                    setSelectedOrder(row._order);
                    setShowDetailModal(true);
                  }}
                />
              </Card>
            ) : (
              <EmptyState
                icon="📦"
                title="No Orders Found"
                description="Try adjusting your filters or search term"
              />
            )}
          </>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Modal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedOrder(null);
            }}
            title={`Order: ${selectedOrder.shopeeOrderSn}`}
            size="lg"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Order Info */}
              <div>
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>Order Information</h4>
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
                        <span style={{ color: "var(--color-text-muted)" }}>Not available</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <div>{getStatusBadge(selectedOrder.processingStatus)}</div>
                  </div>
                  <div>
                    <label className="label">Processing Mode</label>
                    <div style={{ fontSize: 14 }}>
                      {selectedOrder.processingMode || <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Created At</label>
                    <div style={{ fontSize: 14 }}>
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="label">Updated At</label>
                    <div style={{ fontSize: 14 }}>
                      {new Date(selectedOrder.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {selectedOrder.errorItems.length > 0 && (
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 12 }}>Errors ({selectedOrder.errorItems.length})</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedOrder.errorItems.map((error, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 16,
                          background: "var(--color-elevated)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-error)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 8 }}>
                          <Badge variant="error">{error.errorCode}</Badge>
                        </div>
                        <p style={{ margin: 0, fontSize: 14 }}>{error.reason}</p>
                        {error.amazonProductUrl && (
                          <a
                            href={error.amazonProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 13, color: "var(--color-primary)", marginTop: 8, display: "inline-block" }}
                          >
                            View Product →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 12 }}>
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
                    🔄 Retry Order
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
                    ✅ Mark as Manual
                  </Button>
                )}
                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="ghost"
                  fullWidth
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <Toast />

        <OnboardingTour 
          pageName="orders" 
          steps={ordersTour} 
          onComplete={() => setShowTour(false)} 
        />
        {!showTour && <HelpButton onClick={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem("tour_completed_orders");
            setShowTour(true);
            window.location.reload();
          }
        }} />}
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
