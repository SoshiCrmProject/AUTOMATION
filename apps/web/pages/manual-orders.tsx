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
}import { useState, useMemo, useEffect, FormEvent } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import PageLayout from "../components/PageLayout";
import Toast, { pushToast } from "../components/Toast";
import api from "../lib/apiClient";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
  EmptyState,
  Alert,
  Modal
} from "../components/ui";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const statusVariantMap: Record<string, "info" | "success" | "warning" | "error" | "default"> = {
  PENDING: "warning",
  PROCESSING: "info",
  FULFILLED: "success",
  FAILED: "error",
  CANCELLED: "default"
};

type ManualOrderStatus = "PENDING" | "PROCESSING" | "FULFILLED" | "FAILED" | "CANCELLED";

type ManualOrder = {
  id: string;
  productUrl: string;
  asin?: string | null;
  quantity: number;
  notes?: string | null;
  buyerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  shippingAddressLabel: string;
  status: ManualOrderStatus;
  failureCode?: string | null;
  failureReason?: string | null;
  amazonOrderId?: string | null;
  purchasePrice?: string | number | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: { id: string; name?: string | null } | null;
};

type ManualOrdersResponse = {
  orders: ManualOrder[];
  nextCursor: string | null;
};

type Shop = {
  id: string;
  name?: string | null;
};

type FormState = {
  productUrl: string;
  asin: string;
  quantity: number;
  notes: string;
  shopId: string;
  buyerName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  shippingAddressLabel: string;
  purchasePrice: string;
};

const defaultForm: FormState = {
  productUrl: "",
  asin: "",
  quantity: 1,
  notes: "",
  shopId: "auto",
  buyerName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Japan",
  shippingAddressLabel: "",
  purchasePrice: ""
};

