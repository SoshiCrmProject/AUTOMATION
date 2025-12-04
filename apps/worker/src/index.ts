import { Worker, Queue } from "bullmq";
import dotenv from "dotenv";
import { Prisma, PrismaClient, ProcessingStatus, ProcessingMode, AutoFulfillmentMode, AmazonOrderStatus, ShopeeStatus } from "@prisma/client";
import { calculateProfit, classifyFulfillmentDecision, calculateShippingDays } from "@shopee-amazon/shared";
import fetch from "node-fetch";
import { decryptSecret } from "./secret";
import { fetchNewOrders, fetchOrderDetail, getShopInfo } from "./shopeeClient";
import { scrapeAmazonProduct, purchaseAmazonProduct, AutomationError, verifyAmazonCredentials } from "./amazonAutomation";

dotenv.config();

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === "rediss:" ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
const queueName = "orders";
const queue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});
const prisma = new PrismaClient();
const AES_KEY = process.env.AES_SECRET_KEY;
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

type ProcessOrderJob = {
  shopeeOrderId: string;
  shopId: string;
  retrySource?: string;
};

type ScrapePreviewJobResult =
  | {
      ok: true;
      result: {
        productUrl: string;
        price: number;
        currency?: string;
        isAvailable: boolean;
        isNew: boolean;
        estimatedDelivery?: string | null;
        pointsEarned?: number | null;
        shippingText?: string | null;
        title?: string | null;
        asin?: string | null;
        scrapedAt: string;
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        screenshotPath?: string | null;
      };
    };

new Worker(
  queueName,
  async (job) => {
    if (job.name === "process-order") {
      return processOrder(job.data as ProcessOrderJob);
    }
    if (job.name === "poll-shop") {
      return pollShop(job.data.shopId as string);
    }
    if (job.name === "toggle-auto-shipping") {
      const { shopId, active } = job.data as { shopId: string; active: boolean };
      if (active) {
        await queue.add(
          "poll-shop",
          { shopId },
          { repeat: { every: 60_000 }, jobId: `poll-${shopId}` }
        );
      } else {
        const repeatables = await queue.getRepeatableJobs();
        for (const r of repeatables.filter((r) => r.name === "poll-shop" && r.key.includes(`poll-${shopId}`))) {
          await queue.removeRepeatableByKey(r.key);
        }
      }
    }
    if (job.name === "verify-credentials") {
      return verifyCredentials(job.data.shopId as string);
    }
    if (job.name === "scrape-preview") {
      return runScrapePreview(job.data.productUrl as string);
    }
    // Polling and test scrape stubs intentionally no-op for now
  },
  { connection: redisConnection, concurrency: 2 }
);

