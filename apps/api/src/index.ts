import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { PrismaClient, Prisma, UserRole, AutoFulfillmentMode, ProcessingStatus, ProcessingMode, AmazonOrderStatus, ManualOrderStatus } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Queue, QueueEvents } from "bullmq";
import type { RedisOptions } from "ioredis";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { calculateProfit } from "@shopee-amazon/shared";
import { encryptSecret } from "./secret";
import crypto from "crypto";

// Import new route modules
import inventoryRoutes from "./routes/inventory";
import analyticsRoutes from "./routes/analytics";
import pricingRoutes from "./routes/pricing";
import notificationRoutes from "./routes/notifications";
import crmRoutes from "./routes/crm";
import returnsRoutes from "./routes/returns";

dotenv.config();

const app = express();

// Trust proxy for Vercel deployment (X-Forwarded-For headers)
app.set('trust proxy', 1);

app.use(cors());
app.use(helmet());
app.use(express.json());
// Request ID for traceability
app.use((req, res, next) => {
  const id = crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

// Logging
morgan.token("rid", (req: any) => req.requestId);
app.use(morgan(':method :url :status :response-time ms rid=:rid'));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

export const prisma = new PrismaClient();

async function ensurePrimaryShop(userId: string, fallbackName?: string) {
  const existing = await prisma.shop.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" }
  });
  if (existing) {
    return existing;
  }
  const placeholderId = `manual-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
  return prisma.shop.create({
    data: {
      ownerId: userId,
      name: fallbackName ?? "Primary Automation Shop",
      shopeeShopId: placeholderId,
      shopeeRegion: "AMAZON",
      isActive: true
    }
  });
}
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const redisConnection: RedisOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === "rediss:" ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
const orderQueue = new Queue("orders", { connection: redisConnection });
const orderQueueEvents = new QueueEvents("orders", { connection: redisConnection });
orderQueueEvents.on("error", (err) => console.error("Queue events error", err));
orderQueueEvents.waitUntilReady().catch((err) => console.error("Queue events init failed", err));

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const AES_KEY = process.env.AES_SECRET_KEY;
const HEALTH_TOKEN = process.env.HEALTH_TOKEN;
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

type AuthenticatedRequest = Request & { userId?: string };
async function logAudit(userId: string | undefined, action: string, detail?: any) {
  if (!userId) return;
  await prisma.auditLog.create({
    data: { userId, action, detail }
  });
}

const amazonScrapeLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthenticatedRequest).userId ?? req.ip ?? "anon",
  handler: (_req, res) => res.status(429).json({ error: "Amazon scrape rate limit exceeded" })
});

const manualOrderInputSchema = z.object({
  shopId: z.string().optional(),
  productUrl: z.string().url(),
  asin: z.string().regex(/^[A-Z0-9]{10}$/i, "Invalid ASIN").optional(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  notes: z.string().max(500).optional(),
  buyerName: z.string().min(2).max(120),
  phone: z.string().min(5).max(20),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(120),
  state: z.string().max(120).optional(),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(60).optional(),
  shippingAddressLabel: z.string().min(2).max(80).optional(),
  purchasePrice: z.coerce.number().positive().max(1_000_000).optional(),
  shippingProfileId: z.string().optional()
});

const manualOrderListSchema = z.object({
  status: z.nativeEnum(ManualOrderStatus).optional(),
  shopId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

const manualOrderCancelSchema = z.object({
  reason: z.string().max(200).optional()
});

const shippingProfileInputSchema = z.object({
  shopId: z.string(),
  label: z.string().min(2).max(80),
  contactName: z.string().min(2).max(120),
  phone: z.string().min(5).max(20),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(120),
  state: z.string().max(120).optional(),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(60).default("JP"),
  amazonAddressLabel: z.string().min(2).max(80),
  instructions: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const extractAsinFromUrl = (input: string): string | null => {
  try {
    const asinMatch = input.match(/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
    if (asinMatch?.[1]) {
      return asinMatch[1].toUpperCase();
    }
    const url = new URL(input);
    const asin = url.searchParams.get("asin");
    return asin ? asin.toUpperCase() : null;
  } catch (_err) {
    return null;
  }
};

function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  return asyncHandler(async (req: AuthenticatedRequest, res, next) => {
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
  if (!email || !password) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, passwordHash: hashed, role: UserRole.ADMIN, isActive: true }
    });
    console.log("Superadmin bootstrapped");
  }
}
ensureSuperAdmin().catch((err) => console.error("Superadmin bootstrap failed", err));

// Root route for testing
app.get("/", (_req, res) => res.json({ 
  status: "ok", 
  message: "Shopee-Amazon Automation API",
  version: "1.0.0",
  endpoints: {
    health: "/health",
    auth: "/auth/login, /auth/signup",
    api: "/api/*"
  }
}));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/auth/login", asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
}));

app.get("/shops", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  let shops = await prisma.shop.findMany({
    where: { ownerId: req.userId },
    orderBy: { name: "asc" }
  });
  if ((!shops || shops.length === 0) && req.userId) {
    const fallback = await ensurePrimaryShop(req.userId);
    shops = [fallback];
  }
  res.json(shops);
}));

app.get("/settings", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  let shop = await prisma.shop.findFirst({ 
    where: { ownerId: req.userId, isActive: true }, 
    include: { setting: true },
    orderBy: { createdAt: 'asc' }
  });
  if (!shop && req.userId) {
    shop = await ensurePrimaryShop(req.userId);
    shop = await prisma.shop.findFirst({ where: { id: shop.id }, include: { setting: true } }) ?? shop;
  }
  if (!shop || !shop.setting) {
    return res.json({
      includeAmazonPoints: false,
      includeDomesticShipping: false,
      domesticShippingCost: 0,
      maxShippingDays: 7,
      minExpectedProfit: 0,
      shopIds: shop ? [shop.id] : [],
      isActive: false,
      isDryRun: true,
      reviewBandPercent: 0,
      defaultShippingAddressLabel: null,
      defaultShippingProfileId: null
    });
  }
  
  res.json({
    includeAmazonPoints: shop.setting.includePoints,
    includeDomesticShipping: shop.setting.includeDomesticShipping,
    domesticShippingCost: 0,
    maxShippingDays: shop.setting.maxShippingDays,
    minExpectedProfit: Number(shop.setting.minExpectedProfit),
    shopIds: [shop.id],
    isActive: shop.setting.isActive,
    isDryRun: shop.setting.isDryRun,
    reviewBandPercent: Number(shop.setting.reviewBandPercent || 0),
    defaultShippingAddressLabel: shop.setting.defaultShippingAddressLabel ?? null,
    defaultShippingProfileId: shop.setting.defaultShippingProfileId ?? null
  });
}));

app.post("/settings", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    shopId: z.string().optional(),
    isActive: z.boolean(),
    isDryRun: z.boolean().default(false),
    autoFulfillmentMode: z.nativeEnum(AutoFulfillmentMode),
    minExpectedProfit: z.number(),
    maxShippingDays: z.number().min(1),
    reviewBandPercent: z.number().nullable().optional(),
    includePoints: z.boolean(),
    includeDomesticShipping: z.boolean(),
    defaultShippingAddressLabel: z.string().optional(),
    defaultShippingProfileId: z.string().nullable().optional(),
    currency: z.string().default("JPY")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const data = parsed.data;
  let shop;
  if (data.shopId) {
    shop = await prisma.shop.findFirst({ where: { id: data.shopId, ownerId: req.userId } });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
  } else if (req.userId) {
    shop = await ensurePrimaryShop(req.userId);
  }
  if (!shop) return res.status(404).json({ error: "Unable to resolve shop" });
  const targetShopId = shop.id;

  const existingSetting = await prisma.autoShippingSetting.findUnique({ where: { shopId: targetShopId } });
  const profileFieldProvided = Object.prototype.hasOwnProperty.call(data, "defaultShippingProfileId");
  const labelFieldProvided = Object.prototype.hasOwnProperty.call(data, "defaultShippingAddressLabel");
  let desiredProfileId = profileFieldProvided
    ? data.defaultShippingProfileId ?? null
    : existingSetting?.defaultShippingProfileId ?? null;
  let targetShippingProfile: { id: string; amazonAddressLabel: string } | null = null;

  if (desiredProfileId) {
    const profile = await prisma.shippingProfile.findFirst({
      where: { id: desiredProfileId, shopId: targetShopId, shop: { ownerId: req.userId } }
    });
    if (!profile) {
      return res.status(404).json({ error: "Shipping profile not found for this shop" });
    }
    targetShippingProfile = { id: profile.id, amazonAddressLabel: profile.amazonAddressLabel };
    await prisma.shippingProfile.updateMany({
      where: { shopId: targetShopId, NOT: { id: profile.id } },
      data: { isDefault: false }
    });
    await prisma.shippingProfile.update({
      where: { id: profile.id },
      data: { isDefault: true }
    });
  } else if (profileFieldProvided) {
    await prisma.shippingProfile.updateMany({
      where: { shopId: targetShopId },
      data: { isDefault: false }
    });
  }

  const sanitizedManualLabel = data.defaultShippingAddressLabel?.trim();
  const defaultShippingAddressLabel =
    targetShippingProfile?.amazonAddressLabel ??
    (labelFieldProvided ? sanitizedManualLabel || null : (existingSetting?.defaultShippingAddressLabel ?? null));
  const defaultShippingProfileId =
    targetShippingProfile?.id ??
    (profileFieldProvided ? null : (existingSetting?.defaultShippingProfileId ?? null));

  await prisma.autoShippingSetting.upsert({
    where: { shopId: targetShopId },
    update: {
      isActive: data.isActive,
      isDryRun: data.isDryRun,
      autoFulfillmentMode: data.autoFulfillmentMode,
      minExpectedProfit: data.minExpectedProfit,
      maxShippingDays: data.maxShippingDays,
      reviewBandPercent: data.reviewBandPercent ?? null,
      includePoints: data.includePoints,
      includeDomesticShipping: data.includeDomesticShipping,
      defaultShippingAddressLabel,
      defaultShippingProfileId,
      currency: data.currency
    },
    create: {
      shopId: targetShopId,
      isActive: data.isActive,
      isDryRun: data.isDryRun,
      autoFulfillmentMode: data.autoFulfillmentMode,
      minExpectedProfit: data.minExpectedProfit,
      maxShippingDays: data.maxShippingDays,
      reviewBandPercent: data.reviewBandPercent ?? null,
      includePoints: data.includePoints,
      includeDomesticShipping: data.includeDomesticShipping,
      defaultShippingAddressLabel,
      defaultShippingProfileId,
      currency: data.currency
    }
  });

  if (data.isActive) {
    await orderQueue.add("toggle-auto-shipping", { shopId: targetShopId, active: true });
  } else {
    await orderQueue.add("toggle-auto-shipping", { shopId: targetShopId, active: false });
  }

  await logAudit(req.userId, "update-settings", { ...data, shopId: targetShopId });
  res.json({ ok: true, shopId: targetShopId });
}));

app.post("/credentials/amazon", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!AES_KEY) {
    return res.status(500).json({ error: "Missing AES secret key" });
  }
  const schema = z.object({
    shopId: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  let targetShopId = parsed.data.shopId;
  let shop = targetShopId
    ? await prisma.shop.findFirst({ where: { id: targetShopId, ownerId: req.userId } })
    : null;
  if (!shop && req.userId) {
    shop = await ensurePrimaryShop(req.userId);
    targetShopId = shop.id;
  }
  if (!shop || !targetShopId) return res.status(404).json({ error: "Shop not found" });

  const { ciphertext, iv } = encryptSecret(parsed.data.password, AES_KEY);
  await prisma.amazonCredential.upsert({
    where: { shopId: targetShopId },
    update: { username: parsed.data.email, passwordEncrypted: ciphertext, encryptionIv: iv, updatedByUserId: req.userId! },
    create: {
      shopId: targetShopId,
      username: parsed.data.email,
      passwordEncrypted: ciphertext,
      encryptionIv: iv,
      updatedByUserId: req.userId!
    }
  });
  await logAudit(req.userId, "update-amazon-credentials", { email: parsed.data.email, shopId: targetShopId });
  res.json({ ok: true, shopId: targetShopId });
}));

app.get("/credentials/amazon", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  let shops = await prisma.shop.findMany({ where: { ownerId: req.userId }, select: { id: true, name: true } });
  if ((!shops || shops.length === 0) && req.userId) {
    const fallback = await ensurePrimaryShop(req.userId);
    shops = [{ id: fallback.id, name: fallback.name ?? "Primary Automation Shop" }];
  }
  if (!shops || shops.length === 0) return res.json([]);
  const creds = await prisma.amazonCredential.findMany({ where: { shopId: { in: shops.map((s) => s.id) } } });
  const payload = shops.map((shop) => {
    const cred = creds.find((c) => c.shopId === shop.id);
    return {
      shopId: shop.id,
      shopName: shop.name ?? shop.id,
      email: cred?.username ?? "",
      hasPassword: Boolean(cred?.passwordEncrypted)
    };
  });
  res.json(payload);
}));

app.post("/credentials/shopee", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!AES_KEY) return res.status(500).json({ error: "Missing AES secret key" });
  const schema = z.object({
    partnerId: z.string(),
    partnerKey: z.string(),
    accessToken: z.string(),
    baseUrl: z.string().url().optional(),
    shopId: z.string(),
    shopName: z.string().optional(),
    shopeeRegion: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
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
          ownerId: req.userId!,
          shopeeShopId: shopId,
          name: shopName ?? `Shopee Shop ${shopId}`,
          shopeeRegion: shopeeRegion ?? "SG",
          isActive: true
        }
      });

  const partnerEnc = encryptSecret(partnerKey, AES_KEY);
  const tokenEnc = encryptSecret(accessToken, AES_KEY);
  await prisma.shopeeCredential.upsert({
    where: { shopId: shop.id },
    update: {
      partnerId,
      partnerKeyEncrypted: partnerEnc.ciphertext,
      partnerKeyIv: partnerEnc.iv,
      accessTokenEncrypted: tokenEnc.ciphertext,
      accessTokenIv: tokenEnc.iv,
      baseUrl: baseUrl ?? "https://partner.shopeemobile.com",
      updatedByUserId: req.userId!
    },
    create: {
      shopId: shop.id,
      partnerId,
      partnerKeyEncrypted: partnerEnc.ciphertext,
      partnerKeyIv: partnerEnc.iv,
      accessTokenEncrypted: tokenEnc.ciphertext,
      accessTokenIv: tokenEnc.iv,
      baseUrl: baseUrl ?? "https://partner.shopeemobile.com",
      updatedByUserId: req.userId!
    }
  });

  await logAudit(req.userId, "update-shopee-credentials", { partnerId, shopId: shop.id });
  res.json({ ok: true });
}));

app.get("/credentials/shopee", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shops = await prisma.shop.findMany({ where: { ownerId: req.userId } });
  res.json(shops.map((s) => ({ shopId: s.id, shopeeShopId: s.shopeeShopId, name: s.name, region: s.shopeeRegion })));
}));

app.get("/orders/errors/export", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = await prisma.errorItem.findMany({
    where: {
      shop: { ownerId: req.userId }
    },
    orderBy: { createdAt: "desc" }
  });
  const header =
    "orderId,amazonUrl,errorCode,reason,filterFailureType,profitValue,shippingDays,createdAt\n";
  const csv = header.concat(
    errors
      .map((e) =>
        [
          e.shopeeOrderId ?? "",
          e.amazonProductUrl ?? "",
          e.errorCode,
          `"${e.reason.replace(/"/g, '""')}"`,
          e.filterFailureType ?? "",
          e.profitValue ?? "",
          e.shippingDays ?? "",
          `"${e.reason.replace(/"/g, '""')}"`,
          e.createdAt.toISOString()
        ].join(",")
      )
      .join("\n")
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=error-items.csv");
  res.send(csv);
}));

