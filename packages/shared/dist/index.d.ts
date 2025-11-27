/**
 * Options for calculating profit from a dropshipping order
 */
export type ProfitCalcOptions = {
    /** Shopee sale price (revenue) */
    shopeeSalePrice: number;
    /** Amazon purchase price (cost) */
    amazonPrice: number;
    /** Amazon reward points value */
    amazonPoints?: number;
    /** Domestic shipping cost */
    domesticShipping?: number;
    /** Whether to include points in calculation */
    includePoints: boolean;
    /** Whether to include domestic shipping in calculation */
    includeDomesticShipping: boolean;
};
/**
 * Result of profit calculation with detailed breakdown
 */
export type ProfitResult = {
    /** Total expected profit */
    expectedProfit: number;
    /** Detailed breakdown of profit components */
    breakdown: {
        /** Base profit (revenue - cost) */
        base: number;
        /** Amazon points contribution */
        points: number;
        /** Domestic shipping cost */
        domesticShipping: number;
    };
};
/**
 * Calculates expected profit for a dropshipping order
 *
 * @param options - Profit calculation parameters
 * @returns Profit result with breakdown
 *
 * @example
 * ```ts
 * const result = calculateProfit({
 *   shopeeSalePrice: 5000,
 *   amazonPrice: 3000,
 *   amazonPoints: 300,
 *   domesticShipping: 200,
 *   includePoints: true,
 *   includeDomesticShipping: true
 * });
 * // result.expectedProfit = 2100 (5000 - 3000 + 300 - 200)
 * ```
 */
export declare function calculateProfit({ shopeeSalePrice, amazonPrice, amazonPoints, domesticShipping, includePoints, includeDomesticShipping }: ProfitCalcOptions): ProfitResult;
/**
 * Calculates number of days until estimated delivery
 *
 * @param estimatedDeliveryDate - Expected delivery date
 * @param today - Current date (defaults to now)
 * @returns Number of days (minimum 0)
 */
export declare function calculateShippingDays(estimatedDeliveryDate: Date, today?: Date): number;
/**
 * Checks if shipping days are within acceptable limit
 *
 * @param estimatedDeliveryDate - Expected delivery date
 * @param today - Current date
 * @param maxDays - Maximum acceptable shipping days
 * @returns true if within limit, false otherwise
 */
export declare function shippingDaysWithinLimit(estimatedDeliveryDate: Date, today: Date, maxDays: number): boolean;
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
export declare function classifyFulfillmentDecision(params: FulfillmentDecisionParams): {
    decision: Decision;
    reason?: string;
};