// Simplified processor using decision logic; Playwright automation omitted for now.
async function processOrder({ shopeeOrderId, shopId, retrySource }: ProcessOrderJob) {
  const order = await prisma.shopeeOrder.findUnique({
    where: { id: shopeeOrderId },
    include: { shop: true }
  });
  if (!order || order.shopId !== shopId) return;

  const setting = await prisma.autoShippingSetting.findUnique({ where: { shopId } });
  if (!setting || !setting.isActive) {
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.MANUAL }
    });
    return;
  }

  // prerequisites: shopee status ready_to_ship / paid
  if (
    order.shopeeStatus !== ShopeeStatus.READY_TO_SHIP &&
    order.shopeeStatus !== ShopeeStatus.SHIPPED &&
    order.shopeeStatus !== ShopeeStatus.COMPLETED
  ) {
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.UNPROCESSED }
    });
    return;
  }

  // For now assume mapping is already on order.rawPayload.amazonProductUrl or via selection
  let amazonUrl =
    order.rawPayload && typeof order.rawPayload === "object" && "amazonProductUrl" in (order.rawPayload as any)
      ? (order.rawPayload as any).amazonProductUrl
      : null;
  if (!amazonUrl) {
    const items = order.rawPayload && typeof order.rawPayload === "object" && "item_list" in (order.rawPayload as any)
      ? ((order.rawPayload as any).item_list as any[])
      : [];
    const firstItemId = items?.[0]?.item_id ? String(items[0].item_id) : null;
    if (firstItemId) {
      const selection = await prisma.autoShippingShopSelection.findFirst({
        where: { shopId, shopeeItemId: firstItemId, isActive: true }
      });
      if (selection) amazonUrl = selection.amazonProductUrl;
    }
  }
  if (!amazonUrl) {
    await prisma.errorItem.create({
      data: {
        shopeeOrderId,
        shopId,
        amazonProductUrl: null,
        errorCode: "MISSING_MAPPING",
        reason: "No Amazon product mapping found for this Shopee item.",
        filterFailureType: null,
        profitValue: null,
        shippingDays: null,
        metadata: {}
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.MANUAL }
    });
    return;
  }

  // Real scrape to evaluate price/points/shipping
  const scrape = await scrapeAmazonProduct(amazonUrl);
  let scrapeClosed = false;
  const cleanupScrape = async () => {
    if (scrapeClosed) return;
    scrapeClosed = true;
    await scrape.page.close().catch(() => {});
    if (scrape.context) {
      await scrape.context.close().catch(() => {});
    }
  };
  const { price, pointsEarned, estimatedDelivery, isAvailable, isNew, currency: amazonCurrency } = scrape.result;
  if (!isAvailable || !isNew || !price || Number.isNaN(price)) {
    await prisma.errorItem.create({
      data: {
        shopeeOrderId,
        shopId,
        amazonProductUrl: amazonUrl,
        errorCode: !isAvailable ? "AMAZON_OUT_OF_STOCK" : "AMAZON_USED_ONLY",
        reason: !isAvailable ? "Out of stock" : "Only used condition",
        filterFailureType: null,
        profitValue: null,
        shippingDays: null,
        metadata: { amazonCurrency }
      }
    });
    await cleanupScrape();
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.AUTO }
    });
    return;
  }

  const profitResult = calculateProfit({
    shopeeSalePrice: Number(order.orderTotal),
    amazonPrice: price,
    amazonPoints: pointsEarned,
    includePoints: setting.includePoints,
    includeDomesticShipping: setting.includeDomesticShipping
  });
  const shippingDays = estimatedDelivery ? calculateShippingDays(estimatedDelivery) : setting.maxShippingDays;

  await prisma.shopeeOrder.update({
    where: { id: shopeeOrderId },
    data: {
      expectedProfit: profitResult.expectedProfit,
      expectedProfitCurrency: order.currency,
      shippingDays,
      usedIncludePoints: setting.includePoints,
      usedIncludeDomesticShipping: setting.includeDomesticShipping
    }
  });

  const decision = classifyFulfillmentDecision({
    isActive: setting.isActive,
    isDryRun: setting.isDryRun,
    autoFulfillmentMode: setting.autoFulfillmentMode as AutoFulfillmentMode,
    minExpectedProfit: Number(setting.minExpectedProfit),
    maxShippingDays: setting.maxShippingDays,
    reviewBandPercent: setting.reviewBandPercent ? Number(setting.reviewBandPercent) : null,
    calculatedProfit: profitResult.expectedProfit,
    shippingDays
  });

  if (decision.decision === "SKIP") {
    await prisma.errorItem.create({
      data: {
        shopeeOrderId,
        shopId,
        amazonProductUrl: amazonUrl,
        errorCode: "FILTER_FAILED",
        reason: decision.reason ?? "Filter failed",
        filterFailureType: decision.reason ?? undefined,
        profitValue: profitResult.expectedProfit,
        shippingDays,
        metadata: { amazonCurrency }
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.SKIPPED, processingMode: setting.isDryRun ? ProcessingMode.AUTO_DRY_RUN : ProcessingMode.AUTO }
    });
    return;
  }

  if (decision.decision === "MANUAL_REVIEW") {
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: setting.isDryRun ? ProcessingMode.AUTO_DRY_RUN : ProcessingMode.AUTO }
    });
    return;
  }

  if (decision.decision === "DRY_RUN") {
    await prisma.amazonOrder.create({
      data: {
        shopeeOrderId,
        amazonOrderId: null,
        status: AmazonOrderStatus.CREATED,
        productUrl: amazonUrl,
        purchasePrice: profitResult.breakdown.base,
        currency: order.currency,
        placedAt: null
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.AUTO_DRY_RUN }
    });
    await cleanupScrape();
    return;
  }

  // AUTO_FULFILL path: enqueue real automation placeholder
  const amazonCred = await prisma.amazonCredential.findUnique({ where: { shopId } });
  if (!amazonCred || !AES_KEY) {
    await prisma.errorItem.create({
      data: {
        shopeeOrderId,
        shopId,
        amazonProductUrl: amazonUrl,
        errorCode: "MISSING_AMAZON_CREDENTIALS",
        reason: "Amazon credentials missing",
        filterFailureType: null,
        profitValue: profitResult.expectedProfit,
        shippingDays,
        metadata: {}
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: {
        processingStatus: ProcessingStatus.MANUAL_REVIEW,
        processingMode: ProcessingMode.AUTO,
        lastProcessingErrorCode: "MISSING_AMAZON_CREDENTIALS",
        lastProcessingErrorMessage: "Amazon credentials missing"
      }
    });
    return;
  }

  await prisma.shopeeOrder.update({
    where: { id: shopeeOrderId },
    data: { processingStatus: ProcessingStatus.PROCESSING, processingMode: ProcessingMode.AUTO }
  });

  // Placeholder for real Playwright checkout:
  try {
    const amazonPassword = decryptSecret(amazonCred.passwordEncrypted, amazonCred.encryptionIv, AES_KEY);
    const orderResult = await purchaseAmazonProduct({
      productUrl: amazonUrl,
      shippingAddressLabel: process.env.AMAZON_SHIPPING_LABEL ?? "Shopee Warehouse",
      loginEmail: amazonCred.username,
      loginPassword: amazonPassword
    });
    await prisma.amazonOrder.create({
      data: {
        shopeeOrderId,
        amazonOrderId: orderResult.amazonOrderId,
        status: AmazonOrderStatus.PLACED,
        productUrl: amazonUrl,
        purchasePrice: orderResult.finalPrice ?? profitResult.breakdown.base,
        currency: orderResult.currency ?? order.currency,
        placedAt: new Date()
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: { processingStatus: ProcessingStatus.FULFILLED }
    });
  } catch (err: any) {
    const code = err instanceof AutomationError ? err.code : "AMAZON_PURCHASE_FAILED";
    const reason = err.message || "Amazon purchase failed";
    const screenshotPath = err instanceof AutomationError ? err.screenshotPath : undefined;
    await prisma.errorItem.create({
      data: {
        shopeeOrderId,
        shopId,
        amazonProductUrl: amazonUrl,
        errorCode: code,
        reason,
        filterFailureType: null,
        profitValue: profitResult.expectedProfit,
        shippingDays,
        metadata: { screenshot: screenshotPath }
      }
    });
    await prisma.shopeeOrder.update({
      where: { id: shopeeOrderId },
      data: {
        processingStatus: ProcessingStatus.MANUAL_REVIEW,
        processingMode: ProcessingMode.AUTO,
        lastProcessingErrorCode: code,
        lastProcessingErrorMessage: reason
      }
    });
  } finally {
    await cleanupScrape();
  }
}

async function runScrapePreview(productUrl: string): Promise<ScrapePreviewJobResult> {
  let pageRef: { close: () => Promise<void> } | null = null;
  let contextRef: { close: () => Promise<void> } | null = null;
  try {
    const scrape = await scrapeAmazonProduct(productUrl);
    pageRef = scrape.page;
    contextRef = scrape.context ?? null;

    const normalized = {
      productUrl,
      price: scrape.result.price,
      currency: scrape.result.currency,
      isAvailable: scrape.result.isAvailable,
      isNew: scrape.result.isNew,
      estimatedDelivery: scrape.result.estimatedDelivery ? scrape.result.estimatedDelivery.toISOString() : null,
      pointsEarned: typeof scrape.result.pointsEarned === "number" ? scrape.result.pointsEarned : null,
      shippingText: scrape.result.shippingText ?? null,
      title: scrape.result.title ?? null,
      asin: scrape.result.asin ?? null,
      scrapedAt: new Date().toISOString()
    };

    return { ok: true, result: normalized };
  } catch (err: any) {
    if (err instanceof AutomationError) {
      return {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          screenshotPath: err.screenshotPath ?? null
        }
      };
    }
    throw err;
  } finally {
    if (pageRef) {
      await pageRef.close().catch(() => {});
    }
    if (contextRef) {
      await contextRef.close().catch(() => {});
    }
  }
}

