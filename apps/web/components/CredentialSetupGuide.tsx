import { useState } from "react";

interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
  image?: string;
  link?: { text: string; url: string };
}

interface Props {
  platform: "shopee" | "amazon";
}

const SHOPEE_STEPS: Step[] = [
  {
    number: 1,
    title: "Register on Shopee Open Platform",
    description: "Create your developer account to access the API",
    details: [
      "Go to https://open.shopee.com/",
      "Click 'Sign Up' in the top right corner",
      "Use your Shopee seller account email",
      "Verify your email address",
      "Complete the registration form"
    ],
    link: { text: "Visit Shopee Open Platform", url: "https://open.shopee.com/" }
  },
  {
    number: 2,
    title: "Create a New App",
    description: "Set up your application to get API credentials",
    details: [
      "Log in to Shopee Open Platform",
      "Go to 'My Apps' section",
      "Click 'Create App' button",
      "Enter your app name (e.g., 'AutoShip X Integration')",
      "Select 'Order Management' permissions",
      "Submit and wait for approval (usually instant)"
    ]
  },
  {
    number: 3,
    title: "Get Partner ID & Partner Key",
    description: "Copy these credentials from your app settings",
    details: [
      "Open your newly created app",
      "Find 'App Credentials' section",
      "Copy the Partner ID (numeric, e.g., 1234567)",
      "Click 'Show' on Partner Key and copy it",
      "⚠️ Keep Partner Key secret - never share it!",
      "Store both values securely"
    ]
  },
  {
    number: 4,
    title: "Get Shop ID",
    description: "Find your shop's unique identifier",
    details: [
      "Go to Shopee Seller Center",
      "Click on 'Settings' or 'Shop Settings'",
      "Look for 'Shop ID' (usually in URL or shop info)",
      "Alternative: Use Shopee API test endpoint to get shop list",
      "Copy the numeric Shop ID (e.g., 987654)",
      "Each shop has a unique ID"
    ]
  },
  {
    number: 5,
    title: "OAuth Authorization (Optional)",
    description: "Get Access Token for advanced features",
    details: [
      "Generate authorization URL with your Partner ID",
      "Authorize the app in Shopee as the shop owner",
      "Receive authorization code",
      "Exchange code for Access Token via API",
      "Access Token expires - set up refresh flow",
      "Note: Some features work without Access Token"
    ]
  },
  {
    number: 6,
    title: "Enter Credentials in Settings",
    description: "Save your credentials in AutoShip X",
    details: [
      "Go to Settings page in AutoShip X",
      "Select 'Shopee' tab",
      "Enter Partner ID (numeric only)",
      "Enter Partner Key (copy/paste carefully)",
      "Enter Shop ID (numeric only)",
      "Click 'Save Shopee Credentials (Encrypted)'",
      "Test connection using the 'Test Connection' button"
    ]
  }
];

const AMAZON_STEPS: Step[] = [
  {
    number: 1,
    title: "Prepare Your Amazon Seller Account",
    description: "Ensure your account is active and accessible",
    details: [
      "Have an active Amazon Seller Central account",
      "Know your login email/phone number",
      "Know your account password",
      "Disable 2FA temporarily (or use app-based 2FA)",
      "Ensure you have a payment method saved",
      "Add a default shipping address"
    ]
  },
  {
    number: 2,
    title: "Set Up Default Shipping Address",
    description: "Configure where orders will be shipped",
    details: [
      "Log in to Amazon Seller Central or Amazon.com",
      "Go to 'Your Addresses'",
      "Add or select your dropship warehouse address",
      "Make it the default shipping address",
      "Verify the address is complete and correct",
      "Save changes"
    ]
  },
  {
    number: 3,
    title: "Save Payment Method",
    description: "Ensure automatic checkout works smoothly",
    details: [
      "Go to 'Payment Options' in Amazon",
      "Add a valid credit/debit card",
      "Or link your bank account",
      "Make it the default payment method",
      "Verify the payment method is active",
      "Ensure sufficient credit/balance"
    ]
  },
  {
    number: 4,
    title: "Enter Credentials in AutoShip X",
    description: "Securely store your Amazon login",
    details: [
      "Go to Settings page in AutoShip X",
      "Select 'Amazon' tab",
      "Enter your Amazon email or phone number",
      "Enter your Amazon password",
      "⚠️ Credentials are encrypted with AES-256-GCM",
      "We NEVER share credentials with third parties",
      "Click 'Save Amazon Credentials'"
    ]
  },
  {
    number: 5,
    title: "How Automation Works",
    description: "Understanding the Playwright automation",
    details: [
      "We use Playwright (headless browser)",
      "System logs in with your credentials",
      "Searches for the mapped Amazon product",
      "Adds item to cart automatically",
      "Proceeds to checkout",
      "Completes purchase with saved payment/address",
      "No Amazon API used - pure browser automation"
    ]
  },
  {
    number: 6,
    title: "Security & Best Practices",
    description: "Keep your account safe",
    details: [
      "Enable app-based 2FA (Google Authenticator)",
      "Monitor Amazon purchase notifications",
      "Check Dashboard and Orders page regularly",
      "Use dry-run mode to test before going live",
      "Set profit thresholds to avoid losses",
      "Review manual review queue daily",
      "Report any suspicious activity immediately"
    ]
  }
];

