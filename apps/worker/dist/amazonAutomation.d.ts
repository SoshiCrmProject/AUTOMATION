import { Browser, Page } from "playwright";
export type AmazonScrapeResult = {
    price: number;
    currency?: string;
    isAvailable: boolean;
    isNew: boolean;
    estimatedDelivery?: Date;
    pointsEarned?: number;
    shippingText?: string | null;
};
export type AmazonCheckoutResult = {
    amazonOrderId: string | null;
    finalPrice?: number;
    currency?: string;
    shippingCost?: number;
    pointsUsed?: number;
};
export type AmazonPurchaseInput = {
    productUrl: string;
    shippingAddressLabel: string;
    loginEmail: string;
    loginPassword: string;
};
export declare class AutomationError extends Error {
    code: string;
    screenshotPath?: string;
    constructor(code: string, message: string, screenshotPath?: string);
}
export declare function scrapeAmazonProduct(productUrl: string): Promise<{
    browser: Browser;
    page: Page;
    result: AmazonScrapeResult;
}>;
export declare function purchaseAmazonProduct(input: AmazonPurchaseInput): Promise<AmazonCheckoutResult>;
export declare function checkoutOnAmazon(page: Page, input: AmazonPurchaseInput): Promise<AmazonCheckoutResult>;