async function classifyShopOrders(shopId: string) {
  const setting = await prisma.autoShippingSetting.findUnique({ where: { shopId } });
  if (!setting || !setting.isActive) return;
  const orders = await prisma.shopeeOrder.findMany({
    where: { shopId, processingStatus: ProcessingStatus.UNPROCESSED }
  });
  for (const order of orders) {
    const amazonUrl =
      order.rawPayload && typeof order.rawPayload === "object" && "amazonProductUrl" in (order.rawPayload as any)
        ? (order.rawPayload as any).amazonProductUrl
        : null;
    if (!amazonUrl) {
      await prisma.errorItem.create({
        data: {
          shopeeOrderId: order.id,
          shopId,
          amazonProductUrl: null,
          errorCode: "MISSING_MAPPING",
          reason: "No Amazon product mapping found for this Shopee item.",
          filterFailureType: null,
          profitValue: null,
          shippingDays: null,
          metadata: {}
        }
      });
      await prisma.shopeeOrder.update({
        where: { id: order.id },
        data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.MANUAL }
      });
      continue;
    }

    const profitResult = calculateProfit({
      shopeeSalePrice: Number(order.orderTotal),
      amazonPrice: Number(order.orderTotal) * 0.9,
      includePoints: setting.includePoints,
      includeDomesticShipping: setting.includeDomesticShipping
    });
    const shippingDays = 2;
    await prisma.shopeeOrder.update({
      where: { id: order.id },
      data: {
        expectedProfit: profitResult.expectedProfit,
        expectedProfitCurrency: order.currency,
        shippingDays,
        usedIncludePoints: setting.includePoints,
        usedIncludeDomesticShipping: setting.includeDomesticShipping
      }
    });
    const decision = classifyFulfillmentDecision({
      isActive: setting.isActive,
      isDryRun: setting.isDryRun,
      autoFulfillmentMode: setting.autoFulfillmentMode as AutoFulfillmentMode,
      minExpectedProfit: Number(setting.minExpectedProfit),
      maxShippingDays: setting.maxShippingDays,
      reviewBandPercent: setting.reviewBandPercent ? Number(setting.reviewBandPercent) : null,
      calculatedProfit: profitResult.expectedProfit,
      shippingDays
    });
    if (decision.decision === "SKIP") {
      await prisma.shopeeOrder.update({
        where: { id: order.id },
        data: {
          processingStatus: ProcessingStatus.SKIPPED,
          processingMode: setting.isDryRun ? ProcessingMode.AUTO_DRY_RUN : ProcessingMode.AUTO,
          lastProcessingErrorCode: decision.reason ?? "FILTER_FAILED",
          lastProcessingErrorMessage: decision.reason ?? "Filter failed"
        }
      });
      continue;
    }
    if (decision.decision === "MANUAL_REVIEW") {
      await prisma.shopeeOrder.update({
        where: { id: order.id },
        data: {
          processingStatus: ProcessingStatus.MANUAL_REVIEW,
          processingMode: setting.isDryRun ? ProcessingMode.AUTO_DRY_RUN : ProcessingMode.AUTO
        }
      });
      continue;
    }
    if (decision.decision === "DRY_RUN") {
      await prisma.amazonOrder.create({
        data: {
          shopeeOrderId: order.id,
          amazonOrderId: null,
          status: AmazonOrderStatus.CREATED,
          productUrl: amazonUrl,
          purchasePrice: profitResult.breakdown.base,
          currency: order.currency,
          placedAt: null
        }
      });
      await prisma.shopeeOrder.update({
        where: { id: order.id },
        data: {
          processingStatus: ProcessingStatus.MANUAL_REVIEW,
          processingMode: ProcessingMode.AUTO_DRY_RUN
        }
      });
      continue;
    }
    // enqueue process-order for auto fulfill
    await prisma.shopeeOrder.update({
      where: { id: order.id },
      data: {
        processingStatus: ProcessingStatus.QUEUED,
        processingMode: ProcessingMode.AUTO
      }
    });
    await queue.add("process-order", { shopeeOrderId: order.id, shopId }, { removeOnComplete: true, removeOnFail: false });
  }
}

