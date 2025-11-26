import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Modal } from "./ui";

type WelcomeStep = {
  title: string;
  description: string;
  icon: string;
  page: string;
  pageDescription: string;
};

const welcomeSteps: WelcomeStep[] = [
  {
    title: "Welcome to Shopee→Amazon Automation! 🎉",
    description: "Your complete dropshipping automation platform. Let's take a quick tour of what you can do here.",
    icon: "🚀",
    page: "Overview",
    pageDescription: "Automate your dropshipping business from Shopee to Amazon with intelligent order processing, inventory management, and customer relationship tools."
  },
  {
    title: "Dashboard - Your Control Center 📊",
    description: "Monitor real-time performance, track orders, and get instant insights into your business health.",
    icon: "📈",
    page: "/dashboard",
    pageDescription: "View revenue, orders, profits, and conversion rates. Access recent orders, queue status, and system health all in one place."
  },
  {
    title: "Analytics - Data-Driven Decisions 📉",
    description: "Deep dive into your business performance with comprehensive analytics and AI-powered insights.",
    icon: "💡",
    page: "/analytics",
    pageDescription: "Track weekly/monthly trends, identify top products, analyze daily breakdowns, and get intelligent recommendations to optimize your business."
  },
  {
    title: "Inventory - Stock Management 📦",
    description: "Never run out of stock again. Track inventory levels, manage alerts, and adjust stock seamlessly.",
    icon: "📦",
    page: "/inventory",
    pageDescription: "Monitor stock levels, receive low-stock alerts, perform stock adjustments (IN/OUT/ADJUSTMENT), and add new products with complete details."
  },
  {
    title: "CRM - Customer Relationships 👥",
    description: "Build lasting relationships with customer management, interaction tracking, and loyalty programs.",
    icon: "🤝",
    page: "/crm",
    pageDescription: "Manage customer profiles, track interactions (Purchase, Support, Complaints), update loyalty tiers (Bronze/Silver/Gold/Platinum), and monitor customer lifetime value."
  },
  {
    title: "Orders - Complete Order Control 🚚",
    description: "Track, process, and manage all orders with bulk actions and detailed error information.",
    icon: "📋",
    page: "/orders",
    pageDescription: "View order status, retry failed orders, mark manual processing, export to CSV, and use bulk actions to save time on multiple orders."
  },
  {
    title: "Settings - Configure Everything ⚙️",
    description: "Set up automation rules, platform credentials, and notification preferences.",
    icon: "🔧",
    page: "/settings",
    pageDescription: "Configure Shopee/Amazon credentials, set automation rules (profit margins, shipping days), enable/disable automation, and set up webhook notifications."
  },
  {
    title: "You're All Set! 🎯",
    description: "Each page has its own detailed tour accessible via the (?) button at the bottom right. Ready to automate your dropshipping business?",
    icon: "✨",
    page: "Get Started",
    pageDescription: "Click 'Start Using Platform' to begin. Remember: you can always reopen page-specific tours by clicking the help button (?) on any page."
  }
];

export default function WelcomeTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("welcome_tour_completed");
    
    if (!hasSeenWelcome && router.pathname === "/") {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [router.pathname]);

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("welcome_tour_completed", "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem("welcome_tour_completed", "true");
    setIsOpen(false);
  };

  const handleGoToPage = (page: string) => {
    if (page.startsWith("/")) {
      localStorage.setItem("welcome_tour_completed", "true");
      router.push(page);
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  const step = welcomeSteps[currentStep];
  const isLastStep = currentStep === welcomeSteps.length - 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title="🎓 Platform Tour"
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Icon and Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>{step.icon}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "var(--color-primary)" }}>
            {step.title}
          </h2>
          <p style={{ fontSize: 16, color: "var(--color-text)", lineHeight: 1.6, marginBottom: 8 }}>
            {step.description}
          </p>
        </div>

        {/* Page Info Card */}
        <div style={{
          padding: 24,
          background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
          borderRadius: "var(--radius-lg)",
          border: "2px solid var(--color-border)"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid var(--color-border)"
          }}>
            <div style={{ 
              fontSize: 32,
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)"
            }}>
              {step.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--color-primary)" }}>
                {step.page}
              </h4>
              {step.page.startsWith("/") && (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                  Navigate: {step.page}
                </div>
              )}
            </div>
            {step.page.startsWith("/") && (
              <button
                onClick={() => handleGoToPage(step.page)}
                style={{
                  padding: "8px 16px",
                  background: "var(--color-primary)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Visit →
              </button>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--color-text-muted)" }}>
            {step.pageDescription}
          </p>
        </div>

        {/* Key Features for Last Step */}
        {isLastStep && (
          <div style={{
            padding: 20,
            background: "var(--color-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)"
          }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              🎯 Quick Start Checklist:
            </h4>
            <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                Go to <strong>Settings</strong> and configure Shopee + Amazon credentials
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                Set your automation rules (profit margins, shipping days)
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                Enable automation when ready (start with Dry Run mode)
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                Monitor <strong>Dashboard</strong> for real-time order processing
              </li>
              <li style={{ fontSize: 14, lineHeight: 1.6 }}>
                Check <strong>Analytics</strong> regularly for business insights
              </li>
            </ul>
          </div>
        )}

        {/* Progress Indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {welcomeSteps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: idx === currentStep 
                  ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)"
                  : "var(--color-border)",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12 }}>
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              style={{
                flex: 1,
                padding: "14px 24px",
                background: "transparent",
                border: "2px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              ← Previous
            </button>
          )}
          <button
            onClick={handleSkip}
            style={{
              flex: 1,
              padding: "14px 24px",
              background: "transparent",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={handleNext}
            style={{
              flex: 2,
              padding: "14px 24px",
              background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
            }}
          >
            {isLastStep ? "Start Using Platform 🚀" : "Next →"}
          </button>
        </div>

        {/* Step Counter */}
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
          Step {currentStep + 1} of {welcomeSteps.length}
        </div>
      </div>
    </Modal>
  );
}
