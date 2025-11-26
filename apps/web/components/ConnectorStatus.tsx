import { useEffect, useState } from "react";
import api from "../lib/apiClient";
import { useTranslation } from "next-i18next";

type Status = {
  lastOrder: string | null;
  lastAmazon: { createdAt: string; status: string } | null;
  lastError: { createdAt: string; reason: string } | null;
};

export default function ConnectorStatus() {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/ops/status")
      .then((res) => setStatus(res.data))
      .catch((e: any) => setError(e?.response?.data?.error ?? t("genericError")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-3">
      {loading && <p>{t("loading")}</p>}
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      {!loading && !error && (
        <>
          <StatusCard
            title={t("statusShopeePoll")}
            value={status?.lastOrder ? new Date(status.lastOrder).toLocaleString() : "—"}
            desc={t("statusLastOrderFetched")}
          />
          <StatusCard
            title={t("statusAmazon")}
            value={status?.lastAmazon ? new Date(status.lastAmazon.createdAt).toLocaleString() : "—"}
            desc={status?.lastAmazon?.status || t("statusNoOrders")}
          />
          <StatusCard
            title={t("statusErrors")}
            value={status?.lastError ? new Date(status.lastError.createdAt).toLocaleString() : "—"}
            desc={status?.lastError?.reason || t("statusNoRecentErrors")}
          />
        </>
      )}
    </div>
  );
}

function StatusCard({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{title}</p>
      <h3 style={{ margin: "4px 0" }}>{value}</h3>
      <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>{desc}</p>
    </div>
  );
}