async function pollShop(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { setting: true, ShopeeCredential: true, selections: true }
  });
  
  // Validate shop configuration before proceeding
  if (!shop) {
    console.error(`Shop ${shopId} not found`);
    return;
  }
  
  if (!shop.setting || !shop.setting.isActive) {
    console.log(`Shop ${shopId} inactive or missing settings`);
    return;
  }
  
  const shopeeCred = shop.ShopeeCredential;
  if (!shopeeCred || !AES_KEY) {
    console.error(`Shop ${shopId} missing Shopee credentials or AES key`);
    await sendAlert("SHOPEE_CONFIG_ERROR", `Shop ${shopId} missing credentials`, { shopId });
    return;
  }

  const partnerKey = decryptSecret(shopeeCred.partnerKeyEncrypted, shopeeCred.partnerKeyIv, AES_KEY);
  const accessToken = decryptSecret(shopeeCred.accessTokenEncrypted, shopeeCred.accessTokenIv, AES_KEY);

  const cfg = {
    partnerId: shopeeCred.partnerId,
    partnerKey,
    accessToken,
    shopId: shop.shopeeShopId,
    baseUrl: shopeeCred.baseUrl
  };

  let orders;
  try {
    // Use last polled timestamp for incremental polling
    orders = await fetchNewOrders(cfg, shop.setting.lastShopeePolledAt ?? undefined);
    
    // Update last polled timestamp after successful fetch
    await prisma.autoShippingSetting.update({
      where: { shopId },
      data: { lastShopeePolledAt: new Date() }
    });
  } catch (err: any) {
    await sendAlert("SHOPEE_POLL_FAIL", err.message, { shopId });
    return;
  }

  for (const o of orders ?? []) {
    try {
      // Skip if already queued/processing/fulfilled
      const existing = await prisma.shopeeOrder.findUnique({ where: { shopeeOrderSn: o.order_sn } });
      if (existing && (existing.processingStatus === ProcessingStatus.QUEUED || existing.processingStatus === ProcessingStatus.PROCESSING || existing.processingStatus === ProcessingStatus.FULFILLED)) {
        continue;
      }

      // Only process ready/paid-like statuses
      const mappedStatus = mapShopeeStatus(o.status);
      if (
        mappedStatus !== ShopeeStatus.READY_TO_SHIP &&
        mappedStatus !== ShopeeStatus.SHIPPED &&
        mappedStatus !== ShopeeStatus.COMPLETED
      ) {
        continue;
      }

      const detail = await fetchOrderDetail(cfg, o.order_sn);
      const payload = detail ?? o;
      // Resolve mapping per item if not present in payload
      let amazonUrlFromMapping: string | null = null;
      const items = detail?.item_list ?? o.item_list ?? [];
      for (const item of items) {
        const selection = shop.selections.find((s) => s.shopeeItemId === String(item.item_id) && s.isActive);
        if (selection) {
          amazonUrlFromMapping = selection.amazonProductUrl;
          break;
        }
      }
      await prisma.shopeeOrder.upsert({
        where: { shopeeOrderSn: o.order_sn },
        update: {
          shopeeStatus: mappedStatus,
          rawPayload: {
            ...payload,
            amazonProductUrl: (payload as any)?.amazonProductUrl ?? amazonUrlFromMapping ?? null
          } as Prisma.InputJsonValue
        },
        create: {
          shopeeOrderSn: o.order_sn,
          shopId: shopId,
          shopeeStatus: mappedStatus,
          orderTotal: new Prisma.Decimal(o.total_amount ?? 0),
          shippingFee: new Prisma.Decimal(0),
          currency: "JPY",
          buyerAddressJson: (detail?.recipient_address ?? o.recipient_address) as Prisma.InputJsonValue,
          rawPayload: {
            ...payload,
            amazonProductUrl: (payload as any)?.amazonProductUrl ?? amazonUrlFromMapping ?? null
          } as Prisma.InputJsonValue,
          processingStatus: ProcessingStatus.UNPROCESSED
        }
      });
    } catch (e: any) {
      console.error(`Failed to process order ${o.order_sn}:`, e.message);
      await sendAlert("SHOPEE_UPSERT_FAIL", e.message, { shopId, orderSn: o.order_sn });
      // Continue processing other orders instead of failing completely
    }
  }

  await classifyShopOrders(shopId);
}

