"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProfit = calculateProfit;
exports.calculateShippingDays = calculateShippingDays;
exports.shippingDaysWithinLimit = shippingDaysWithinLimit;
exports.classifyFulfillmentDecision = classifyFulfillmentDecision;
function calculateProfit({ shopeeSalePrice, amazonPrice, amazonPoints = 0, domesticShipping = 0, includePoints, includeDomesticShipping }) {
    const base = shopeeSalePrice - amazonPrice;
    const points = includePoints ? amazonPoints : 0;
    const domestic = includeDomesticShipping ? domesticShipping : 0;
    return {
        expectedProfit: base + points - domestic,
        breakdown: { base, points, domesticShipping: domestic }
    };
}
function calculateShippingDays(estimatedDeliveryDate, today = new Date()) {
    const diffMs = estimatedDeliveryDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
function shippingDaysWithinLimit(estimatedDeliveryDate, today, maxDays) {
    return calculateShippingDays(estimatedDeliveryDate, today) <= maxDays;
}
/**
 * classifyFulfillmentDecision centralizes the dropship decision logic.
 * It applies hard guardrails (profit/shipping), then mode-specific rules.
 */
function classifyFulfillmentDecision(params) {
    const { isActive, isDryRun, autoFulfillmentMode, minExpectedProfit, maxShippingDays, reviewBandPercent = 0, calculatedProfit, shippingDays } = params;
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
