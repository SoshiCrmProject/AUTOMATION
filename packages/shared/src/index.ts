export type ProfitCalcOptions = {
  shopeeSalePrice: number;
  amazonPrice: number;
  amazonPoints?: number;
  domesticShipping?: number;
  includePoints: boolean;
  includeDomesticShipping: boolean;
};

export type ProfitResult = {
  expectedProfit: number;
  breakdown: {
    base: number;
    points: number;
    domesticShipping: number;
  };
};

export function calculateProfit({
  shopeeSalePrice,
  amazonPrice,
  amazonPoints = 0,
  domesticShipping = 0,
  includePoints,
  includeDomesticShipping
}: ProfitCalcOptions): ProfitResult {
  const base = shopeeSalePrice - amazonPrice;
  const points = includePoints ? amazonPoints : 0;
  const domestic = includeDomesticShipping ? domesticShipping : 0;
  return {
    expectedProfit: base + points - domestic,
    breakdown: { base, points, domesticShipping: domestic }
  };
}

export function calculateShippingDays(estimatedDeliveryDate: Date, today: Date = new Date()): number {
  const diffMs = estimatedDeliveryDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function shippingDaysWithinLimit(
  estimatedDeliveryDate: Date,
  today: Date,
  maxDays: number
): boolean {
  return calculateShippingDays(estimatedDeliveryDate, today) <= maxDays;
}

export type ErrorItem = {
  orderId: string;
  asin?: string;
  productName: string;
  shopeePrice: number;
  amazonPrice?: number;
  profit?: number;
  failureReason: string;
  timestamp: string;
};

export type AutoFulfillmentMode = "MANUAL_ONLY" | "AUTO_WITH_REVIEW_BAND" | "AUTO_STRICT";

export type Decision = "SKIP" | "MANUAL_REVIEW" | "AUTO_FULFILL" | "DRY_RUN";

export type FulfillmentDecisionParams = {
  isActive: boolean;
  isDryRun: boolean;
  autoFulfillmentMode: AutoFulfillmentMode;
  minExpectedProfit: number;
  maxShippingDays: number;
  reviewBandPercent?: number | null;
  calculatedProfit: number;
  shippingDays: number;
};

/**
 * classifyFulfillmentDecision centralizes the dropship decision logic.
 * It applies hard guardrails (profit/shipping), then mode-specific rules.
 */
export function classifyFulfillmentDecision(params: FulfillmentDecisionParams): { decision: Decision; reason?: string } {
  const {
    isActive,
    isDryRun,
    autoFulfillmentMode,
    minExpectedProfit,
    maxShippingDays,
    reviewBandPercent = 0,
    calculatedProfit,
    shippingDays
  } = params;

  // Hard guardrails
  if (calculatedProfit < minExpectedProfit) {
    return { decision: "SKIP", reason: "PROFIT_BELOW_MIN" };
  }
  if (shippingDays > maxShippingDays) {
    return { decision: "SKIP", reason: "SHIPPING_DAYS_TOO_LONG" };
  }

  // If shop is inactive, park in manual review (no auto processing)
  if (!isActive) {
    return { decision: "MANUAL_REVIEW", reason: "INACTIVE_SHOP" };
  }

  // Manual-only mode
  if (autoFulfillmentMode === "MANUAL_ONLY") {
    return { decision: "MANUAL_REVIEW", reason: "MANUAL_MODE" };
  }

  // Auto with review band
  if (autoFulfillmentMode === "AUTO_WITH_REVIEW_BAND") {
    const pct = reviewBandPercent ?? 0;
    const hasBand = pct > 0;
    if (hasBand && minExpectedProfit > 0) {
      const profitMarginOverMin = (calculatedProfit - minExpectedProfit) / minExpectedProfit;
      if (profitMarginOverMin >= 0 && profitMarginOverMin <= pct / 100) {
        return { decision: "MANUAL_REVIEW", reason: "REVIEW_BAND" };
      }
    }
    // otherwise fall through to auto logic
  }

  // Dry-run
  if (isDryRun) {
    return { decision: "DRY_RUN", reason: "DRY_RUN_ONLY" };
  }

  // Auto strict or auto-with-review-band passing the band
  return { decision: "AUTO_FULFILL" };
}