app.get("/orders/processed/export", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const orders = await prisma.amazonOrder.findMany({
    where: { shopeeOrder: { shop: { ownerId: req.userId } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { shopeeOrder: true }
  });
  const header =
    "orderId,amazonOrderId,productUrl,purchasePrice,shippingCost,pointsUsed,status,placedAt,createdAt\n";
  const csv = header.concat(
    orders
      .map((o) =>
        [
          o.shopeeOrder?.shopeeOrderSn ?? "",
          o.amazonOrderId ?? "",
          o.productUrl,
          o.purchasePrice,
          o.shippingCost ?? "",
          o.pointsUsed ?? "",
          o.status,
          o.placedAt ?? "",
          o.createdAt.toISOString()
        ].join(",")
      )
      .join("\n")
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=processed-orders.csv");
  res.send(csv);
}));

// Product mappings via AutoShippingShopSelection
app.get("/mappings", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shops = await prisma.shop.findMany({ where: { ownerId: req.userId }, select: { id: true, name: true } });
  const selections = await prisma.autoShippingShopSelection.findMany({
    where: { shopId: { in: shops.map((s) => s.id) }, isActive: true },
    orderBy: [{ shopId: "asc" }, { shopeeItemId: "asc" }]
  });
  res.json(selections);
}));

