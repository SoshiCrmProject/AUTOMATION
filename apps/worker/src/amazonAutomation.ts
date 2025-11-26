import { chromium, Browser, Page } from "playwright";
import fs from "fs";
import path from "path";

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

export class AutomationError extends Error {
  code: string;
  screenshotPath?: string;
  constructor(code: string, message: string, screenshotPath?: string) {
    super(message);
    this.code = code;
    this.screenshotPath = screenshotPath;
  }
}

const selectors = {
  price: ["#priceblock_ourprice", "#priceblock_dealprice", "span.a-price span.a-offscreen", "#corePrice_feature_div .a-offscreen"],
  availability: ["#availability", "#availability span"],
  condition: ["#conditionInfo", "#olp_feature_div"],
  delivery: [
    "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE",
    "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE",
    "#deliveryMessageMirId"
  ],
  points: ["#loyalty-points", "#apex_offerDisplay_desktop_summary", "#ppd-wallet-points-text"],
  addToCart: ["#add-to-cart-button", "#buy-now-button", "input#add-to-cart-button"],
  proceedToCheckout: ["input[name='proceedToRetailCheckout']", "input#proceedToRetailCheckout", "a#hlb-ptc-btn-native"],
  placeOrder: ["input.place-your-order-button", "input[name='placeYourOrder1']", "input#submitOrderButtonId"],
  orderId: ["span.order-id", ".order-number", "#order-number", "[data-test-id='order-summary-primary-actions']"]
};

async function captureScreenshot(page: Page, prefix: string): Promise<string> {
  const dir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, `${prefix}-${Date.now()}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

async function getFirstText(page: Page, selList: string[]): Promise<string | null> {
  for (const sel of selList) {
    const el = await page.$(sel);
    if (el) {
      const txt = await el.textContent();
      if (txt) return txt.trim();
    }
  }
  return null;
}

function parsePrice(text?: string | null): { value: number; currency?: string } {
  if (!text) return { value: NaN, currency: undefined };
  const currencyMatch = text.match(/[¥$€£]/);
  const currency = currencyMatch ? currencyMatch[0] : undefined;
  const num = parseFloat(text.replace(/[^\d.,]/g, "").replace(/,/g, ""));
  return { value: num, currency };
}

function parseEstimatedDelivery(text?: string | null): Date | undefined {
  if (!text) return undefined;
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
    if (dt.getTime() < now.getTime()) dt.setMonth(now.getMonth() + 1); // roll over if past
    return dt;
  }
  return undefined;
}

async function ensureLoggedIn(page: Page, email: string, password: string) {
  await page.goto("https://www.amazon.co.jp/ap/signin", { waitUntil: "networkidle" });
  await page.fill("input[name='email']", email);
  await page.click("input#continue");
  await page.fill("input[name='password']", password);
  await page.click("input#signInSubmit");

  const twofa = await page.$("#auth-mfa-otpcode, #auth-mfa-otpcode-input, input[name='otpCode']");
  if (twofa) {
    const path = await captureScreenshot(page, "amazon-2fa");
    throw new AutomationError("AMAZON_2FA_REQUIRED", "2FA required. Manual intervention needed.", path);
  }
}

export async function scrapeAmazonProduct(
  productUrl: string
): Promise<{ browser: Browser; page: Page; result: AmazonScrapeResult }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(productUrl, { waitUntil: "networkidle" });

  const priceText = await getFirstText(page, selectors.price);
  const availabilityText = await getFirstText(page, selectors.availability);
  const conditionText = await getFirstText(page, selectors.condition);
  const deliveryText = await getFirstText(page, selectors.delivery);
  const pointsText = await getFirstText(page, selectors.points);

  const { value: price, currency } = parsePrice(priceText);
  const isAvailable = availabilityText ? /in stock|available|在庫あり|残り|通常/i.test(availabilityText) : false;
  const isNew = conditionText ? /new|新品/i.test(conditionText) : true;
  const estimatedDelivery = parseEstimatedDelivery(deliveryText);
  const pointsEarned = pointsText ? parseInt(pointsText.replace(/[^\d]/g, ""), 10) || undefined : undefined;

  return {
    browser,
    page,
    result: { price, currency, isAvailable, isNew, estimatedDelivery, pointsEarned, shippingText: deliveryText }
  };
}

export async function purchaseAmazonProduct(input: AmazonPurchaseInput): Promise<AmazonCheckoutResult> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await ensureLoggedIn(page, input.loginEmail, input.loginPassword);
    return await checkoutOnAmazon(page, input);
  } catch (err: any) {
    if (err instanceof AutomationError) throw err;
    const path = await captureScreenshot(page, "amazon-failure");
    throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
  } finally {
    await browser.close();
  }
}

export async function checkoutOnAmazon(page: Page, input: AmazonPurchaseInput): Promise<AmazonCheckoutResult> {
  try {
    await page.goto(input.productUrl, { waitUntil: "networkidle" });
    let added = false;
    for (const sel of selectors.addToCart) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click({ timeout: 8000 }).catch(() => {});
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
        await btn.click({ timeout: 8000 }).catch(() => {});
        proceeded = true;
        break;
      }
    }
    if (!proceeded) {
      const path = await captureScreenshot(page, "proceed-checkout-failed");
      throw new AutomationError("AMAZON_CHECKOUT_FAILED", "Proceed to checkout failed", path);
    }

    await page.waitForSelector("div#address-book-entry-0, .address-book-entry", { timeout: 10000 }).catch(() => {});
    const addressElements = await page.$$(".address-book-entry");
    if (addressElements.length) {
      let addressSelected = false;
      for (const el of addressElements) {
        const text = await el.textContent();
        if (text && text.includes(input.shippingAddressLabel)) {
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
        await btn.click({ timeout: 8000 }).catch(() => {});
        placed = true;
        break;
      }
    }
    if (!placed) {
      const path = await captureScreenshot(page, "place-order-failed");
      throw new AutomationError("AMAZON_PURCHASE_FAILED", "Place order failed", path);
    }

    await page.waitForTimeout(2500);
    const orderIdText = await getFirstText(page, selectors.orderId);
    const priceText = await getFirstText(page, selectors.price);
    const { value: finalPrice, currency } = parsePrice(priceText);

    return {
      amazonOrderId: orderIdText || null,
      finalPrice: Number.isNaN(finalPrice) ? undefined : finalPrice,
      currency,
      shippingCost: undefined,
      pointsUsed: undefined
    };
  } catch (err: any) {
    if (err instanceof AutomationError) throw err;
    const path = await captureScreenshot(page, "amazon-failure");
    throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
  }
}
