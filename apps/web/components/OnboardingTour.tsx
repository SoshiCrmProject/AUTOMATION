import { useState, useEffect } from "react";
import { Modal } from "./ui";

type TourStep = {
  title: string;
  description: string;
  icon: string;
  features: string[];
  tips?: string[];
};

type OnboardingTourProps = {
  pageName: string;
  steps: TourStep[];
  onComplete: () => void;
};

export default function OnboardingTour({ pageName, steps, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Check if user has seen this tour
    const tourKey = `tour_completed_${pageName}`;
    const hasSeenTour = typeof window !== 'undefined' ? localStorage.getItem(tourKey) : null;
    
    if (!hasSeenTour) {
      // Show tour after a brief delay
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [pageName, mounted]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tour_completed_${pageName}`, "true");
    }
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tour_completed_${pageName}`, "true");
    }
    setIsOpen(false);
  };

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title={step.title}
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Icon and Description */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{step.icon}</div>
          <p style={{ fontSize: 16, color: "var(--color-text)", lineHeight: 1.6 }}>
            {step.description}
          </p>
        </div>

        {/* Features */}
        {step.features.length > 0 && (
          <div>
            <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              ✨ Key Features:
            </h4>
            <ul style={{ 
              margin: 0, 
              padding: "0 0 0 20px", 
              display: "flex", 
              flexDirection: "column", 
              gap: 8 
            }}>
              {step.features.map((feature, idx) => (
                <li key={idx} style={{ fontSize: 15, lineHeight: 1.5 }}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {step.tips && step.tips.length > 0 && (
          <div style={{ 
            padding: 16, 
            background: "var(--color-elevated)", 
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)"
          }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600, color: "var(--color-info)" }}>
              💡 Pro Tips:
            </h4>
            <ul style={{ 
              margin: 0, 
              padding: "0 0 0 20px", 
              display: "flex", 
              flexDirection: "column", 
              gap: 6 
            }}>
              {step.tips.map((tip, idx) => (
                <li key={idx} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--color-text-muted)" }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress Indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: idx === currentStep ? "var(--color-primary)" : "var(--color-border)",
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
                padding: "12px 24px",
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
              padding: "12px 24px",
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
              padding: "12px 24px",
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
            {currentStep < steps.length - 1 ? "Next →" : "Get Started 🚀"}
          </button>
        </div>

        {/* Step Counter */}
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </Modal>
  );
}

// Helper component for reopening tours
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
        border: "none",
        color: "#fff",
        fontSize: 24,
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
        transition: "all 0.3s ease",
        zIndex: 999
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(37, 99, 235, 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 99, 235, 0.4)";
      }}
      title="Show Help"
    >
      ?
    </button>
  );
}