app.post("/mappings", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    shopId: z.string(),
    shopeeItemId: z.string(),
    amazonProductUrl: z.string().url(),
    notes: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const shop = await prisma.shop.findFirst({ where: { id: parsed.data.shopId, ownerId: req.userId } });
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  const selection = await prisma.autoShippingShopSelection.upsert({
    where: { shopId_shopeeItemId: { shopId: parsed.data.shopId, shopeeItemId: parsed.data.shopeeItemId } },
    update: { amazonProductUrl: parsed.data.amazonProductUrl, notes: parsed.data.notes, isActive: true },
    create: { ...parsed.data, isActive: true }
  });
  res.json(selection);
}));

app.post("/mappings/import", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    rows: z.array(
      z.object({
        shopId: z.string(),
        shopeeItemId: z.string(),
        amazonProductUrl: z.string().url(),
        notes: z.string().optional()
      })
    )
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  for (const row of parsed.data.rows) {
    const shop = await prisma.shop.findFirst({ where: { id: row.shopId, ownerId: req.userId } });
    if (!shop) continue;
    await prisma.autoShippingShopSelection.upsert({
      where: { shopId_shopeeItemId: { shopId: row.shopId, shopeeItemId: row.shopeeItemId } },
      update: { amazonProductUrl: row.amazonProductUrl, notes: row.notes, isActive: true },
      create: { ...row, isActive: true }
    });
  }
  res.json({ ok: true });
}));