async function verifyCredentials(shopId: string) {
  if (!AES_KEY) {
    console.error("Missing AES key, cannot verify credentials");
    return;
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      ShopeeCredential: true,
      amazonCredential: true
    }
  });
  if (!shop) {
    console.warn(`Shop ${shopId} not found for credential verification`);
    return;
  }

  if (shop.ShopeeCredential) {
    try {
      const partnerKey = decryptSecret(
        shop.ShopeeCredential.partnerKeyEncrypted,
        shop.ShopeeCredential.partnerKeyIv,
        AES_KEY
      );
      const accessToken = shop.ShopeeCredential.accessTokenEncrypted
        ? decryptSecret(
            shop.ShopeeCredential.accessTokenEncrypted,
            shop.ShopeeCredential.accessTokenIv,
            AES_KEY
          )
        : "";
      await getShopInfo({
        partnerId: shop.ShopeeCredential.partnerId,
        partnerKey,
        accessToken: accessToken || undefined,
        shopId: shop.shopeeShopId,
        baseUrl: shop.ShopeeCredential.baseUrl
      });
      await prisma.shopeeCredential.update({
        where: { id: shop.ShopeeCredential.id },
        data: {
          lastValidatedAt: new Date(),
          lastValidationStatus: "healthy",
          lastValidationError: null
        }
      });
    } catch (err: any) {
      const message = err?.message || "Shopee credential check failed";
      await prisma.shopeeCredential.update({
        where: { id: shop.ShopeeCredential.id },
        data: {
          lastValidatedAt: new Date(),
          lastValidationStatus: "failed",
          lastValidationError: message.slice(0, 500)
        }
      });
      await sendAlert("SHOPEE_CREDENTIAL_FAIL", message, { shopId });
    }
  }

  if (shop.amazonCredential) {
    try {
      const password = decryptSecret(
        shop.amazonCredential.passwordEncrypted,
        shop.amazonCredential.encryptionIv,
        AES_KEY
      );
      await verifyAmazonCredentials({
        loginEmail: shop.amazonCredential.username,
        loginPassword: password
      });
      await prisma.amazonCredential.update({
        where: { id: shop.amazonCredential.id },
        data: {
          lastValidatedAt: new Date(),
          lastValidationStatus: "healthy",
          lastValidationError: null
        }
      });
    } catch (err: any) {
      const message = err instanceof AutomationError ? err.message : err?.message || "Amazon credential check failed";
      await prisma.amazonCredential.update({
        where: { id: shop.amazonCredential.id },
        data: {
          lastValidatedAt: new Date(),
          lastValidationStatus: "failed",
          lastValidationError: message.slice(0, 500)
        }
      });
      await sendAlert("AMAZON_CREDENTIAL_FAIL", message, { shopId });
    }
  }
}