export default function CredentialSetupGuide({ platform }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const steps = platform === "shopee" ? SHOPEE_STEPS : AMAZON_STEPS;
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowGuide(true)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "12px 16px",
          background: "var(--color-info-bg)",
          color: "var(--color-info)",
          border: "2px solid var(--color-info)",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        📖 How to Get {platform === "shopee" ? "Shopee" : "Amazon"} Credentials (Step-by-Step Guide)
      </button>

      {/* Full Guide Modal */}
      {showGuide && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              zIndex: 9998,
              animation: "fadeIn 0.3s ease"
            }}
            onClick={() => setShowGuide(false)}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
              maxWidth: 800,
              width: "90%",
              maxHeight: "90vh",
              overflow: "hidden",
              zIndex: 9999,
              animation: "slideUp 0.3s ease",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Header */}
            <div style={{
              padding: 24,
              borderBottom: "2px solid var(--color-border)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
              color: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
                    {platform === "shopee" ? "🛍️ Shopee" : "📦 Amazon"} Credential Setup Guide
                  </h2>
                  <p style={{ margin: "8px 0 0 0", fontSize: 14, opacity: 0.9 }}>
                    Follow these {steps.length} simple steps to get your credentials
                  </p>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "2px solid white",
                    borderRadius: "var(--radius-full)",
                    width: 40,
                    height: 40,
                    fontSize: 24,
                    cursor: "pointer",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Steps Content - Scrollable */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: 24
            }}>
              {steps.map((step) => {
                const isExpanded = expandedStep === step.number;
                return (
                  <div
                    key={step.number}
                    style={{
                      marginBottom: 16,
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {/* Step Header */}
                    <div
                      onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                      style={{
                        padding: 16,
                        background: isExpanded ? "var(--color-primary)" : "var(--color-elevated)",
                        color: isExpanded ? "white" : "var(--color-text)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        transition: "all 0.2s ease"
                      }}
                    >
                      {/* Step Number */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-full)",
                        background: isExpanded ? "white" : "var(--color-primary)",
                        color: isExpanded ? "var(--color-primary)" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {step.number}
                      </div>

                      {/* Step Title */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                          {step.title}
                        </h3>
                        <p style={{
                          margin: "4px 0 0 0",
                          fontSize: 13,
                          opacity: isExpanded ? 0.9 : 0.6
                        }}>
                          {step.description}
                        </p>
                      </div>

                      {/* Expand Icon */}
                      <div style={{
                        fontSize: 20,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease"
                      }}>
                        ▼
                      </div>
                    </div>

                    {/* Step Details */}
                    {isExpanded && (
                      <div style={{
                        padding: 20,
                        background: "white",
                        animation: "fadeIn 0.3s ease"
                      }}>
                        <ol style={{
                          margin: 0,
                          paddingLeft: 20,
                          lineHeight: 2,
                          fontSize: 14
                        }}>
                          {step.details.map((detail, idx) => (
                            <li key={idx} style={{
                              marginBottom: 8,
                              color: detail.startsWith("⚠️") ? "var(--color-warning)" : "var(--color-text)"
                            }}>
                              {detail}
                            </li>
                          ))}
                        </ol>

                        {/* Link */}
                        {step.link && (
                          <div style={{ marginTop: 16 }}>
                            <a
                              href={step.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 16px",
                                background: "var(--color-primary)",
                                color: "white",
                                borderRadius: "var(--radius-md)",
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                              }}
                            >
                              🔗 {step.link.text} →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: 20,
              borderTop: "2px solid var(--color-border)",
              background: "var(--color-elevated)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap"
            }}>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                💡 <strong>Need help?</strong> Check{" "}
                <a href="/SHOPEE_CREDENTIALS_GUIDE.md" target="_blank" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  documentation
                </a>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="btn btn-ghost"
                style={{ minWidth: 120 }}
              >
                Close Guide
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
