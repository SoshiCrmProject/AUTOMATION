import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";

let globalPush: ((msg: string, type?: "error" | "success") => void) | null = null;

export function pushToast(message: string, type: "error" | "success" = "success") {
  if (globalPush) globalPush(message, type);
}

export default function Toast() {
  const { t } = useTranslation("common");
  const [toasts, setToasts] = useState<{ message: string; type: "error" | "success"; id: number }[]>([]);

  useEffect(() => {
    globalPush = (message, type = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { message, type, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => { globalPush = null; };
  }, []);

  return (
    <div style={{ position: "fixed", top: 20, right: 20, display: "grid", gap: 8, zIndex: 9999 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="card"
          style={{
            minWidth: 240,
            borderLeft: `4px solid ${toast.type === "error" ? "#f87171" : "#22c55e"}`,
            background: "rgba(15,23,42,0.9)"
          }}
          role="status"
          aria-live="polite"
        >
          <strong>{toast.type === "error" ? t("toastError") : t("toastSuccess")}</strong>
          <p style={{ margin: 0, color: "#cbd5e1" }}>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