function mapShopeeStatus(status: string): ShopeeStatus {
  const normalizedStatus = status?.toUpperCase().replace(/[_\s-]/g, '_');
  
  switch (normalizedStatus) {
    case 'READY_TO_SHIP':
    case 'READYTOSHIP':
    case 'AWAITING_SHIPMENT':
    case 'READY_TO_SHIP_AWAITING_PICKUP':
    case 'READY_TO_SHIP_SHIPPING':
      return ShopeeStatus.READY_TO_SHIP;
    case 'SHIPPED':
    case 'AWAITING_PICKUP':
    case 'IN_TRANSIT':
      return ShopeeStatus.SHIPPED;
    case 'COMPLETED':
    case 'DELIVERED':
      return ShopeeStatus.COMPLETED;
    case 'CANCELLED':
    case 'IN_CANCEL':
    case 'CANCELED':
      return ShopeeStatus.CANCELLED;
    case 'RETURNED':
    case 'RETURN':
      return ShopeeStatus.RETURNED;
    case 'UNPAID':
    case 'PENDING':
    case 'INVOICE_PENDING':
    default:
      return ShopeeStatus.UNPAID;
  }
}

async function sendAlert(code: string, message: string, order?: any) {
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        message,
        orderId: order?.orderNumber,
        shopId: order?.shopId,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    // best effort
  }
}
