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
export declare function calculateProfit({ shopeeSalePrice, amazonPrice, amazonPoints, domesticShipping, includePoints, includeDomesticShipping }: ProfitCalcOptions): ProfitResult;
export declare function calculateShippingDays(estimatedDeliveryDate: Date, today?: Date): number;
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