// Shipping profile management
app.get("/shipping-profiles", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shops = await prisma.shop.findMany({ where: { ownerId: req.userId }, select: { id: true } });
  if (!shops || shops.length === 0) return res.json([]);
  const profiles = await prisma.shippingProfile.findMany({ where: { shopId: { in: shops.map((s) => s.id) }, isActive: true }, orderBy: { label: "asc" } });
  res.json(profiles);
}));

app.post("/shipping-profiles", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = shippingProfileInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const data = parsed.data;
  const shop = await prisma.shop.findFirst({ where: { id: data.shopId, ownerId: req.userId } });
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  const created = await prisma.shippingProfile.create({
    data: {
      shopId: shop.id,
      label: data.label,
      contactName: data.contactName,
      phone: data.phone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      city: data.city,
      state: data.state ?? null,
      postalCode: data.postalCode,
      country: data.country ?? "JP",
      instructions: data.instructions ?? null,
      amazonAddressLabel: data.amazonAddressLabel,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true
    }
  });

  if (data.isDefault) {
    await prisma.shippingProfile.updateMany({ where: { shopId: shop.id, NOT: { id: created.id } }, data: { isDefault: false } });
    await prisma.autoShippingSetting.updateMany({ where: { shopId: shop.id }, data: { defaultShippingProfileId: created.id, defaultShippingAddressLabel: created.amazonAddressLabel } });
  }

  res.status(201).json(created);
}));

