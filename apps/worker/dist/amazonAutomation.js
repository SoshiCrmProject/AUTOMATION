"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationError = void 0;
exports.verifyAmazonCredentials = verifyAmazonCredentials;
exports.scrapeAmazonProduct = scrapeAmazonProduct;
exports.purchaseAmazonProduct = purchaseAmazonProduct;
exports.checkoutOnAmazon = checkoutOnAmazon;
const playwright_1 = require("playwright");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class AutomationError extends Error {
    constructor(code, message, screenshotPath) {
        super(message);
        this.code = code;
        this.screenshotPath = screenshotPath;
    }
}
exports.AutomationError = AutomationError;
// Browser context pool for session reuse
class BrowserPool {
    constructor() {
        this.browser = null;
        this.contexts = new Map();
        this.maxIdleTime = 10 * 60 * 1000; // 10 minutes
    }
    async getBrowser() {
        if (!this.browser) {
            this.browser = await playwright_1.chromium.launch({ headless: true });
        }
        return this.browser;
    }
    async getContext(email) {
        const existing = this.contexts.get(email);
        if (existing && Date.now() - existing.lastUsed < this.maxIdleTime) {
            existing.lastUsed = Date.now();
            return existing.context;
        }
        // Clean up old context
        if (existing) {
            await existing.context.close();
            this.contexts.delete(email);
        }
        const browser = await this.getBrowser();
        const storagePath = this.getStoragePath(email);
        const hasState = fs_1.default.existsSync(storagePath);
        const context = hasState
            ? await browser.newContext({ storageState: storagePath })
            : await browser.newContext();
        this.contexts.set(email, { context, lastUsed: Date.now() });
        return context;
    }
    async saveContext(email, context) {
        const storagePath = this.getStoragePath(email);
        await context.storageState({ path: storagePath });
    }
    getStoragePath(email) {
        const dir = path_1.default.join(process.cwd(), "tmp", "sessions");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const safeName = email.replace(/[^a-zA-Z0-9]/g, '_');
        return path_1.default.join(dir, `amazon_${safeName}.json`);
    }
    async cleanup() {
        for (const [_, { context }] of this.contexts) {
            await context.close();
        }
        this.contexts.clear();
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
const browserPool = new BrowserPool();
const selectors = {
    price: [
        "#corePriceDisplay_desktop_feature_div .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "span.a-price span.a-offscreen",
        "#corePrice_feature_div .a-offscreen"
    ],
    availability: ["#availability", "#availability span"],
    condition: ["#conditionInfo", "#olp_feature_div"],
    delivery: [
        "#deliveryMessageInsideBuyBox_feature_div",
        "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
        "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE",
        "#deliveryMessageMirId"
    ],
    points: ["#loyalty-points", "#apex_offerDisplay_desktop_summary", "#ppd-wallet-points-text"],
    addToCart: ["#add-to-cart-button", "#add-to-wishlist-button-submit", "#buy-now-button", "input#add-to-cart-button"],
    proceedToCheckout: ["input[name='proceedToRetailCheckout']", "input#proceedToRetailCheckout", "a#hlb-ptc-btn-native"],
    placeOrder: ["input.place-your-order-button", "input[name='placeYourOrder1']", "input#submitOrderButtonId"],
    orderId: ["span.order-id", ".order-number", "#order-number", "[data-test-id='order-summary-primary-actions']"],
    staySignedIn: ["input[name='rememberMe']", "#rememberMe"],
    deleteCartItem: [".sc-action-delete", "input[value='Delete']", "span[data-action='delete']"],
    orderConfirmation: [".a-alert-success", "#confirmation-message", "h1:has-text('注文を承りました')", "h1:has-text('Thank you')"]
};
function extractAsinFromUrl(productUrl) {
    const regex = /(?:dp|gp\/[A-Za-z0-9_-]+\/product)\/([A-Z0-9]{10})/i;
    const alt = /([A-Z0-9]{10})(?:[/?]|$)/i;
    const primary = productUrl.match(regex)?.[1];
    if (primary)
        return primary.toUpperCase();
    const secondary = productUrl.match(alt)?.[1];
    return secondary ? secondary.toUpperCase() : null;
}
async function extractAsinFromDom(page) {
    const fromBullets = await page
        .$$eval("#detailBullets_feature_div li", (nodes) => {
        for (const node of nodes) {
            const text = node.textContent || "";
            if (/ASIN/i.test(text)) {
                const match = text.match(/([A-Z0-9]{10})/i);
                if (match)
                    return match[1].toUpperCase();
            }
        }
        return null;
    })
        .catch(() => null);
    if (fromBullets)
        return fromBullets;
    return page
        .$$eval("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr", (rows) => {
        for (const row of rows) {
            const header = row.querySelector("th")?.textContent || "";
            const value = row.querySelector("td")?.textContent || "";
            if (/ASIN/i.test(header)) {
                const match = value.match(/([A-Z0-9]{10})/i);
                if (match)
                    return match[1].toUpperCase();
            }
        }
        return null;
    })
        .catch(() => null);
}
async function getProductTitle(page) {
    const el = await page.$("#productTitle, #titleSection #title, h1#title");
    if (!el)
        return null;
    const text = await el.textContent();
    return text?.trim() || null;
}
async function captureScreenshot(page, prefix) {
    const dir = path_1.default.join(process.cwd(), "tmp");
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    const filepath = path_1.default.join(dir, `${prefix}-${Date.now()}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
}
async function getFirstText(page, selList) {
    for (const sel of selList) {
        const el = await page.$(sel);
        if (el) {
            const txt = await el.textContent();
            if (txt)
                return txt.trim();
        }
    }
    return null;
}
function parsePrice(text) {
    if (!text)
        return { value: NaN, currency: undefined };
    const currencyMatch = text.match(/[¥$€£]/);
    const currency = currencyMatch ? currencyMatch[0] : undefined;
    const num = parseFloat(text.replace(/[^\d.,]/g, "").replace(/,/g, ""));
    return { value: num, currency };
}
function parseEstimatedDelivery(text) {
    if (!text)
        return undefined;
    const matchDay = text.match(/(\d{1,2})[日日]/);
    const matchMonthDay = text.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
    const nowYear = new Date().getFullYear();
    if (matchMonthDay) {
        return new Date(`${matchMonthDay[0]} ${nowYear}`);
    }
    if (matchDay) {
        const day = parseInt(matchDay[1], 10);
        const now = new Date();
        const dt = new Date(nowYear, now.getMonth(), day);
        if (dt.getTime() < now.getTime())
            dt.setMonth(now.getMonth() + 1); // roll over if past
        return dt;
    }
    return undefined;
}
async function ensureLoggedIn(page, email, password) {
    await page.goto("https://www.amazon.co.jp/ap/signin", { waitUntil: "networkidle" });
    await page.fill("input[name='email']", email);
    await page.click("input#continue");
    await page.waitForTimeout(500);
    await page.fill("input[name='password']", password);
    // Check "Keep me signed in" to reduce 2FA prompts
    for (const sel of selectors.staySignedIn) {
        const checkbox = await page.$(sel);
        if (checkbox) {
            await checkbox.click();
            break;
        }
    }
    await page.click("input#signInSubmit");
    await page.waitForTimeout(2000);
    const twofa = await page.$("#auth-mfa-otpcode, #auth-mfa-otpcode-input, input[name='otpCode']");
    if (twofa) {
        const path = await captureScreenshot(page, "amazon-2fa");
        throw new AutomationError("AMAZON_2FA_REQUIRED", "2FA required. Manual intervention needed.", path);
    }
    const errorBox = await page.$("#auth-error-message-box, div[data-testid='signin-error-message']");
    if (errorBox) {
        const errorText = (await errorBox.textContent())?.trim() || "Amazon login failed";
        const path = await captureScreenshot(page, "amazon-login-failed");
        throw new AutomationError("AMAZON_LOGIN_FAILED", errorText, path);
    }
}
async function verifyAmazonCredentials(input) {
    const context = await browserPool.getContext(input.loginEmail);
    const page = await context.newPage();
    try {
        await ensureLoggedIn(page, input.loginEmail, input.loginPassword);
        await browserPool.saveContext(input.loginEmail, context);
    }
    finally {
        await page.close();
    }
}
async function scrapeAmazonProduct(productUrl) {
    const browser = await browserPool.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(productUrl, { waitUntil: "networkidle" });
    const priceText = await getFirstText(page, selectors.price);
    const availabilityText = await getFirstText(page, selectors.availability);
    const conditionText = await getFirstText(page, selectors.condition);
    const deliveryText = await getFirstText(page, selectors.delivery);
    const pointsText = await getFirstText(page, selectors.points);
    const productTitle = await getProductTitle(page);
    const asinFromUrl = extractAsinFromUrl(productUrl);
    const asinFromDom = await extractAsinFromDom(page);
    const { value: price, currency } = parsePrice(priceText);
    const isAvailable = availabilityText ? /in stock|available|在庫あり|残り|通常/i.test(availabilityText) : false;
    const isNew = conditionText ? /new|新品/i.test(conditionText) : true;
    const estimatedDelivery = parseEstimatedDelivery(deliveryText);
    const pointsEarned = pointsText ? parseInt(pointsText.replace(/[^\d]/g, ""), 10) || undefined : undefined;
    const asin = asinFromDom ?? asinFromUrl ?? null;
    return {
        browser,
        context,
        page,
        result: {
            price,
            currency,
            isAvailable,
            isNew,
            estimatedDelivery,
            pointsEarned,
            shippingText: deliveryText,
            title: productTitle,
            asin
        }
    };
}
async function purchaseAmazonProduct(input) {
    const context = await browserPool.getContext(input.loginEmail);
    const page = await context.newPage();
    try {
        await ensureLoggedIn(page, input.loginEmail, input.loginPassword);
        const result = await checkoutOnAmazon(page, input);
        // Save session state for reuse
        await browserPool.saveContext(input.loginEmail, context);
        await page.close();
        return result;
    }
    catch (err) {
        await page.close();
        if (err instanceof AutomationError)
            throw err;
        const path = await captureScreenshot(page, "amazon-failure");
        throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
    }
}
async function checkoutOnAmazon(page, input) {
    try {
        // Clear cart before adding new item
        await page.goto("https://www.amazon.co.jp/gp/cart/view.html", { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
        // Delete all existing cart items
        const deleteButtons = await page.$$(selectors.deleteCartItem.join(','));
        for (const btn of deleteButtons) {
            try {
                await btn.click();
                await page.waitForTimeout(500);
            }
            catch (e) {
                // Continue if delete fails
            }
        }
        // Navigate to product and add to cart
        await page.goto(input.productUrl, { waitUntil: "networkidle" });
        let added = false;
        for (const sel of selectors.addToCart) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click({ timeout: 8000 }).catch(() => { });
                added = true;
                break;
            }
        }
        if (!added) {
            const path = await captureScreenshot(page, "add-to-cart-failed");
            throw new AutomationError("AMAZON_ADD_TO_CART_FAILED", "Add to cart failed", path);
        }
        await page.waitForTimeout(1200);
        await page.goto("https://www.amazon.co.jp/gp/cart/view.html", { waitUntil: "networkidle" });
        let proceeded = false;
        for (const sel of selectors.proceedToCheckout) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click({ timeout: 8000 }).catch(() => { });
                proceeded = true;
                break;
            }
        }
        if (!proceeded) {
            const path = await captureScreenshot(page, "proceed-checkout-failed");
            throw new AutomationError("AMAZON_CHECKOUT_FAILED", "Proceed to checkout failed", path);
        }
        await page.waitForSelector("div#address-book-entry-0, .address-book-entry", { timeout: 10000 }).catch(() => { });
        const addressElements = await page.$$(".address-book-entry");
        if (addressElements.length) {
            let addressSelected = false;
            for (const el of addressElements) {
                const text = await el.textContent();
                if (!text)
                    continue;
                // Use exact match or very specific contains to avoid matching similar addresses
                const normalizedText = text.trim().replace(/\s+/g, ' ');
                const normalizedLabel = input.shippingAddressLabel.trim().replace(/\s+/g, ' ');
                if (normalizedText === normalizedLabel ||
                    (normalizedText.includes(normalizedLabel) && normalizedText.length - normalizedLabel.length < 20)) {
                    await el.click();
                    addressSelected = true;
                    break;
                }
            }
            if (!addressSelected) {
                const path = await captureScreenshot(page, "address-not-found");
                throw new AutomationError("ADDRESS_NOT_FOUND", "Shipping address not found", path);
            }
        }
        await page.waitForTimeout(1000);
        let placed = false;
        for (const sel of selectors.placeOrder) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click({ timeout: 8000 }).catch(() => { });
                placed = true;
                break;
            }
        }
        if (!placed) {
            const path = await captureScreenshot(page, "place-order-failed");
            throw new AutomationError("AMAZON_PURCHASE_FAILED", "Place order failed", path);
        }
        await page.waitForTimeout(2500);
        // Verify order confirmation page
        const confirmationElement = await getFirstText(page, selectors.orderConfirmation);
        if (!confirmationElement) {
            const path = await captureScreenshot(page, "order-confirmation-failed");
            throw new AutomationError("ORDER_CONFIRMATION_FAILED", "Order confirmation page not detected", path);
        }
        const orderIdText = await getFirstText(page, selectors.orderId);
        const priceText = await getFirstText(page, selectors.price);
        const { value: finalPrice, currency } = parsePrice(priceText);
        if (!orderIdText) {
            const path = await captureScreenshot(page, "order-id-not-found");
            throw new AutomationError("ORDER_ID_NOT_FOUND", "Order ID not found on confirmation page", path);
        }
        return {
            amazonOrderId: orderIdText,
            finalPrice: Number.isNaN(finalPrice) ? undefined : finalPrice,
            currency,
            shippingCost: undefined,
            pointsUsed: undefined
        };
    }
    catch (err) {
        if (err instanceof AutomationError)
            throw err;
        const path = await captureScreenshot(page, "amazon-failure");
        throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
    }
}
