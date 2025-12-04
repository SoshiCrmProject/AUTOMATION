"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const shared_1 = require("@shopee-amazon/shared");
const node_fetch_1 = __importDefault(require("node-fetch"));
const secret_1 = require("./secret");
const shopeeClient_1 = require("./shopeeClient");
const amazonAutomation_1 = require("./amazonAutomation");
dotenv_1.default.config();
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
const queue = new bullmq_1.Queue(queueName, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false
    }
});
const prisma = new client_1.PrismaClient();
const AES_KEY = process.env.AES_SECRET_KEY;
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
new bullmq_1.Worker(queueName, async (job) => {
    if (job.name === "process-order") {
        return processOrder(job.data);
    }
    if (job.name === "poll-shop") {
        return pollShop(job.data.shopId);
    }
    if (job.name === "toggle-auto-shipping") {
        const { shopId, active } = job.data;
        if (active) {
            await queue.add("poll-shop", { shopId }, { repeat: { every: 60000 }, jobId: `poll-${shopId}` });
        }
        else {
            const repeatables = await queue.getRepeatableJobs();
            for (const r of repeatables.filter((r) => r.name === "poll-shop" && r.key.includes(`poll-${shopId}`))) {
                await queue.removeRepeatableByKey(r.key);
            }
        }
    }
    if (job.name === "verify-credentials") {
        return verifyCredentials(job.data.shopId);
    }
    if (job.name === "scrape-preview") {
        return runScrapePreview(job.data.productUrl);
    }
    // Polling and test scrape stubs intentionally no-op for now
}, { connection: redisConnection, concurrency: 2 });
// Simplified processor using decision logic; Playwright automation omitted for now.
async function processOrder({ shopeeOrderId, shopId, retrySource }) {
    const order = await prisma.shopeeOrder.findUnique({
        where: { id: shopeeOrderId },
        include: { shop: true }
    });
    if (!order || order.shopId !== shopId)
        return;
    const setting = await prisma.autoShippingSetting.findUnique({ where: { shopId } });
    if (!setting || !setting.isActive) {
        await prisma.shopeeOrder.update({
            where: { id: shopeeOrderId },
            data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.MANUAL }
        });
        return;
    }
    // prerequisites: shopee status ready_to_ship / paid
    if (order.shopeeStatus !== client_1.ShopeeStatus.READY_TO_SHIP &&
        order.shopeeStatus !== client_1.ShopeeStatus.SHIPPED &&
        order.shopeeStatus !== client_1.ShopeeStatus.COMPLETED) {
        await prisma.shopeeOrder.update({
            where: { id: shopeeOrderId },
            data: { processingStatus: client_1.ProcessingStatus.UNPROCESSED }
        });
        return;
    }
    // For now assume mapping is already on order.rawPayload.amazonProductUrl or via selection
    let amazonUrl = order.rawPayload && typeof order.rawPayload === "object" && "amazonProductUrl" in order.rawPayload
        ? order.rawPayload.amazonProductUrl
        : null;
    if (!amazonUrl) {
        const items = order.rawPayload && typeof order.rawPayload === "object" && "item_list" in order.rawPayload
            ? order.rawPayload.item_list
            : [];
        const firstItemId = items?.[0]?.item_id ? String(items[0].item_id) : null;
        if (firstItemId) {
            const selection = await prisma.autoShippingShopSelection.findFirst({
                where: { shopId, shopeeItemId: firstItemId, isActive: true }
            });
            if (selection)
                amazonUrl = selection.amazonProductUrl;
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
            data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.MANUAL }
        });
        return;
    }
    // Real scrape to evaluate price/points/shipping
    const scrape = await (0, amazonAutomation_1.scrapeAmazonProduct)(amazonUrl);
    let scrapeClosed = false;
    const cleanupScrape = async () => {
        if (scrapeClosed)
            return;
        scrapeClosed = true;
        await scrape.page.close().catch(() => { });
        if (scrape.context) {
            await scrape.context.close().catch(() => { });
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
            data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.AUTO }
        });
        return;
    }
    const profitResult = (0, shared_1.calculateProfit)({
        shopeeSalePrice: Number(order.orderTotal),
        amazonPrice: price,
        amazonPoints: pointsEarned,
        includePoints: setting.includePoints,
        includeDomesticShipping: setting.includeDomesticShipping
    });
    const shippingDays = estimatedDelivery ? (0, shared_1.calculateShippingDays)(estimatedDelivery) : setting.maxShippingDays;
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
    const decision = (0, shared_1.classifyFulfillmentDecision)({
        isActive: setting.isActive,
        isDryRun: setting.isDryRun,
        autoFulfillmentMode: setting.autoFulfillmentMode,
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
            data: { processingStatus: client_1.ProcessingStatus.SKIPPED, processingMode: setting.isDryRun ? client_1.ProcessingMode.AUTO_DRY_RUN : client_1.ProcessingMode.AUTO }
        });
        return;
    }
    if (decision.decision === "MANUAL_REVIEW") {
        await prisma.shopeeOrder.update({
            where: { id: shopeeOrderId },
            data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: setting.isDryRun ? client_1.ProcessingMode.AUTO_DRY_RUN : client_1.ProcessingMode.AUTO }
        });
        return;
    }
    if (decision.decision === "DRY_RUN") {
        await prisma.amazonOrder.create({
            data: {
                shopeeOrderId,
                amazonOrderId: null,
                status: client_1.AmazonOrderStatus.CREATED,
                productUrl: amazonUrl,
                purchasePrice: profitResult.breakdown.base,
                currency: order.currency,
                placedAt: null
            }
        });
        await prisma.shopeeOrder.update({
            where: { id: shopeeOrderId },
            data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.AUTO_DRY_RUN }
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
                processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW,
                processingMode: client_1.ProcessingMode.AUTO,
                lastProcessingErrorCode: "MISSING_AMAZON_CREDENTIALS",
                lastProcessingErrorMessage: "Amazon credentials missing"
            }
        });
        return;
    }
    await prisma.shopeeOrder.update({
        where: { id: shopeeOrderId },
        data: { processingStatus: client_1.ProcessingStatus.PROCESSING, processingMode: client_1.ProcessingMode.AUTO }
    });
    // Placeholder for real Playwright checkout:
    try {
        const amazonPassword = (0, secret_1.decryptSecret)(amazonCred.passwordEncrypted, amazonCred.encryptionIv, AES_KEY);
        const orderResult = await (0, amazonAutomation_1.purchaseAmazonProduct)({
            productUrl: amazonUrl,
            shippingAddressLabel: process.env.AMAZON_SHIPPING_LABEL ?? "Shopee Warehouse",
            loginEmail: amazonCred.username,
            loginPassword: amazonPassword
        });
        await prisma.amazonOrder.create({
            data: {
                shopeeOrderId,
                amazonOrderId: orderResult.amazonOrderId,
                status: client_1.AmazonOrderStatus.PLACED,
                productUrl: amazonUrl,
                purchasePrice: orderResult.finalPrice ?? profitResult.breakdown.base,
                currency: orderResult.currency ?? order.currency,
                placedAt: new Date()
            }
        });
        await prisma.shopeeOrder.update({
            where: { id: shopeeOrderId },
            data: { processingStatus: client_1.ProcessingStatus.FULFILLED }
        });
    }
    catch (err) {
        const code = err instanceof amazonAutomation_1.AutomationError ? err.code : "AMAZON_PURCHASE_FAILED";
        const reason = err.message || "Amazon purchase failed";
        const screenshotPath = err instanceof amazonAutomation_1.AutomationError ? err.screenshotPath : undefined;
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
                processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW,
                processingMode: client_1.ProcessingMode.AUTO,
                lastProcessingErrorCode: code,
                lastProcessingErrorMessage: reason
            }
        });
    }
    finally {
        await cleanupScrape();
    }
}
async function runScrapePreview(productUrl) {
    let pageRef = null;
    let contextRef = null;
    try {
        const scrape = await (0, amazonAutomation_1.scrapeAmazonProduct)(productUrl);
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
    }
    catch (err) {
        if (err instanceof amazonAutomation_1.AutomationError) {
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
    }
    finally {
        if (pageRef) {
            await pageRef.close().catch(() => { });
        }
        if (contextRef) {
            await contextRef.close().catch(() => { });
        }
    }
}
async function classifyShopOrders(shopId) {
    const setting = await prisma.autoShippingSetting.findUnique({ where: { shopId } });
    if (!setting || !setting.isActive)
        return;
    const orders = await prisma.shopeeOrder.findMany({
        where: { shopId, processingStatus: client_1.ProcessingStatus.UNPROCESSED }
    });
    for (const order of orders) {
        const amazonUrl = order.rawPayload && typeof order.rawPayload === "object" && "amazonProductUrl" in order.rawPayload
            ? order.rawPayload.amazonProductUrl
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
                data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.MANUAL }
            });
            continue;
        }
        const profitResult = (0, shared_1.calculateProfit)({
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
        const decision = (0, shared_1.classifyFulfillmentDecision)({
            isActive: setting.isActive,
            isDryRun: setting.isDryRun,
            autoFulfillmentMode: setting.autoFulfillmentMode,
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
                    processingStatus: client_1.ProcessingStatus.SKIPPED,
                    processingMode: setting.isDryRun ? client_1.ProcessingMode.AUTO_DRY_RUN : client_1.ProcessingMode.AUTO,
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
                    processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW,
                    processingMode: setting.isDryRun ? client_1.ProcessingMode.AUTO_DRY_RUN : client_1.ProcessingMode.AUTO
                }
            });
            continue;
        }
        if (decision.decision === "DRY_RUN") {
            await prisma.amazonOrder.create({
                data: {
                    shopeeOrderId: order.id,
                    amazonOrderId: null,
                    status: client_1.AmazonOrderStatus.CREATED,
                    productUrl: amazonUrl,
                    purchasePrice: profitResult.breakdown.base,
                    currency: order.currency,
                    placedAt: null
                }
            });
            await prisma.shopeeOrder.update({
                where: { id: order.id },
                data: {
                    processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW,
                    processingMode: client_1.ProcessingMode.AUTO_DRY_RUN
                }
            });
            continue;
        }
        // enqueue process-order for auto fulfill
        await prisma.shopeeOrder.update({
            where: { id: order.id },
            data: {
                processingStatus: client_1.ProcessingStatus.QUEUED,
                processingMode: client_1.ProcessingMode.AUTO
            }
        });
        await queue.add("process-order", { shopeeOrderId: order.id, shopId }, { removeOnComplete: true, removeOnFail: false });
    }
}
async function pollShop(shopId) {
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
    const partnerKey = (0, secret_1.decryptSecret)(shopeeCred.partnerKeyEncrypted, shopeeCred.partnerKeyIv, AES_KEY);
    const accessToken = (0, secret_1.decryptSecret)(shopeeCred.accessTokenEncrypted, shopeeCred.accessTokenIv, AES_KEY);
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
        orders = await (0, shopeeClient_1.fetchNewOrders)(cfg, shop.setting.lastShopeePolledAt ?? undefined);
        // Update last polled timestamp after successful fetch
        await prisma.autoShippingSetting.update({
            where: { shopId },
            data: { lastShopeePolledAt: new Date() }
        });
    }
    catch (err) {
        await sendAlert("SHOPEE_POLL_FAIL", err.message, { shopId });
        return;
    }
    for (const o of orders ?? []) {
        try {
            // Skip if already queued/processing/fulfilled
            const existing = await prisma.shopeeOrder.findUnique({ where: { shopeeOrderSn: o.order_sn } });
            if (existing && (existing.processingStatus === client_1.ProcessingStatus.QUEUED || existing.processingStatus === client_1.ProcessingStatus.PROCESSING || existing.processingStatus === client_1.ProcessingStatus.FULFILLED)) {
                continue;
            }
            // Only process ready/paid-like statuses
            const mappedStatus = mapShopeeStatus(o.status);
            if (mappedStatus !== client_1.ShopeeStatus.READY_TO_SHIP &&
                mappedStatus !== client_1.ShopeeStatus.SHIPPED &&
                mappedStatus !== client_1.ShopeeStatus.COMPLETED) {
                continue;
            }
            const detail = await (0, shopeeClient_1.fetchOrderDetail)(cfg, o.order_sn);
            const payload = detail ?? o;
            // Resolve mapping per item if not present in payload
            let amazonUrlFromMapping = null;
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
                        amazonProductUrl: payload?.amazonProductUrl ?? amazonUrlFromMapping ?? null
                    }
                },
                create: {
                    shopeeOrderSn: o.order_sn,
                    shopId: shopId,
                    shopeeStatus: mappedStatus,
                    orderTotal: new client_1.Prisma.Decimal(o.total_amount ?? 0),
                    shippingFee: new client_1.Prisma.Decimal(0),
                    currency: "JPY",
                    buyerAddressJson: (detail?.recipient_address ?? o.recipient_address),
                    rawPayload: {
                        ...payload,
                        amazonProductUrl: payload?.amazonProductUrl ?? amazonUrlFromMapping ?? null
                    },
                    processingStatus: client_1.ProcessingStatus.UNPROCESSED
                }
            });
        }
        catch (e) {
            console.error(`Failed to process order ${o.order_sn}:`, e.message);
            await sendAlert("SHOPEE_UPSERT_FAIL", e.message, { shopId, orderSn: o.order_sn });
            // Continue processing other orders instead of failing completely
        }
    }
    await classifyShopOrders(shopId);
}
async function verifyCredentials(shopId) {
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
            const partnerKey = (0, secret_1.decryptSecret)(shop.ShopeeCredential.partnerKeyEncrypted, shop.ShopeeCredential.partnerKeyIv, AES_KEY);
            const accessToken = shop.ShopeeCredential.accessTokenEncrypted
                ? (0, secret_1.decryptSecret)(shop.ShopeeCredential.accessTokenEncrypted, shop.ShopeeCredential.accessTokenIv, AES_KEY)
                : "";
            await (0, shopeeClient_1.getShopInfo)({
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
        }
        catch (err) {
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
            const password = (0, secret_1.decryptSecret)(shop.amazonCredential.passwordEncrypted, shop.amazonCredential.encryptionIv, AES_KEY);
            await (0, amazonAutomation_1.verifyAmazonCredentials)({
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
        }
        catch (err) {
            const message = err instanceof amazonAutomation_1.AutomationError ? err.message : err?.message || "Amazon credential check failed";
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
function mapShopeeStatus(status) {
    const normalizedStatus = status?.toUpperCase().replace(/[_\s-]/g, '_');
    switch (normalizedStatus) {
        case 'READY_TO_SHIP':
        case 'READYTOSHIP':
        case 'AWAITING_SHIPMENT':
        case 'READY_TO_SHIP_AWAITING_PICKUP':
        case 'READY_TO_SHIP_SHIPPING':
            return client_1.ShopeeStatus.READY_TO_SHIP;
        case 'SHIPPED':
        case 'AWAITING_PICKUP':
        case 'IN_TRANSIT':
            return client_1.ShopeeStatus.SHIPPED;
        case 'COMPLETED':
        case 'DELIVERED':
            return client_1.ShopeeStatus.COMPLETED;
        case 'CANCELLED':
        case 'IN_CANCEL':
        case 'CANCELED':
            return client_1.ShopeeStatus.CANCELLED;
        case 'RETURNED':
        case 'RETURN':
            return client_1.ShopeeStatus.RETURNED;
        case 'UNPAID':
        case 'PENDING':
        case 'INVOICE_PENDING':
        default:
            return client_1.ShopeeStatus.UNPAID;
    }
}
async function sendAlert(code, message, order) {
    if (!ALERT_WEBHOOK_URL)
        return;
    try {
        await (0, node_fetch_1.default)(ALERT_WEBHOOK_URL, {
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
    }
    catch (e) {
        // best effort
    }
}