app.put("/shipping-profiles/:id", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = shippingProfileInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const profile = await prisma.shippingProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const shop = await prisma.shop.findFirst({ where: { id: profile.shopId, ownerId: req.userId } });
  if (!shop) return res.status(404).json({ error: "Shop not found or not owned" });
  const data = parsed.data;
  const updated = await prisma.shippingProfile.update({ where: { id: profile.id }, data: {
    label: data.label,
    contactName: data.contactName,
    phone: data.phone,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 ?? null,
    city: data.city,
    state: data.state ?? null,
    postalCode: data.postalCode,
    country: data.country ?? "JP",
    instructions: data.instructions ?? null,
    amazonAddressLabel: data.amazonAddressLabel,
    isDefault: data.isDefault ?? false,
    isActive: data.isActive ?? true
  } });

  if (data.isDefault) {
    await prisma.shippingProfile.updateMany({ where: { shopId: profile.shopId, NOT: { id: profile.id } }, data: { isDefault: false } });
    await prisma.autoShippingSetting.updateMany({ where: { shopId: profile.shopId }, data: { defaultShippingProfileId: profile.id, defaultShippingAddressLabel: data.amazonAddressLabel } });
  }

  res.json(updated);
}));

app.delete("/shipping-profiles/:id", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const profile = await prisma.shippingProfile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const shop = await prisma.shop.findFirst({ where: { id: profile.shopId, ownerId: req.userId } });
  if (!shop) return res.status(404).json({ error: "Shop not found or not owned" });
  await prisma.shippingProfile.delete({ where: { id: profile.id } });
  await prisma.autoShippingSetting.updateMany({ where: { shopId: profile.shopId, defaultShippingProfileId: profile.id }, data: { defaultShippingProfileId: null } });
  res.json({ ok: true });
}));