export default function ManualOrdersPage() {
  const { t } = useTranslation("common");
  const [formState, setFormState] = useState<FormState>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ManualOrderStatus | "all">("all");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState<ManualOrder | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const { data, error, mutate } = useSWR<ManualOrdersResponse>("/manual-orders", fetcher, {
    refreshInterval: 20000
  });
  const { data: shopsData } = useSWR<Shop[]>("/shops", fetcher);

  useEffect(() => {
    if (data) {
      setOrders(data.orders || []);
      setNextCursor(data.nextCursor || null);
    }
  }, [data]);

  const isLoading = !data && !error;
  const shops: Shop[] = Array.isArray(shopsData) ? shopsData : [];

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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" ? true : order.status === statusFilter;
      const matchesShop = shopFilter === "all" ? true : order.shop?.id === shopFilter;
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        order.buyerName.toLowerCase().includes(query) ||
        order.amazonOrderId?.toLowerCase().includes(query) ||
        order.asin?.toLowerCase().includes(query) ||
        order.productUrl.toLowerCase().includes(query);
      return matchesStatus && matchesShop && matchesSearch;
    });
  }, [orders, statusFilter, shopFilter, searchTerm]);

  const updateForm = (field: keyof FormState, value: string | number) => {
    setFormState((prev) => ({
      ...prev,
      [field]: typeof value === "number" ? value : value
    }));
  };

  const resetForm = () => {
    setFormState(defaultForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);

    try {
      const payload = {
        productUrl: formState.productUrl.trim(),
        asin: formState.asin.trim() || undefined,
        quantity: Math.max(1, Number(formState.quantity) || 1),
        notes: formState.notes.trim() || undefined,
        shopId: formState.shopId === "auto" ? undefined : formState.shopId,
        buyerName: formState.buyerName.trim(),
        phone: formState.phone.trim(),
        addressLine1: formState.addressLine1.trim(),
        addressLine2: formState.addressLine2.trim() || undefined,
        city: formState.city.trim(),
        state: formState.state.trim() || undefined,
        postalCode: formState.postalCode.trim(),
        country: formState.country.trim(),
        shippingAddressLabel: formState.shippingAddressLabel.trim() || formState.buyerName.trim(),
        purchasePrice: formState.purchasePrice ? Number(formState.purchasePrice) : undefined
      };

      await api.post("/manual-orders", payload);
      pushToast(t("manualOrdersCreateSuccess") || "Manual order queued", "success");
      resetForm();
      await mutate();
    } catch (err: any) {
      const message = err?.response?.data?.error || t("manualOrdersCreateError") || "Failed to queue manual order";
      pushToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await api.get<ManualOrdersResponse>("/manual-orders", {
        params: { cursor: nextCursor }
      });
      setOrders((prev) => [...prev, ...(response.data.orders || [])]);
      setNextCursor(response.data.nextCursor || null);
    } catch (err: any) {
      const message = err?.response?.data?.error || t("manualOrdersLoadMoreError") || "Failed to load more orders";
      pushToast(message, "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const openCancelModal = (order: ManualOrder) => {
    setCancelTarget(order);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelTarget(null);
    setCancelReason("");
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    setSubmittingCancel(true);
    try {
      await api.post(`/manual-orders/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim() || undefined
      });
      pushToast(t("manualOrdersCancelSuccess") || "Manual order cancelled", "success");
      await mutate();
    } catch (err: any) {
      const message = err?.response?.data?.error || t("manualOrdersCancelError") || "Failed to cancel manual order";
      pushToast(message, "error");
    } finally {
      setSubmittingCancel(false);
      closeCancelModal();
    }
  };

  const heroBadge = (
    <Badge variant="info">{t("manualOrdersHeroBadge") || "Amazon-only path"}</Badge>
  );

  const heroAside = (
    <div style={{ display: "grid", gap: 12 }}>
      {[
        {
          label: t("manualOrdersStatsPending") || "Pending",
          value: stats.PENDING || 0,
          helper: t("manualOrdersStatsPendingHelper") || "Waiting for automation"
        },
        {
          label: t("manualOrdersStatsProcessing") || "Processing",
          value: stats.PROCESSING || 0,
          helper: t("manualOrdersStatsProcessingHelper") || "Actively running"
        },
        {
          label: t("manualOrdersStatsFulfilled") || "Fulfilled",
          value: stats.FULFILLED || 0,
          helper: t("manualOrdersStatsFulfilledHelper") || "Completed drops"
        }
      ].map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.08)"
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{stat.label}</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{stat.value}</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{stat.helper}</p>
        </div>
      ))}
    </div>
  );

  const heroFooter = (
    <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
      {t("manualOrdersHeroFooter") || "Use this flow whenever you need to buy on Amazon without a Shopee trigger."}
    </span>
  );

  const actions = (
    <div style={{ display: "flex", gap: 12 }}>
      <Button variant="ghost" onClick={() => mutate()} disabled={isLoading}>
        🔄 {t("manualOrdersRefresh") || "Refresh list"}
      </Button>
    </div>
  );

  const toolbar = (
    <div className="stack-md wrap" style={{ alignItems: "center" }}>
      <div style={{ flex: "1 1 260px", minWidth: 220 }}>
        <Input
          placeholder={t("manualOrdersSearchPlaceholder") || "Search by buyer, ASIN, or Amazon order"}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      <div style={{ flex: "0 0 220px", minWidth: 200 }}>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ManualOrderStatus | "all")}
          options={[
            { value: "all", label: t("manualOrdersFilterAll") || "All statuses" },
            { value: "PENDING", label: t("manualOrdersPending") || "Pending" },
            { value: "PROCESSING", label: t("manualOrdersProcessing") || "Processing" },
            { value: "FULFILLED", label: t("manualOrdersFulfilled") || "Fulfilled" },
            { value: "FAILED", label: t("manualOrdersFailed") || "Failed" },
            { value: "CANCELLED", label: t("manualOrdersCancelled") || "Cancelled" }
          ]}
        />
      </div>
      <div style={{ flex: "0 0 220px", minWidth: 200 }}>
        <Select
          value={shopFilter}
          onChange={(event) => setShopFilter(event.target.value)}
          options={[
            { value: "all", label: t("manualOrdersAllShops") || "All shops" },
            ...shops.map((shop) => ({ value: shop.id, label: shop.name || shop.id }))
          ]}
        />
      </div>
      <div style={{ flex: "0 0 180px", minWidth: 160 }}>
        <Button variant="secondary" onClick={() => mutate()}>
          {t("manualOrdersRefresh") || "Refresh list"}
        </Button>
      </div>
    </div>
  );

  const sidebar = (
    <Card>
      <CardHeader
        title={t("manualOrdersGuardrailsTitle") || "Address guardrails"}
        description={t("manualOrdersGuardrailsDesc") || "The Amazon shipping label must already exist on the Amazon account."}
      />
      <ul style={{ paddingLeft: 18, margin: "0 0 16px 0", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
        <li>{t("manualOrdersGuardrailAddress") || "We ship to the address that matches the label exactly."}</li>
        <li>{t("manualOrdersGuardrailQuantity") || "Quantity > 1 will repeat the Amazon checkout that many times."}</li>
        <li>{t("manualOrdersGuardrailAudit") || "All requests are logged to the audit trail automatically."}</li>
      </ul>
      <Alert
        variant="info"
        title={t("manualOrdersAddressHelperTitle") || "Need a new label?"}
        description={t("manualOrdersAddressHelper") || "Add it inside Amazon first, then reference the exact label text here."}
      />
    </Card>
  );

  return (
    <>
      <PageLayout
        title={t("manualOrdersTitle") || "Manual Amazon orders"}
        description={t("manualOrdersDescription") || "Place Amazon orders even without a Shopee order and capture every shipping detail."}
        heroBadge={heroBadge}
        heroAside={heroAside}
        heroFooter={heroFooter}
        actions={actions}
        toolbar={toolbar}
        sidebar={sidebar}
        activeHref="/manual-orders"
        heroTone="dark"
        heroBackground="linear-gradient(120deg, #0f172a, #1e1b4b, #0f766e)"
      >
        <div className="stack-xl">
          <Card>
            <CardHeader
              title={t("manualOrdersCreateCardTitle") || "Create manual Amazon order"}
              description={t("manualOrdersCreateCardDesc") || "Provide the Amazon link, quantity, and shipping label we should use."}
            />
            <form className="stack-md" onSubmit={handleSubmit}>
              <div className="grid-2" style={{ gap: 16 }}>
                <Input
                  label={t("manualOrdersProductUrl") || "Amazon product URL"}
                  value={formState.productUrl}
                  onChange={(event) => updateForm("productUrl", event.target.value)}
                  required
                />
                <Input
                  label={t("manualOrdersASIN") || "ASIN (optional)"}
                  value={formState.asin}
                  onChange={(event) => updateForm("asin", event.target.value.toUpperCase())}
                />
              </div>
              <div className="grid-3" style={{ gap: 16 }}>
                <Select
                  label={t("manualOrdersShopLabel") || "Shop"}
                  value={formState.shopId}
                  onChange={(event) => updateForm("shopId", event.target.value)}
                  options={[
                    { value: "auto", label: t("manualOrdersAutoShop") || "Auto (primary shop)" },
                    ...shops.map((shop) => ({ value: shop.id, label: shop.name || shop.id }))
                  ]}
                />
                <Input
                  type="number"
                  min={1}
                  label={t("manualOrdersQuantity") || "Quantity"}
                  value={formState.quantity}
                  onChange={(event) => updateForm("quantity", Number(event.target.value))}
                  hint={t("manualOrdersQuantityHelper") || "We will repeat the checkout this many times."}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  label={t("manualOrdersPurchasePrice") || "Purchase price (optional)"}
                  value={formState.purchasePrice}
                  onChange={(event) => updateForm("purchasePrice", event.target.value)}
                  hint={t("manualOrdersPurchasePriceHint") || "Leave blank to let automation record it."}
                />
              </div>
              <Textarea
                label={t("manualOrdersNotesLabel") || "Internal notes"}
                value={formState.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder={t("manualOrdersNotesPlaceholder") || "Anything ops should know before fulfilling."}
              />
              <div className="grid-2" style={{ gap: 16 }}>
                <Input
                  label={t("manualOrdersBuyerName") || "Recipient name"}
                  value={formState.buyerName}
                  onChange={(event) => updateForm("buyerName", event.target.value)}
                  required
                />
                <Input
                  label={t("manualOrdersPhone") || "Phone number"}
                  value={formState.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                />
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                <Input
                  label={t("manualOrdersAddress1") || "Address line 1"}
                  value={formState.addressLine1}
                  onChange={(event) => updateForm("addressLine1", event.target.value)}
                  required
                />
                <Input
                  label={t("manualOrdersAddress2") || "Address line 2"}
                  value={formState.addressLine2}
                  onChange={(event) => updateForm("addressLine2", event.target.value)}
                />
              </div>
              <div className="grid-3" style={{ gap: 16 }}>
                <Input
                  label={t("manualOrdersCity") || "City"}
                  value={formState.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  required
                />
                <Input
                  label={t("manualOrdersState") || "State / Prefecture"}
                  value={formState.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                />
                <Input
                  label={t("manualOrdersPostalCode") || "Postal code"}
                  value={formState.postalCode}
                  onChange={(event) => updateForm("postalCode", event.target.value)}
                  required
                />
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                <Input
                  label={t("manualOrdersCountry") || "Country"}
                  value={formState.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  required
                />
                <Input
                  label={t("manualOrdersShippingLabel") || "Amazon shipping label"}
                  value={formState.shippingAddressLabel}
                  onChange={(event) => updateForm("shippingAddressLabel", event.target.value)}
                  hint={t("manualOrdersAddressHelper") || "Must match the saved label inside Amazon."}
                />
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  {t("reset") || "Reset"}
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? t("processingPlaceholder") || "Processing..." : t("manualOrdersSubmit") || "Create manual order"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title={t("manualOrdersHistoryTitle") || "Manual order activity"}
              description={t("manualOrdersHistoryDesc") || "Track every manual Amazon purchase, status, and exception."}
            />
            {error && (
              <Alert
                variant="error"
                title={t("manualOrdersLoadError") || "Could not load manual orders"}
                description={t("manualOrdersLoadErrorDesc") || "Refresh the page or try again."}
              />
            )}
            {isLoading ? (
              <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
                <LoadingSpinner />
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                title={t("manualOrdersEmptyTitle") || "No manual orders yet"}
                description={t("manualOrdersEmptyDesc") || "Create one above to place a direct Amazon purchase."}
              />
            ) : (
              <div className="stack-md">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Badge variant={statusVariantMap[order.status] || "default"}>{order.status}</Badge>
                        {order.shop && <Badge variant="info">{order.shop.name || order.shop.id}</Badge>}
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {order.status !== "FULFILLED" && order.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => openCancelModal(order)}
                          >
                            {t("manualOrdersCancel") || "Cancel"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(order.productUrl, "_blank")}
                        >
                          {t("openLink") || "Open"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid-2" style={{ gap: 16 }}>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.buyerName}</p>
                        <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                          {order.addressLine1}
                          {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                          <br />
                          {order.city}
                          {order.state ? `, ${order.state}` : ""}
                          <br />
                          {order.postalCode} · {order.country}
                          <br />
                          📞 {order.phone}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t("manualOrdersProduct") || "Product"}</p>
                        <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                          {order.asin && (
                            <>
                              ASIN: <code>{order.asin}</code>
                              <br />
                            </>
                          )}
                          Qty: {order.quantity}
                          <br />
                          {order.amazonOrderId && (
                            <>
                              Amazon #: <code>{order.amazonOrderId}</code>
                              <br />
                            </>
                          )}
                          {order.purchasePrice && (
                            <>
                              {t("priceLabel") || "Price"}: ¥{Number(order.purchasePrice).toLocaleString()}
                              <br />
                            </>
                          )}
                          {order.shippingAddressLabel && (
                            <>
                              {t("manualOrdersShippingLabel") || "Amazon label"}: {order.shippingAddressLabel}
                              <br />
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {order.failureReason && (
                      <Alert
                        variant="error"
                        title={order.failureCode || t("manualOrdersFailure") || "Automation error"}
                        description={order.failureReason}
                      />
                    )}
                    {order.notes && (
                      <Alert
                        variant="info"
                        title={t("manualOrdersNotesLabel") || "Internal notes"}
                        description={order.notes}
                      />
                    )}
                  </div>
                ))}
                {nextCursor && (
                  <Button onClick={handleLoadMore} disabled={loadingMore} variant="ghost">
                    {loadingMore ? t("loading") || "Loading..." : t("manualOrdersLoadMore") || "Load more"}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </PageLayout>

      <Modal
        isOpen={cancelModalOpen}
        onClose={closeCancelModal}
        title={t("manualOrdersCancel") || "Cancel order"}
        footer={
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="ghost" onClick={closeCancelModal} disabled={submittingCancel}>
              {t("cancel") || "Close"}
            </Button>
            <Button variant="warning" onClick={handleCancelOrder} disabled={submittingCancel}>
              {submittingCancel ? t("loading") || "Loading..." : t("manualOrdersCancelSubmit") || "Confirm cancel"}
            </Button>
          </div>
        }
      >
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          {t("manualOrdersCancelPrompt") || "Add an optional reason so teammates know why this run was stopped."}
        </p>
        <Textarea
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder={t("manualOrdersCancelReasonLabel") || "Reason (optional)"}
        />
      </Modal>

      <Toast />
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
