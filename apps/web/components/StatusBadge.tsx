type Props = {
  status: string;
  labels: {
    success: string;
    error: string;
    pending: string;
    manual: string;
  };
};

export default function StatusBadge({ status, labels }: Props) {
  const normalized = status?.toUpperCase?.() || "";
  let bg = "#cbd5e1";
  let color = "#0f172a";
  let text = status;

  if (["FULFILLED", "PLACED"].includes(normalized)) {
    bg = "#dcfce7";
    color = "#166534";
    text = labels.success;
  } else if (["FAILED", "SKIPPED"].includes(normalized)) {
    bg = "#fee2e2";
    color = "#991b1b";
    text = labels.error;
  } else if (["QUEUED", "PROCESSING", "UNPROCESSED"].includes(normalized)) {
    bg = "#e0f2fe";
    color = "#075985";
    text = labels.pending;
  } else if (["MANUAL_REVIEW"].includes(normalized)) {
    bg = "#e2e8f0";
    color = "#0f172a";
    text = labels.manual;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color
      }}
    >
      {text}
    </span>
  );
}