app.get("/orders/errors", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = await prisma.errorItem.findMany({
    where: { shop: { ownerId: req.userId } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json(errors);
}));

app.post("/orders/retry/:id", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
    data: { processingStatus: ProcessingStatus.QUEUED, processingMode: ProcessingMode.MANUAL }
  });
  await orderQueue.add("process-order", { shopeeOrderId: id, shopId: order.shopId, retrySource: "UI" });
  res.json({ ok: true });
}));

app.post("/orders/manual/:id", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const order = await prisma.shopeeOrder.findUnique({ where: { id }, include: { shop: true } });
  if (!order || order.shop.ownerId !== req.userId) {
    return res.status(404).json({ error: "Order not found" });
  }
  const manualNote = typeof req.body?.manualNote === "string" ? req.body.manualNote : null;
  const productUrl =
    order.rawPayload && typeof order.rawPayload === "object" && "productUrl" in (order.rawPayload as any)
      ? (order.rawPayload as any).productUrl ?? ""
      : "";
  await prisma.shopeeOrder.update({
    where: { id },
    data: { processingStatus: ProcessingStatus.MANUAL_REVIEW, processingMode: ProcessingMode.MANUAL, lastProcessingErrorCode: null, lastProcessingErrorMessage: null }
  });
  const existing = await prisma.amazonOrder.findUnique({ where: { shopeeOrderId: id } });
  if (!existing) {
    await prisma.amazonOrder.create({
      data: {
        shopeeOrderId: id,
        amazonOrderId: null,
        status: AmazonOrderStatus.PLACED,
        productUrl,
        purchasePrice: order.orderTotal,
        shippingCost: order.shippingFee,
        pointsUsed: null,
        currency: order.currency,
        placedAt: new Date(),
        rawPayload: { manualNote }
      }
    });
  } else {
    const existingPayload = existing.rawPayload && typeof existing.rawPayload === "object" ? (existing.rawPayload as any) : {};
    await prisma.amazonOrder.update({
      where: { shopeeOrderId: id },
      data: {
        status: AmazonOrderStatus.PLACED,
        rawPayload: { ...existingPayload, manualNote }
      }
    });
  }
  res.json({ ok: true });
}));

app.get("/manual-orders", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const query = manualOrderListSchema.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid filters" });
  }
  const take = query.data.limit ?? 25;
  const where: Prisma.ManualAmazonOrderWhereInput = {
    ownerId: req.userId!,
    ...(query.data.status ? { status: query.data.status } : {}),
    ...(query.data.shopId ? { shopId: query.data.shopId } : {})
  };
  const orders = await prisma.manualAmazonOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { id: true, name: true } } },
    take: take + 1,
    cursor: query.data.cursor ? { id: query.data.cursor } : undefined,
    skip: query.data.cursor ? 1 : undefined
  });
  const hasNext = orders.length > take;
  const items = hasNext ? orders.slice(0, take) : orders;
  const nextCursor = hasNext ? orders[orders.length - 1].id : null;
  res.json({ orders: items, nextCursor });
}));

app.post("/manual-orders", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = manualOrderInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  let targetShopId = parsed.data.shopId;
  let shop = targetShopId
    ? await prisma.shop.findFirst({ where: { id: targetShopId, ownerId: req.userId } })
    : null;
  if (!shop && req.userId) {
    shop = await ensurePrimaryShop(req.userId!, "Manual Amazon Orders");
    targetShopId = shop.id;
  }
  if (!shop || !targetShopId) {
    return res.status(404).json({ error: "Shop not found" });
  }
  const asin = parsed.data.asin?.toUpperCase() ?? extractAsinFromUrl(parsed.data.productUrl);
  const purchasePriceDecimal = parsed.data.purchasePrice !== undefined
    ? new Prisma.Decimal(parsed.data.purchasePrice.toString())
    : null;
  const created = await prisma.manualAmazonOrder.create({
    data: {
      shopId: targetShopId,
      ownerId: req.userId!,
      productUrl: parsed.data.productUrl,
      asin,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes?.trim() || undefined,
      buyerName: parsed.data.buyerName,
      phone: parsed.data.phone,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2?.trim() || undefined,
      city: parsed.data.city,
      state: parsed.data.state?.trim() || undefined,
      postalCode: parsed.data.postalCode,
      country: (parsed.data.country ?? "JP").toUpperCase(),
      shippingAddressLabel: parsed.data.shippingAddressLabel?.trim() || parsed.data.buyerName,
      shippingProfileId: parsed.data.shippingProfileId || undefined,
      purchasePrice: purchasePriceDecimal
    },
    include: { shop: { select: { id: true, name: true } } }
  });
  await logAudit(req.userId, "manual-order-create", { manualOrderId: created.id, shopId: targetShopId, asin });
  await orderQueue.add("process-manual-order", { manualOrderId: created.id, shopId: targetShopId }, {
    removeOnComplete: 500,
    removeOnFail: 500
  });
  res.status(201).json(created);
}));

