import { chromium, Browser, Page, BrowserContext } from "playwright";
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
  title?: string | null;
  asin?: string | null;
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
  shippingProfile?: {
    label?: string;
    contactName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    amazonAddressLabel?: string;
  };
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

// Browser context pool for session reuse
class BrowserPool {
  private browser: Browser | null = null;
  private contexts: Map<string, { context: BrowserContext; lastUsed: number }> = new Map();
  private readonly maxIdleTime = 10 * 60 * 1000; // 10 minutes

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async getContext(email: string): Promise<BrowserContext> {
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
    const hasState = fs.existsSync(storagePath);
    const context = hasState
      ? await browser.newContext({ storageState: storagePath })
      : await browser.newContext();
    
    this.contexts.set(email, { context, lastUsed: Date.now() });
    return context;
  }

  async saveContext(email: string, context: BrowserContext) {
    const storagePath = this.getStoragePath(email);
    await context.storageState({ path: storagePath });
  }

  private getStoragePath(email: string): string {
    const dir = path.join(process.cwd(), "tmp", "sessions");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeName = email.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(dir, `amazon_${safeName}.json`);
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

function extractAsinFromUrl(productUrl: string): string | null {
  const regex = /(?:dp|gp\/[A-Za-z0-9_-]+\/product)\/([A-Z0-9]{10})/i;
  const alt = /([A-Z0-9]{10})(?:[/?]|$)/i;
  const primary = productUrl.match(regex)?.[1];
  if (primary) return primary.toUpperCase();
  const secondary = productUrl.match(alt)?.[1];
  return secondary ? secondary.toUpperCase() : null;
}

async function extractAsinFromDom(page: Page): Promise<string | null> {
  const fromBullets = await page
    .$$eval("#detailBullets_feature_div li", (nodes) => {
      for (const node of nodes) {
        const text = node.textContent || "";
        if (/ASIN/i.test(text)) {
          const match = text.match(/([A-Z0-9]{10})/i);
          if (match) return match[1].toUpperCase();
        }
      }
      return null;
    })
    .catch(() => null);
  if (fromBullets) return fromBullets;

  return page
    .$$eval("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr", (rows) => {
      for (const row of rows) {
        const header = row.querySelector("th")?.textContent || "";
        const value = row.querySelector("td")?.textContent || "";
        if (/ASIN/i.test(header)) {
          const match = value.match(/([A-Z0-9]{10})/i);
          if (match) return match[1].toUpperCase();
        }
      }
      return null;
    })
    .catch(() => null);
}

async function getProductTitle(page: Page): Promise<string | null> {
  const el = await page.$("#productTitle, #titleSection #title, h1#title");
  if (!el) return null;
  const text = await el.textContent();
  return text?.trim() || null;
}

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

export async function verifyAmazonCredentials(input: { loginEmail: string; loginPassword: string }) {
  const context = await browserPool.getContext(input.loginEmail);
  const page = await context.newPage();
  try {
    await ensureLoggedIn(page, input.loginEmail, input.loginPassword);
    await browserPool.saveContext(input.loginEmail, context);
  } finally {
    await page.close();
  }
}

export async function scrapeAmazonProduct(
  productUrl: string
): Promise<{ browser: Browser; context: BrowserContext; page: Page; result: AmazonScrapeResult }> {
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

export async function purchaseAmazonProduct(input: AmazonPurchaseInput): Promise<AmazonCheckoutResult> {
  const context = await browserPool.getContext(input.loginEmail);
  const page = await context.newPage();
  
  try {
    await ensureLoggedIn(page, input.loginEmail, input.loginPassword);
    const result = await checkoutOnAmazon(page, input);
    
    // Save session state for reuse
    await browserPool.saveContext(input.loginEmail, context);
    
    await page.close();
    return result;
  } catch (err: any) {
    await page.close();
    if (err instanceof AutomationError) throw err;
    const path = await captureScreenshot(page, "amazon-failure");
    throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
  }
}

export async function checkoutOnAmazon(page: Page, input: AmazonPurchaseInput): Promise<AmazonCheckoutResult> {
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
      } catch (e) {
        // Continue if delete fails
      }
    }
    
    // Navigate to product and add to cart
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
        if (!text) continue;
        
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
        // Try to add address when shipping profile provided
        if (input.shippingProfile && input.shippingProfile.addressLine1) {
          try {
            // Click "Add new address" or similar control
            const addSelectors = ["a#ya-myab-address-add-link", "#add-new-address", "a[data-action='add-address']", "#ya-myab-add-address-link"];
            let clicked = false;
            for (const s of addSelectors) {
              const btn = await page.$(s);
              if (btn) {
                await btn.click().catch(() => {});
                clicked = true;
                break;
              }
            }
            // Fallback: try button with text
            if (!clicked) {
              const btn = await page.$("button:has-text('Add address'), button:has-text('Add new address')");
              if (btn) { await btn.click().catch(() => {}); clicked = true; }
            }

            await page.waitForTimeout(800);
            // Fill common address fields - try multiple selector variants
            const tryFill = async (selList: string[], value: string) => {
              for (const s of selList) {
                const el = await page.$(s);
                if (el) {
                  await el.fill(value).catch(() => {});
                  return true;
                }
              }
              return false;
            };

            await tryFill(["input#address-ui-widgets-enterAddressFullName","input[name='fullName']","input[name='addressFullName']"], input.shippingProfile.contactName || input.shippingProfile.label || "");
            await tryFill(["input#address-ui-widgets-enterAddressPhoneNumber","input[name='phoneNumber']","input[name='telephone']"], input.shippingProfile.phone || "");
            await tryFill(["input#address-ui-widgets-enterAddressPostalCode","input[name='postalCode']","input[name='zipCode']"], input.shippingProfile.postalCode || "");
            await tryFill(["input#address-ui-widgets-enterAddressLine1","input[name='addressLine1']","input[name='street1']"], input.shippingProfile.addressLine1 || "");
            await tryFill(["input#address-ui-widgets-enterAddressLine2","input[name='addressLine2']","input[name='street2']"], input.shippingProfile.addressLine2 || "");
            await tryFill(["input#address-ui-widgets-enterAddressCity","input[name='city']","input[name='townOrCity']"], input.shippingProfile.city || "");
            // State/prefecture may be a select
            const stateValue = input.shippingProfile.state || "";
            if (stateValue) {
              const sel = await page.$("select#address-ui-widgets-enterAddressStateOrRegion-dropdown, select[name='stateOrRegion']");
              if (sel) {
                await sel.selectOption({ label: stateValue }).catch(() => {});
              } else {
                await tryFill(["input#address-ui-widgets-enterAddressStateOrRegion","input[name='stateOrRegion']","input[name='state']"], stateValue);
              }
            }

            // Submit address form - try common buttons
            const saveButtons = ["input[name='shipToThisAddress']","button#address-ui-widgets-form-submit-button","button:has-text('Add address'), button:has-text('Save address')"];
            for (const s of saveButtons) {
              const btn = await page.$(s);
              if (btn) {
                await btn.click().catch(() => {});
                break;
              }
            }

            await page.waitForTimeout(1200);
            // Try selecting newly added address
            const newAddressEls = await page.$$(".address-book-entry");
            for (const el of newAddressEls) {
              const text = await el.textContent();
              if (!text) continue;
              if (text.includes(input.shippingProfile.amazonAddressLabel || input.shippingProfile.label || input.shippingProfile.addressLine1 || '')) {
                await el.click().catch(() => {});
                addressSelected = true;
                break;
              }
            }
            if (!addressSelected) {
              // If still not selected, try click first address as last resort
              if (newAddressEls[0]) { await newAddressEls[0].click().catch(() => {}); addressSelected = true; }
            }
          } catch (err) {
            // Fall through to error below
          }
        }

        if (!addressSelected) {
          const path = await captureScreenshot(page, "address-not-found");
          throw new AutomationError("ADDRESS_NOT_FOUND", "Shipping address not found", path);
        }
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
  } catch (err: any) {
    if (err instanceof AutomationError) throw err;
    const path = await captureScreenshot(page, "amazon-failure");
    throw new AutomationError("AMAZON_PURCHASE_FAILED", err.message, path);
  }
}
