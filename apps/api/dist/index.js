"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const bullmq_1 = require("bullmq");
const zod_1 = require("zod");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const shared_1 = require("@shopee-amazon/shared");
const secret_1 = require("./secret");
const crypto_1 = __importDefault(require("crypto"));
// Import new route modules
const inventory_1 = __importDefault(require("./routes/inventory"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const pricing_1 = __importDefault(require("./routes/pricing"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const crm_1 = __importDefault(require("./routes/crm"));
const returns_1 = __importDefault(require("./routes/returns"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Request ID for traceability
app.use((req, res, next) => {
    const id = crypto_1.default.randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
});
// Logging
morgan_1.default.token("rid", (req) => req.requestId);
app.use((0, morgan_1.default)(':method :url :status :response-time ms rid=:rid'));
app.use((0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
}));
const prisma = new client_1.PrismaClient();
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
const orderQueue = new bullmq_1.Queue("orders", { connection: redisConnection });
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const AES_KEY = process.env.AES_SECRET_KEY;
const HEALTH_TOKEN = process.env.HEALTH_TOKEN;
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
function asyncHandler(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
}
async function logAudit(userId, action, detail) {
    if (!userId)
        return;
    await prisma.auditLog.create({
        data: { userId, action, detail }
    });
}
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.replace("Bearer ", "");
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(allowed) {
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    return asyncHandler(async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return next();
    });
}
async function ensureSuperAdmin() {
    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!email || !password)
        return;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
        const hashed = await bcrypt_1.default.hash(password, 10);
        await prisma.user.create({
            data: { email, passwordHash: hashed, role: client_1.UserRole.ADMIN, isActive: true }
        });
        console.log("Superadmin bootstrapped");
    }
}
ensureSuperAdmin().catch((err) => console.error("Superadmin bootstrap failed", err));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.post("/auth/login", asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8)
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    const { email, password } = parse.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: "Invalid credentials" });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token });
}));
app.get("/shops", authMiddleware, asyncHandler(async (req, res) => {
    const shops = await prisma.shop.findMany({
        where: { ownerId: req.userId },
        orderBy: { name: "asc" }
    });
    res.json(shops);
}));
app.get("/settings", authMiddleware, asyncHandler(async (req, res) => {
    const shops = await prisma.shop.findMany({ where: { ownerId: req.userId }, include: { setting: true } });
    res.json(shops.map((s) => ({ shopId: s.id, setting: s.setting })));
}));
app.post("/settings", authMiddleware, asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        shopId: zod_1.z.string(),
        isActive: zod_1.z.boolean(),
        isDryRun: zod_1.z.boolean().default(false),
        autoFulfillmentMode: zod_1.z.nativeEnum(client_1.AutoFulfillmentMode),
        minExpectedProfit: zod_1.z.number(),
        maxShippingDays: zod_1.z.number().min(1),
        reviewBandPercent: zod_1.z.number().nullable().optional(),
        includePoints: zod_1.z.boolean(),
        includeDomesticShipping: zod_1.z.boolean(),
        defaultShippingAddressLabel: zod_1.z.string().optional(),
        currency: zod_1.z.string().default("JPY")
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const data = parsed.data;
    const shop = await prisma.shop.findFirst({ where: { id: data.shopId, ownerId: req.userId } });
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    await prisma.autoShippingSetting.upsert({
        where: { shopId: data.shopId },
        update: {
            isActive: data.isActive,
            isDryRun: data.isDryRun,
            autoFulfillmentMode: data.autoFulfillmentMode,
            minExpectedProfit: data.minExpectedProfit,
            maxShippingDays: data.maxShippingDays,
            reviewBandPercent: data.reviewBandPercent ?? null,
            includePoints: data.includePoints,
            includeDomesticShipping: data.includeDomesticShipping,
            defaultShippingAddressLabel: data.defaultShippingAddressLabel ?? null,
            currency: data.currency
        },
        create: {
            shopId: data.shopId,
            isActive: data.isActive,
            isDryRun: data.isDryRun,
            autoFulfillmentMode: data.autoFulfillmentMode,
            minExpectedProfit: data.minExpectedProfit,
            maxShippingDays: data.maxShippingDays,
            reviewBandPercent: data.reviewBandPercent ?? null,
            includePoints: data.includePoints,
            includeDomesticShipping: data.includeDomesticShipping,
            defaultShippingAddressLabel: data.defaultShippingAddressLabel ?? null,
            currency: data.currency
        }
    });
    if (data.isActive) {
        await orderQueue.add("toggle-auto-shipping", { shopId: data.shopId, active: true });
    }
    else {
        await orderQueue.add("toggle-auto-shipping", { shopId: data.shopId, active: false });
    }
    await logAudit(req.userId, "update-settings", data);
    res.json({ ok: true });
}));
app.post("/credentials/amazon", authMiddleware, asyncHandler(async (req, res) => {
    if (!AES_KEY) {
        return res.status(500).json({ error: "Missing AES secret key" });
    }
    const schema = zod_1.z.object({
        shopId: zod_1.z.string(),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(6)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const shop = await prisma.shop.findFirst({ where: { id: parsed.data.shopId, ownerId: req.userId } });
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    const { ciphertext, iv } = (0, secret_1.encryptSecret)(parsed.data.password, AES_KEY);
    await prisma.amazonCredential.upsert({
        where: { shopId: parsed.data.shopId },
        update: { username: parsed.data.email, passwordEncrypted: ciphertext, encryptionIv: iv, updatedByUserId: req.userId },
        create: {
            shopId: parsed.data.shopId,
            username: parsed.data.email,
            passwordEncrypted: ciphertext,
            encryptionIv: iv,
            updatedByUserId: req.userId
        }
    });
    await logAudit(req.userId, "update-amazon-credentials", { email: parsed.data.email });
    res.json({ ok: true });
}));
app.get("/credentials/amazon", authMiddleware, asyncHandler(async (req, res) => {
    const shopIds = await prisma.shop.findMany({ where: { ownerId: req.userId }, select: { id: true } });
    const creds = await prisma.amazonCredential.findMany({ where: { shopId: { in: shopIds.map((s) => s.id) } } });
    res.json(creds.map((c) => ({ shopId: c.shopId, email: c.username, hasPassword: Boolean(c.passwordEncrypted) })));
}));
app.post("/credentials/shopee", authMiddleware, asyncHandler(async (req, res) => {
    if (!AES_KEY)
        return res.status(500).json({ error: "Missing AES secret key" });
    const schema = zod_1.z.object({
        partnerId: zod_1.z.string(),
        partnerKey: zod_1.z.string(),
        accessToken: zod_1.z.string(),
        baseUrl: zod_1.z.string().url().optional(),
        shopId: zod_1.z.string(),
        shopName: zod_1.z.string().optional(),
        shopeeRegion: zod_1.z.string().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const { partnerId, partnerKey, accessToken, baseUrl, shopId, shopName, shopeeRegion } = parsed.data;
    const existingShop = await prisma.shop.findFirst({ where: { shopeeShopId: shopId, ownerId: req.userId } });
    const shop = existingShop
        ? await prisma.shop.update({
            where: { id: existingShop.id },
            data: {
                name: shopName ?? existingShop.name,
                shopeeRegion: shopeeRegion ?? existingShop.shopeeRegion,
                isActive: true
            }
        })
        : await prisma.shop.create({
            data: {
                ownerId: req.userId,
                shopeeShopId: shopId,
                name: shopName ?? `Shopee Shop ${shopId}`,
                shopeeRegion: shopeeRegion ?? "SG",
                isActive: true
            }
        });
    const partnerEnc = (0, secret_1.encryptSecret)(partnerKey, AES_KEY);
    const tokenEnc = (0, secret_1.encryptSecret)(accessToken, AES_KEY);
    await prisma.shopeeCredential.upsert({
        where: { shopId: shop.id },
        update: {
            partnerId,
            partnerKeyEncrypted: partnerEnc.ciphertext,
            partnerKeyIv: partnerEnc.iv,
            accessTokenEncrypted: tokenEnc.ciphertext,
            accessTokenIv: tokenEnc.iv,
            baseUrl: baseUrl ?? "https://partner.shopeemobile.com",
            updatedByUserId: req.userId
        },
        create: {
            shopId: shop.id,
            partnerId,
            partnerKeyEncrypted: partnerEnc.ciphertext,
            partnerKeyIv: partnerEnc.iv,
            accessTokenEncrypted: tokenEnc.ciphertext,
            accessTokenIv: tokenEnc.iv,
            baseUrl: baseUrl ?? "https://partner.shopeemobile.com",
            updatedByUserId: req.userId
        }
    });
    await logAudit(req.userId, "update-shopee-credentials", { partnerId, shopId: shop.id });
    res.json({ ok: true });
}));
app.get("/credentials/shopee", authMiddleware, asyncHandler(async (req, res) => {
    const shops = await prisma.shop.findMany({ where: { ownerId: req.userId } });
    res.json(shops.map((s) => ({ shopId: s.id, shopeeShopId: s.shopeeShopId, name: s.name, region: s.shopeeRegion })));
}));
app.get("/orders/errors/export", authMiddleware, asyncHandler(async (req, res) => {
    const errors = await prisma.errorItem.findMany({
        where: {
            shop: { ownerId: req.userId }
        },
        orderBy: { createdAt: "desc" }
    });
    const header = "orderId,amazonUrl,errorCode,reason,filterFailureType,profitValue,shippingDays,createdAt\n";
    const csv = header.concat(errors
        .map((e) => [
        e.shopeeOrderId ?? "",
        e.amazonProductUrl ?? "",
        e.errorCode,
        `"${e.reason.replace(/"/g, '""')}"`,
        e.filterFailureType ?? "",
        e.profitValue ?? "",
        e.shippingDays ?? "",
        `"${e.reason.replace(/"/g, '""')}"`,
        e.createdAt.toISOString()
    ].join(","))
        .join("\n"));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=error-items.csv");
    res.send(csv);
}));
app.get("/orders/processed/export", authMiddleware, asyncHandler(async (req, res) => {
    const orders = await prisma.amazonOrder.findMany({
        where: { shopeeOrder: { shop: { ownerId: req.userId } } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { shopeeOrder: true }
    });
    const header = "orderId,amazonOrderId,productUrl,purchasePrice,shippingCost,pointsUsed,status,placedAt,createdAt\n";
    const csv = header.concat(orders
        .map((o) => [
        o.shopeeOrder?.shopeeOrderSn ?? "",
        o.amazonOrderId ?? "",
        o.productUrl,
        o.purchasePrice,
        o.shippingCost ?? "",
        o.pointsUsed ?? "",
        o.status,
        o.placedAt ?? "",
        o.createdAt.toISOString()
    ].join(","))
        .join("\n"));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=processed-orders.csv");
    res.send(csv);
}));
// Product mappings via AutoShippingShopSelection
app.get("/mappings", authMiddleware, asyncHandler(async (req, res) => {
    const shops = await prisma.shop.findMany({ where: { ownerId: req.userId }, select: { id: true, name: true } });
    const selections = await prisma.autoShippingShopSelection.findMany({
        where: { shopId: { in: shops.map((s) => s.id) }, isActive: true },
        orderBy: [{ shopId: "asc" }, { shopeeItemId: "asc" }]
    });
    res.json(selections);
}));
app.post("/mappings", authMiddleware, asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        shopId: zod_1.z.string(),
        shopeeItemId: zod_1.z.string(),
        amazonProductUrl: zod_1.z.string().url(),
        notes: zod_1.z.string().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const shop = await prisma.shop.findFirst({ where: { id: parsed.data.shopId, ownerId: req.userId } });
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    const selection = await prisma.autoShippingShopSelection.upsert({
        where: { shopId_shopeeItemId: { shopId: parsed.data.shopId, shopeeItemId: parsed.data.shopeeItemId } },
        update: { amazonProductUrl: parsed.data.amazonProductUrl, notes: parsed.data.notes, isActive: true },
        create: { ...parsed.data, isActive: true }
    });
    res.json(selection);
}));
app.post("/mappings/import", authMiddleware, asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        rows: zod_1.z.array(zod_1.z.object({
            shopId: zod_1.z.string(),
            shopeeItemId: zod_1.z.string(),
            amazonProductUrl: zod_1.z.string().url(),
            notes: zod_1.z.string().optional()
        }))
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    for (const row of parsed.data.rows) {
        const shop = await prisma.shop.findFirst({ where: { id: row.shopId, ownerId: req.userId } });
        if (!shop)
            continue;
        await prisma.autoShippingShopSelection.upsert({
            where: { shopId_shopeeItemId: { shopId: row.shopId, shopeeItemId: row.shopeeItemId } },
            update: { amazonProductUrl: row.amazonProductUrl, notes: row.notes, isActive: true },
            create: { ...row, isActive: true }
        });
    }
    res.json({ ok: true });
}));
app.get("/orders/errors", authMiddleware, asyncHandler(async (req, res) => {
    const errors = await prisma.errorItem.findMany({
        where: { shop: { ownerId: req.userId } },
        orderBy: { createdAt: "desc" },
        take: 50
    });
    res.json(errors);
}));
app.post("/orders/retry/:id", authMiddleware, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await prisma.shopeeOrder.findUnique({
        where: { id },
        include: { shop: true }
    });
    if (!order || order.shop.ownerId !== req.userId) {
        return res.status(404).json({ error: "Order not found" });
    }
    await prisma.shopeeOrder.update({
        where: { id },
        data: { processingStatus: client_1.ProcessingStatus.QUEUED, processingMode: client_1.ProcessingMode.MANUAL }
    });
    await orderQueue.add("process-order", { shopeeOrderId: id, shopId: order.shopId, retrySource: "UI" });
    res.json({ ok: true });
}));
app.post("/orders/manual/:id", authMiddleware, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await prisma.shopeeOrder.findUnique({ where: { id }, include: { shop: true } });
    if (!order || order.shop.ownerId !== req.userId) {
        return res.status(404).json({ error: "Order not found" });
    }
    const manualNote = typeof req.body?.manualNote === "string" ? req.body.manualNote : null;
    const productUrl = order.rawPayload && typeof order.rawPayload === "object" && "productUrl" in order.rawPayload
        ? order.rawPayload.productUrl ?? ""
        : "";
    await prisma.shopeeOrder.update({
        where: { id },
        data: { processingStatus: client_1.ProcessingStatus.MANUAL_REVIEW, processingMode: client_1.ProcessingMode.MANUAL, lastProcessingErrorCode: null, lastProcessingErrorMessage: null }
    });
    const existing = await prisma.amazonOrder.findUnique({ where: { shopeeOrderId: id } });
    if (!existing) {
        await prisma.amazonOrder.create({
            data: {
                shopeeOrderId: id,
                amazonOrderId: null,
                status: client_1.AmazonOrderStatus.PLACED,
                productUrl,
                purchasePrice: order.orderTotal,
                shippingCost: order.shippingFee,
                pointsUsed: null,
                currency: order.currency,
                placedAt: new Date(),
                rawPayload: { manualNote }
            }
        });
    }
    else {
        const existingPayload = existing.rawPayload && typeof existing.rawPayload === "object" ? existing.rawPayload : {};
        await prisma.amazonOrder.update({
            where: { shopeeOrderId: id },
            data: {
                status: client_1.AmazonOrderStatus.PLACED,
                rawPayload: { ...existingPayload, manualNote }
            }
        });
    }
    res.json({ ok: true });
}));
app.post("/auth/signup", asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, "Weak password")
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const { email, password } = parsed.data;
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, passwordHash: hashed, role: client_1.UserRole.OPERATOR }
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "12h" });
    res.json({ token });
}));
// Profit preview endpoint for UI validation
app.post("/profit/preview", authMiddleware, asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({
        shopeeSalePrice: zod_1.z.number(),
        amazonPrice: zod_1.z.number(),
        amazonPoints: zod_1.z.number().optional(),
        domesticShipping: zod_1.z.number().optional(),
        includePoints: zod_1.z.boolean(),
        includeDomesticShipping: zod_1.z.boolean()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const result = (0, shared_1.calculateProfit)(parsed.data);
    res.json(result);
}));
// Admin: list users
app.get("/admin/users", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, isActive: true, createdAt: true }
    });
    res.json(users);
}));
// Admin: toggle user active
app.post("/admin/users/:id/toggle", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const current = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!current)
        return res.status(404).json({ error: "Not found" });
    const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: !current.isActive }
    });
    await logAudit(req.userId, "toggle-user", { target: req.params.id, to: updated.isActive });
    res.json(updated);
}));
// Admin: reset password
app.post("/admin/users/:id/reset-password", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({ password: zod_1.z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, "Weak password") });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    const hashed = await bcrypt_1.default.hash(parsed.data.password, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hashed } });
    await logAudit(req.userId, "reset-password", { target: req.params.id });
    res.json({ ok: true });
}));
// Manual poll trigger
app.post("/orders/poll-now", authMiddleware, asyncHandler(async (req, res) => {
    await orderQueue.add("poll-shopee", { userId: req.userId });
    res.json({ ok: true });
}));
// Health endpoint
app.get("/health", (_req, res) => {
    if (HEALTH_TOKEN) {
        const header = _req.headers["x-health-token"];
        if (header !== HEALTH_TOKEN)
            return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// List recent orders with decisions
app.get("/orders/recent", authMiddleware, asyncHandler(async (req, res) => {
    const orders = await prisma.shopeeOrder.findMany({
        where: { shop: { ownerId: req.userId } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { amazonOrder: true, errorItems: true }
    });
    res.json(orders);
}));
// Single order detail
app.get("/orders/:id", authMiddleware, asyncHandler(async (req, res) => {
    const order = await prisma.shopeeOrder.findUnique({
        where: { id: req.params.id },
        include: { amazonOrder: true, errorItems: true, shop: true }
    });
    if (!order || order.shop.ownerId !== req.userId)
        return res.status(404).json({ error: "Not found" });
    res.json(order);
}));
// Queue health
app.get("/ops/queue", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (_req, res) => {
    const counts = await Promise.all([
        orderQueue.getWaitingCount(),
        orderQueue.getActiveCount(),
        orderQueue.getFailedCount(),
        orderQueue.getDelayedCount()
    ]);
    res.json({ waiting: counts[0], active: counts[1], failed: counts[2], delayed: counts[3] });
}));
// Test scrape enqueue (dry-run)
app.post("/ops/amazon-test", authMiddleware, asyncHandler(async (req, res) => {
    const schema = zod_1.z.object({ productUrl: zod_1.z.string().url() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid payload" });
    await orderQueue.add("test-scrape", { userId: req.userId, productUrl: parsed.data.productUrl });
    res.json({ ok: true });
}));
// Connector/status summary
app.get("/ops/status", authMiddleware, asyncHandler(async (req, res) => {
    const lastOrder = await prisma.shopeeOrder.findFirst({
        where: { shop: { ownerId: req.userId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
    });
    const lastAmazon = await prisma.amazonOrder.findFirst({
        where: { shopeeOrder: { shop: { ownerId: req.userId } } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true }
    });
    const lastError = await prisma.errorItem.findFirst({
        where: { shop: { ownerId: req.userId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, reason: true }
    });
    res.json({
        lastOrder: lastOrder?.createdAt ?? null,
        lastAmazon: lastAmazon ?? null,
        lastError: lastError ?? null
    });
}));
// Audit log listing
app.get("/admin/audit", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { user: { select: { email: true } } }
    });
    res.json(logs);
}));
// Prometheus-style metrics (minimal)
app.get("/ops/metrics", authMiddleware, requireRole([client_1.UserRole.ADMIN]), asyncHandler(async (_req, res) => {
    const [orders, amazonOrders, errors] = await Promise.all([
        prisma.shopeeOrder.count(),
        prisma.amazonOrder.count(),
        prisma.errorItem.count()
    ]);
    const metrics = [
        `app_orders_total ${orders}`,
        `app_amazon_orders_total ${amazonOrders}`,
        `app_errors_total ${errors}`
    ].join("\n");
    res.setHeader("Content-Type", "text/plain");
    res.send(metrics);
}));
// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
});
const port = process.env.PORT || 4000;
// Mount new enterprise feature routes
app.use("/api/inventory", authMiddleware, inventory_1.default);
app.use("/api/analytics", authMiddleware, analytics_1.default);
app.use("/api/pricing", authMiddleware, pricing_1.default);
app.use("/api/notifications", authMiddleware, notifications_1.default);
app.use("/api/crm", authMiddleware, crm_1.default);
app.use("/api/returns", authMiddleware, returns_1.default);
async function bootstrap() {
    if (SUPERADMIN_EMAIL && SUPERADMIN_PASSWORD) {
        const existing = await prisma.user.findUnique({ where: { email: SUPERADMIN_EMAIL } });
        if (!existing) {
            const hashed = await bcrypt_1.default.hash(SUPERADMIN_PASSWORD, 10);
            await prisma.user.create({
                data: { email: SUPERADMIN_EMAIL, passwordHash: hashed, role: client_1.UserRole.ADMIN, isActive: true }
            });
            console.log("Superadmin created");
        }
    }
    app.listen(port, () => {
        console.log(`🚀 API listening on port ${port}`);
        console.log(`✅ Core endpoints: Authentication, Settings, Orders, Mappings, Admin`);
        console.log(`✅ Enterprise features: Inventory, Analytics, Pricing, Notifications, CRM, Returns`);
    });
}
bootstrap().catch((err) => {
    console.error("Failed to start API", err);
    process.exit(1);
});
