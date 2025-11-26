import { useState } from "react";

interface CredentialError {
  code: string;
  message: string;
  requestId?: string;
}

interface Props {
  error: CredentialError | null;
  platform: "shopee" | "amazon";
  onRetry?: () => void;
}

const SHOPEE_ERROR_SOLUTIONS: Record<string, { title: string; solution: string; steps: string[] }> = {
  "error.invalid_sign": {
    title: "Invalid Signature",
    solution: "Your API credentials may be incorrect or the request signature failed.",
    steps: [
      "Verify your Partner ID and Partner Key are correct",
      "Ensure no extra spaces in credential fields",
      "Check that credentials are from Shopee Open Platform",
      "Try regenerating your Partner Key if issue persists"
    ]
  },
  "error.auth.invalid_access_token": {
    title: "Invalid or Expired Access Token",
    solution: "Your access token has expired or is invalid.",
    steps: [
      "Re-authorize your shop via OAuth flow",
      "Go to Settings → Shopee → Re-enter credentials",
      "Ensure you completed OAuth authorization",
      "Access tokens expire - refresh them periodically"
    ]
  },
  "error.shop_id_not_match": {
    title: "Shop ID Mismatch",
    solution: "The Shop ID doesn't match your authorized shop.",
    steps: [
      "Verify your Shop ID is correct (numeric)",
      "Check your Shopee Seller Center for the correct Shop ID",
      "Ensure you authorized the correct shop during OAuth",
      "Shop ID should match the shop you linked to your app"
    ]
  },
  "error.rate_limit_exceed": {
    title: "Rate Limit Exceeded",
    solution: "Too many API requests in a short time.",
    steps: [
      "Wait 1 minute before trying again",
      "Our system limits to 1 request per second",
      "Avoid manual polling - use auto-refresh",
      "If this persists, check for duplicate workers"
    ]
  },
  "error.auth.permission_denied": {
    title: "Permission Denied",
    solution: "Your app doesn't have required permissions.",
    steps: [
      "Check app permissions in Shopee Open Platform",
      "Ensure order-related scopes are enabled",
      "Re-authorize to grant new permissions",
      "Contact Shopee support if permissions can't be added"
    ]
  }
};

export default function CredentialErrorHelper({ error, platform, onRetry }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const errorInfo = platform === "shopee" && error.code 
    ? SHOPEE_ERROR_SOLUTIONS[error.code] 
    : null;

  return (
    <div style={{
      background: "var(--color-error-bg)",
      border: "2px solid var(--color-error)",
      borderRadius: "var(--radius-lg)",
      padding: 20,
      marginTop: 16,
      animation: "slideUp 0.3s ease"
    }}>
      {/* Error Header */}
      <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: 0, 
            color: "var(--color-error)", 
            fontSize: 16,
            fontWeight: 700 
          }}>
            {errorInfo?.title || "Credential Error"}
          </h4>
          <p style={{ 
            margin: "6px 0 0 0", 
            fontSize: 14, 
            color: "var(--color-text-muted)" 
          }}>
            {errorInfo?.solution || error.message}
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: "white",
            border: "1px solid var(--color-error)",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-error)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          {showDetails ? "Hide" : "Show"} Details
        </button>
      </div>

      {/* Error Details */}
      {showDetails && (
        <div style={{ 
          marginTop: 16, 
          paddingTop: 16, 
          borderTop: "1px solid var(--color-error)",
          animation: "fadeIn 0.3s ease"
        }}>
          {/* Error Code & Request ID */}
          <div style={{ 
            background: "white", 
            padding: 12, 
            borderRadius: "var(--radius-md)",
            marginBottom: 12,
            fontFamily: "monospace",
            fontSize: 13
          }}>
            <div><strong>Error Code:</strong> {error.code}</div>
            {error.requestId && (
              <div style={{ marginTop: 4 }}>
                <strong>Request ID:</strong> {error.requestId}
              </div>
            )}
          </div>

          {/* Solution Steps */}
          {errorInfo?.steps && (
            <div>
              <h5 style={{ 
                margin: "0 0 10px 0", 
                fontSize: 14, 
                fontWeight: 700,
                color: "var(--color-text)"
              }}>
                🔧 How to Fix:
              </h5>
              <ol style={{ 
                margin: 0, 
                paddingLeft: 20, 
                fontSize: 13,
                lineHeight: 1.8,
                color: "var(--color-text-muted)"
              }}>
                {errorInfo.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Documentation Link */}
          <div style={{ 
            marginTop: 12,
            padding: 12,
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "var(--radius-md)",
            fontSize: 13
          }}>
            📚 <strong>Need more help?</strong> Check{" "}
            <a 
              href="/SHOPEE_CREDENTIALS_GUIDE.md" 
              target="_blank"
              style={{ 
                color: "var(--color-primary)", 
                textDecoration: "underline",
                fontWeight: 600
              }}
            >
              SHOPEE_CREDENTIALS_GUIDE.md
            </a>
            {" "}for detailed setup instructions.
          </div>

          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 16px",
                background: "var(--color-error)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              🔄 Retry Connection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