app.post("/manual-orders/:id/cancel", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = manualOrderCancelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const order = await prisma.manualAmazonOrder.findUnique({
    where: { id: req.params.id },
    include: { shop: { select: { id: true, name: true } } }
  });
  if (!order || order.ownerId !== req.userId) {
    return res.status(404).json({ error: "Manual order not found" });
  }
  if (![ManualOrderStatus.PENDING, ManualOrderStatus.PROCESSING].includes(order.status)) {
    return res.status(400).json({ error: "Order can no longer be cancelled" });
  }
  const reason = parsed.data.reason?.trim() || "Cancelled by user";
  const updated = await prisma.manualAmazonOrder.update({
    where: { id: order.id },
    data: {
      status: ManualOrderStatus.CANCELLED,
      failureCode: "USER_CANCELLED",
      failureReason: reason
    },
    include: { shop: { select: { id: true, name: true } } }
  });
  await logAudit(req.userId, "manual-order-cancel", { manualOrderId: order.id });
  res.json(updated);
}));

app.post("/auth/signup", asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, "Weak password")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parsed.data;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash: hashed, role: UserRole.OPERATOR }
  });
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
}));

// Profit preview endpoint for UI validation
app.post("/profit/preview", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    shopeeOrderTotal: z.number().optional(),
    shopeeShippingFee: z.number().optional(),
    shopeeFees: z.number().optional(),
    amazonProductPrice: z.number().optional(),
    amazonShippingCost: z.number().optional(),
    amazonTax: z.number().optional(),
    amazonPoints: z.number().optional(),
    includeDomesticShipping: z.boolean().optional(),
    domesticShippingCost: z.number().optional(),
    // Legacy field names for backward compatibility
    shopeeSalePrice: z.number().optional(),
    amazonPrice: z.number().optional(),
    domesticShipping: z.number().optional(),
    includePoints: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });
  
  const data = parsed.data;
  
  // Support both new and legacy field names
  const shopeeTotal = (data.shopeeOrderTotal || data.shopeeSalePrice || 0) + (data.shopeeShippingFee || 0);
  const amazonTotal = (data.amazonProductPrice || data.amazonPrice || 0) + 
                      (data.amazonShippingCost || 0) + 
                      (data.amazonTax || 0);
  const fees = data.shopeeFees || 0;
  const includePoints = data.includePoints !== undefined ? data.includePoints : true;
  const includeDomestic = data.includeDomesticShipping !== undefined ? data.includeDomesticShipping : false;
  const domesticShipping = data.domesticShippingCost || data.domesticShipping || 0;
  const points = (data.amazonPoints || 0);
  
  // Calculate profit
  const shippingCost = includeDomestic ? domesticShipping : 0;
  const pointsValue = includePoints ? points : 0;
  const profit = shopeeTotal - amazonTotal - fees - shippingCost + pointsValue;
  const profitMargin = shopeeTotal > 0 ? (profit / shopeeTotal) * 100 : 0;
  
  // Determine if viable (positive profit)
  const isViable = profit > 0;
  
  res.json({
    profit,
    profitMargin,
    shopeeTotal,
    amazonTotal,
    fees,
    shipping: shippingCost,
    isViable,
    breakdown: {
      revenue: shopeeTotal,
      costs: amazonTotal,
      fees,
      domesticShipping: shippingCost,
      points: pointsValue
    }
  });
}));

// Admin: list users
app.get("/admin/users", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isActive: true, createdAt: true }
  });
  res.json(users);
}));

