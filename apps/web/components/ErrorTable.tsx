import { useTranslation } from "next-i18next";

type ErrorItem = {
  id: string;
  shopeeOrderId?: string | null;
  amazonProductUrl?: string | null;
  errorCode?: string | null;
  reason: string;
  filterFailureType?: string | null;
  profitValue?: number | null;
  shippingDays?: number | null;
  createdAt: string;
  metadata?: { screenshot?: string };
};

type Props = {
  items: ErrorItem[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string, orderId?: string) => void;
};

export default function ErrorTable({ items, selectable, selected, onToggle }: Props) {
  const { t } = useTranslation("common");
  if (!items.length) return <p>{t("noErrors")}</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {selectable && <th></th>}
          <th style={{ textAlign: "left" }}>{t("orders")}</th>
          <th style={{ textAlign: "left" }}>{t("reason")}</th>
          <th style={{ textAlign: "left" }}>{t("amazon")}</th>
          <th style={{ textAlign: "left" }}>{t("createdAt")}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const key = item.shopeeOrderId ?? item.id;
          const checked = selected?.has(key) ?? false;
          return (
            <tr key={item.id}>
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle?.(item.id, item.shopeeOrderId ?? undefined)}
                  />
                </td>
              )}
              <td style={{ padding: "6px 4px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong>{item.shopeeOrderId ?? key}</strong>
                  {item.amazonProductUrl ? (
                    <a href={item.amazonProductUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                      {t("amazonPage")}
                    </a>
                  ) : null}
                </div>
              </td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span>{item.reason || item.errorCode}</span>
                  {item.errorCode && <span style={{ color: "#475569", fontSize: 12 }}>{item.errorCode}</span>}
                  {item.filterFailureType && <span style={{ color: "#475569", fontSize: 12 }}>{item.filterFailureType}</span>}
                  {item.profitValue !== null && item.profitValue !== undefined && (
                    <span style={{ color: "#475569", fontSize: 12 }}>
                      {t("minProfit")}: {item.profitValue}
                    </span>
                  )}
                  {item.shippingDays !== null && item.shippingDays !== undefined && (
                    <span style={{ color: "#475569", fontSize: 12 }}>
                      {t("shippingDaysLabel") ?? "Shipping days"}: {item.shippingDays}
                    </span>
                  )}
                  {item.metadata?.screenshot && (
                    <a href={item.metadata.screenshot} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 12 }}>
                      {t("openLink")}
                    </a>
                  )}
                </div>
              </td>
              <td>
                {item.amazonProductUrl ? (
                  <a href={item.amazonProductUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                    {t("amazonPage")}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{new Date(item.createdAt).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
