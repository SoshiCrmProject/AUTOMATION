import { useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import Toast, { pushToast } from "../components/Toast";
import ManualOrderForm, { ManualOrderInput } from "../components/manual-orders/ManualOrderForm";
import ManualOrderList, { ManualOrderRecord, ManualOrderStatus } from "../components/manual-orders/ManualOrderList";
import { Card, CardHeader, StatCard, Badge, Button, Input, Select, Textarea, Alert, Modal } from "../components/ui";
import api from "../lib/apiClient";

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const PAGE_SIZE = 25;

type Shop = { id: string; name?: string | null };

type ManualOrdersResponse = {
  orders: ManualOrderRecord[];
  nextCursor: string | null;
};

type StatusFilter = ManualOrderStatus | "all";

export default function ManualOrdersPage() {
  const { t } = useTranslation("common");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManualOrderRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ManualOrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: shopsResponse } = useSWR<Shop[]>("/shops", fetcher, { revalidateOnFocus: false });
  const shopOptions = useMemo(
    () => (shopsResponse ?? []).map((shop) => ({ id: shop.id, name: shop.name ?? shop.id })),
    [shopsResponse]
  );

  const getKey = (pageIndex: number, previousPageData: ManualOrdersResponse | null) => {
    if (previousPageData && !previousPageData.nextCursor) {
      return null;
    }
    const params = new URLSearchParams({ limit: PAGE_SIZE.toString() });
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set("cursor", previousPageData.nextCursor);
    }
    return `/manual-orders?${params.toString()}`;
  };

  const { data: pages, error, size, setSize, mutate } = useSWRInfinite<ManualOrdersResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    persistSize: true
  });

  const orders = useMemo(() => pages?.flatMap((page) => page?.orders ?? []) ?? [], [pages]);
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      return (
        order.buyerName.toLowerCase().includes(query) ||
        order.productUrl.toLowerCase().includes(query) ||
        (order.amazonOrderId?.toLowerCase().includes(query) ?? false) ||
        (order.asin?.toLowerCase().includes(query) ?? false) ||
        order.phone.toLowerCase().includes(query)
      );
    });
  }, [orders, searchTerm]);

  const stats = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      { total: 0, PENDING: 0, PROCESSING: 0, FAILED: 0, FULFILLED: 0, CANCELLED: 0 } as Record<string, number>
    );
  }, [orders]);

  const hasMore = Boolean(pages?.[pages.length - 1]?.nextCursor);
  const initialLoading = !pages && !error;

  const handleCreate = async (payload: ManualOrderInput) => {
    try {
      setIsCreating(true);
      await api.post("/manual-orders", payload);
      pushToast(t("manualOrderCreated") || "Manual order queued", "success");
      await mutate();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Failed to create manual order";
      pushToast(message, "error");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const refreshOrders = () => mutate();
  const loadMore = () => {
    if (hasMore) {
      setSize((prev) => prev + 1);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    try {
      await api.post(`/manual-orders/${cancelTarget.id}/cancel`, { reason: cancelReason || undefined });
      pushToast(t("manualOrderCancelled") || "Manual order cancelled", "success");
      setCancelTarget(null);
      setCancelReason("");
      await mutate();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Failed to cancel manual order";
      pushToast(message, "error");
    }
  };

  const heroBadge = <Badge variant="info">{t("manualOrdersLiveBadge") || "Manual Amazon ordering"}</Badge>;
  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      <StatCard icon="⚙️" label={t("pending") || "Pending"} value={(stats.PENDING || 0) + (stats.PROCESSING || 0)} color="warning" />
      <StatCard icon="✅" label={t("fulfilled") || "Fulfilled"} value={stats.FULFILLED || 0} color="success" />
      <StatCard icon="🛑" label={t("failed") || "Failed"} value={(stats.FAILED || 0) + (stats.CANCELLED || 0)} color="error" />
    </div>
  );

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div className="full-width-mobile" style={{ flex: "1 1 280px", minWidth: 200 }}>
        <Input
          placeholder={t("searchManualOrders") || "Search buyer, ASIN, phone"}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      <div className="full-width-mobile" style={{ flex: "0 0 220px", minWidth: 180 }}>
        <Select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter);
            setSize(1);
          }}
          options={[
            { value: "all", label: t("allOrders") || "All" },
            { value: "PENDING", label: t("pending") || "Pending" },
            { value: "PROCESSING", label: t("processing") || "Processing" },
            { value: "FULFILLED", label: t("fulfilled") || "Fulfilled" },
            { value: "FAILED", label: t("failed") || "Failed" },
            { value: "CANCELLED", label: t("cancelled") || "Cancelled" }
          ]}
        />
      </div>
      <Button variant="ghost" onClick={() => { setStatusFilter("all"); setSearchTerm(""); setSize(1); }}>
        🧼 {t("clearFilters") || "Clear filters"}
      </Button>
    </div>
  );

  const actions = (
    <div className="stack-md wrap">
      <Button variant="ghost" onClick={refreshOrders}>
        ♻️ {t("refreshData") || "Refresh"}
      </Button>
      <Button variant="ghost" onClick={() => setSize(1)}>
        🔁 {t("reloadLatest") || "Reload"}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.assign("/orders");
          }
        }}
      >
        ↩️ {t("backToShopeeOrders") || "Shopee orders"}
      </Button>
    </div>
  );

  return (
    <>
      <PageLayout
        activeHref="/manual-orders"
        title={t("manualOrdersTitle") || "Manual Amazon Orders"}
        description={t("manualOrdersHeroDescription") || "Submit any address and drop-ship it through your saved Amazon credentials."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        toolbar={toolbar}
        actions={actions}
        heroBackground="linear-gradient(120deg, #667eea 0%, #764ba2 100%)"
        heroTone="dark"
      >
        {error && (
          <Alert variant="error" title={t("failedToLoadOrders") || "Failed to load orders"}>
            {error?.message || t("tryRefreshing") || "Try refreshing"}
          </Alert>
        )}

        <div className="grid grid-2" style={{ gap: 24 }}>
          <ManualOrderForm shops={shopOptions} isSubmitting={isCreating} onSubmit={handleCreate} />
          <Card>
            <CardHeader title={t("manualOrderPlaybook") || "Playbook"} subtitle={t("manualOrderPlaybookSubtitle") || "Use cases and guardrails"} icon="📘" />
            <div className="stack-md" style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
              <div>
                <strong>1.</strong> {t("manualOrderStepOne") || "Capture the buyer's address exactly as it should appear on Amazon."}
              </div>
              <div>
                <strong>2.</strong> {t("manualOrderStepTwo") || "Submit the product URL or ASIN from Amazon JP."}
              </div>
              <div>
                <strong>3.</strong> {t("manualOrderStepThree") || "Watch the queue below. Orders stay cancellable until automation starts."}
              </div>
              <Alert variant="info" title={t("manualOrderReminderTitle") || "Reminder"}>
                {t("manualOrderReminderBody") || "Amazon shipping labels must already exist under your saved account."}
              </Alert>
            </div>
          </Card>
        </div>

        <ManualOrderList
          orders={filteredOrders}
          loading={initialLoading && filteredOrders.length === 0}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onCancel={(order) => setCancelTarget(order)}
          onRefresh={refreshOrders}
          onSelectOrder={(order) => setSelectedOrder(order)}
        />
      </PageLayout>

      <Toast />

      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`${t("manualOrderDetail") || "Manual order"} · ${selectedOrder.buyerName}`}
          size="lg"
        >
          <div className="stack-md">
            <div>
              <h4>{t("shippingAddress") || "Shipping address"}</h4>
              <p style={{ margin: 0, fontSize: 14 }}>
                {selectedOrder.addressLine1}
                {selectedOrder.addressLine2 ? `, ${selectedOrder.addressLine2}` : ""}
                <br />
                {selectedOrder.city}, {selectedOrder.state || selectedOrder.country} {selectedOrder.postalCode}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
                {t("shippingLabel") || "Label"}: {selectedOrder.shippingAddressLabel || selectedOrder.buyerName}
              </p>
            </div>
            <div>
              <h4>{t("product") || "Product"}</h4>
              <a href={selectedOrder.productUrl} target="_blank" rel="noopener noreferrer">
                {selectedOrder.productUrl}
              </a>
              {selectedOrder.asin && (
                <p style={{ margin: 0 }}>
                  ASIN: <code>{selectedOrder.asin}</code>
                </p>
              )}
            </div>
            {selectedOrder.notes && (
              <div>
                <h4>{t("notes") || "Notes"}</h4>
                <p style={{ whiteSpace: "pre-wrap" }}>{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          isOpen={Boolean(cancelTarget)}
          onClose={() => {
            setCancelTarget(null);
            setCancelReason("");
          }}
          title={t("cancelManualOrder") || "Cancel manual order"}
        >
          <p style={{ marginTop: 0, color: "var(--color-text-muted)" }}>
            {t("cancelManualOrderDescription") || "This stops automation if it has not finished yet."}
          </p>
          <Textarea
            label={t("reasonOptional") || "Reason (optional)"}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              {t("close") || "Close"}
            </Button>
            <Button variant="warning" onClick={handleCancelOrder}>
              {t("cancelOrder") || "Cancel order"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
// End of file - duplicate concatenated content removed to fix build errors