// Admin: toggle user active
app.post("/admin/users/:id/toggle", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const current = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !current.isActive }
  });
  await logAudit(req.userId, "toggle-user", { target: req.params.id, to: updated.isActive });
  res.json(updated);
}));

// Admin: reset password
app.post("/admin/users/:id/reset-password", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({ password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, "Weak password") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hashed } });
  await logAudit(req.userId, "reset-password", { target: req.params.id });
  res.json({ ok: true });
}));

// Manual poll trigger
app.post("/orders/poll-now", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await orderQueue.add("poll-shopee", { userId: req.userId });
  res.json({ ok: true });
}));

// Health endpoint
app.get("/health", (_req, res) => {
  if (HEALTH_TOKEN) {
    const header = _req.headers["x-health-token"];
    if (header !== HEALTH_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// List recent orders with decisions
app.get("/orders/recent", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const orders = await prisma.shopeeOrder.findMany({
    where: { shop: { ownerId: req.userId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { amazonOrder: true, errorItems: true }
  });
  res.json(orders);
}));

// Single order detail
app.get("/orders/:id", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order = await prisma.shopeeOrder.findUnique({
    where: { id: req.params.id },
    include: { amazonOrder: true, errorItems: true, shop: true }
  });
  if (!order || order.shop.ownerId !== req.userId) return res.status(404).json({ error: "Not found" });
  res.json(order);
}));

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
      error: { code: string; message: string; screenshotPath?: string | null };
    };

const amazonScrapeSchema = z.object({ productUrl: z.string().url() });

async function handleAmazonScrape(req: AuthenticatedRequest, res: Response) {
  const parsed = amazonScrapeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const productUrl = parsed.data.productUrl.trim();
  if (!/amazon\./i.test(productUrl)) {
    return res.status(400).json({ error: "URL must be an Amazon listing" });
  }

  const job = await orderQueue.add(
    "scrape-preview",
    { productUrl },
    { removeOnComplete: true, removeOnFail: true }
  );
  const startedAt = Date.now();
  try {
    const payload = (await job.waitUntilFinished(orderQueueEvents, 120_000)) as ScrapePreviewJobResult | undefined;
    if (!payload) {
      return res.status(502).json({ error: "Scrape returned no data" });
    }
    if (payload.ok) {
      await logAudit(req.userId, "amazon-scrape", { productUrl, asin: payload.result.asin });
      return res.json({
        status: "ok",
        result: payload.result,
        durationMs: Date.now() - startedAt,
        message: "Live Amazon data captured"
      });
    }
    return res.status(422).json({
      error: payload.error.message,
      code: payload.error.code,
      screenshot: payload.error.screenshotPath ?? null
    });
  } catch (err: any) {
    if (err?.message?.includes("timed out")) {
      return res.status(504).json({ error: "Amazon scrape timed out" });
    }
    console.error("Amazon scrape failed", err);
    return res.status(502).json({ error: "Unable to scrape Amazon product" });
  }
}

// Queue health
app.get("/ops/queue", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const counts = await Promise.all([
    orderQueue.getWaitingCount(),
    orderQueue.getActiveCount(),
    orderQueue.getFailedCount(),
    orderQueue.getDelayedCount()
  ]);
  res.json({ waiting: counts[0], active: counts[1], failed: counts[2], delayed: counts[3] });
}));

app.post("/ops/amazon-scrape", authMiddleware, amazonScrapeLimiter, asyncHandler(handleAmazonScrape));
app.post("/ops/amazon-test", authMiddleware, amazonScrapeLimiter, asyncHandler(handleAmazonScrape));

// Connector/status summary
app.get("/ops/status", authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
app.get("/admin/audit", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } } }
  });
  res.json(logs);
}));

// Prometheus-style metrics (minimal)
app.get("/ops/metrics", authMiddleware, requireRole([UserRole.ADMIN]), asyncHandler(async (_req: AuthenticatedRequest, res) => {
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

// Mount new enterprise feature routes
app.use("/api/inventory", authMiddleware, inventoryRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/pricing", authMiddleware, pricingRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/crm", authMiddleware, crmRoutes);
app.use("/api/returns", authMiddleware, returnsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 API listening on port ${port}`);
    console.log(`✅ Core endpoints: Authentication, Settings, Orders, Mappings, Admin`);
    console.log(`✅ Enterprise features: Inventory, Analytics, Pricing, Notifications, CRM, Returns`);
  });
}

// Export for Vercel serverless
export default app;
