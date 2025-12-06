import { useMemo } from "react";
import { useTranslation } from "next-i18next";
import { Card, CardHeader } from "../ui/Card";
import { Button, Badge } from "../ui";
import { Table } from "../ui/Table";
import { EmptyState, LoadingSpinner } from "../ui/Utility";
import { ManualOrderInput } from "./ManualOrderForm";

export type ManualOrderStatus = "PENDING" | "PROCESSING" | "FULFILLED" | "FAILED" | "CANCELLED";

export type ManualOrderRecord = ManualOrderInput & {
  id: string;
  failureCode?: string | null;
  failureReason?: string | null;
  amazonOrderId?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: { id: string; name: string } | null;
  status: ManualOrderStatus;
  purchasePrice?: number | string | null;
};

type ManualOrderListProps = {
  orders: ManualOrderRecord[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onCancel: (order: ManualOrderRecord) => void;
  onRefresh: () => void;
  onSelectOrder: (order: ManualOrderRecord) => void;
};

const statusVariantMap: Record<ManualOrderStatus, "default" | "info" | "success" | "warning" | "error"> = {
  PENDING: "warning",
  PROCESSING: "info",
  FULFILLED: "success",
  FAILED: "error",
  CANCELLED: "default"
};

function StatusCell({ order }: { order: ManualOrderRecord }) {
  const { t } = useTranslation("common");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Badge variant={statusVariantMap[order.status]}> {t(order.status.toLowerCase()) || order.status} </Badge>
      {order.failureReason && (
        <span style={{ fontSize: 12, color: "var(--color-error)" }}>{order.failureReason}</span>
      )}
      {order.amazonOrderId && (
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {t("amazonOrderId") || "Amazon ID"}: <code>{order.amazonOrderId}</code>
        </span>
      )}
    </div>
  );
}

function ProductCell({ order }: { order: ManualOrderRecord }) {
  const { t } = useTranslation("common");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <a href={order.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
        {t("viewProduct") || "View product"}
      </a>
      {order.asin && (
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          ASIN: <code>{order.asin}</code>
        </span>
      )}
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        Qty ×{order.quantity}
      </span>
    </div>
  );
}

function BuyerCell({ order }: { order: ManualOrderRecord }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontWeight: 600 }}>{order.buyerName}</span>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{order.phone}</span>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        {order.city}, {order.state || order.country}
      </span>
    </div>
  );
}

function PriceCell({ order }: { order: ManualOrderRecord }) {
  const value = typeof order.purchasePrice === "string" ? Number(order.purchasePrice) : order.purchasePrice;
  if (!value || Number.isNaN(value)) {
    return <span style={{ color: "var(--color-text-muted)" }}>—</span>;
  }
  return <span>{value.toLocaleString(undefined, { style: "currency", currency: "JPY", currencyDisplay: "narrowSymbol" })}</span>;
}

export default function ManualOrderList({
  orders,
  loading,
  hasMore,
  onLoadMore,
  onCancel,
  onRefresh,
  onSelectOrder
}: ManualOrderListProps) {
  const { t } = useTranslation("common");
  const columns = useMemo(() => {
    return [
      {
        key: "shop",
        header: t("shop") || "Shop",
        render: (row: ManualOrderRecord) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{row.shop?.name || t("unknownShop") || "Manual"}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {new Date(row.createdAt).toLocaleString()}
            </span>
          </div>
        )
      },
      {
        key: "product",
        header: t("product") || "Product",
        render: (row: ManualOrderRecord) => <ProductCell order={row} />
      },
      {
        key: "buyer",
        header: t("buyer") || "Buyer",
        render: (row: ManualOrderRecord) => <BuyerCell order={row} />
      },
      {
        key: "status",
        header: t("status") || "Status",
        render: (row: ManualOrderRecord) => <StatusCell order={row} />
      },
      {
        key: "price",
        header: t("purchasePrice") || "Price",
        render: (row: ManualOrderRecord) => <PriceCell order={row} />
      },
      {
        key: "actions",
        header: t("actions") || "Actions",
        width: "160px",
        render: (row: ManualOrderRecord) => (
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="ghost" onClick={(event) => {
              event.stopPropagation();
              onSelectOrder(row);
            }}>
              {t("view") || "View"}
            </Button>
            {['PENDING', 'PROCESSING'].includes(row.status) && (
              <Button
                size="sm"
                variant="warning"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancel(row);
                }}
              >
                {t("cancel") || "Cancel"}
              </Button>
            )}
          </div>
        )
      }
    ];
  }, [t, onCancel, onSelectOrder]);

  if (loading && orders.length === 0) {
    return (
      <Card>
        <CardHeader title={t("manualOrdersQueue") || "Manual order queue"} icon="📦" />
        <LoadingSpinner text={t("loadingOrders") || "Loading"} />
      </Card>
    );
  }

  if (!loading && orders.length === 0) {
    return (
      <Card>
        <CardHeader title={t("manualOrdersQueue") || "Manual order queue"} icon="📦" />
        <EmptyState
          icon="🧾"
          title={t("noManualOrdersYet") || "No manual orders yet"}
          description={t("noManualOrdersDescription") || "Submit an order above and it will appear here."}
          action={<Button onClick={onRefresh} variant="ghost">{t("refreshData") || "Refresh"}</Button>}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("manualOrdersQueue") || "Manual order queue"}
        subtitle={`${orders.length} ${t("orders") || "orders"}`}
        icon="📦"
        action={
          <Button variant="ghost" onClick={onRefresh}>
            ♻️ {t("refreshData") || "Refresh"}
          </Button>
        }
      />
      <Table columns={columns} data={orders} onRowClick={onSelectOrder} idKey="id" />
      {hasMore && (
        <div style={{ padding: 16, textAlign: "center" }}>
          <Button onClick={onLoadMore} variant="ghost">
            ⏬ {t("loadMore") || "Load more"}
          </Button>
        </div>
      )}
    </Card>
  );
}
