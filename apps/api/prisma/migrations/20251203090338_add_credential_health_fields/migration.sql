/*
  Warnings:

  - A unique constraint covering the columns `[shopId,shopeeItemId]` on the table `AutoShippingShopSelection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "PriceRuleType" AS ENUM ('FIXED_MARGIN', 'PERCENTAGE_MARKUP', 'COMPETITOR_MATCH', 'DYNAMIC_REPRICING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'SLACK', 'DISCORD', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('AMAZON_LOGISTICS', 'JAPAN_POST', 'YAMATO', 'SAGAWA', 'DHL', 'FEDEX', 'UPS');

-- CreateEnum
CREATE TYPE "MarketplaceType" AS ENUM ('SHOPEE', 'LAZADA', 'EBAY', 'ETSY', 'RAKUTEN', 'MERCARI');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';
ALTER TYPE "UserRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "AmazonCredential" ADD COLUMN     "lastValidatedAt" TIMESTAMP(3),
ADD COLUMN     "lastValidationError" TEXT,
ADD COLUMN     "lastValidationStatus" TEXT DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "ShopeeCredential" ADD COLUMN     "lastValidatedAt" TIMESTAMP(3),
ADD COLUMN     "lastValidationError" TEXT,
ADD COLUMN     "lastValidationStatus" TEXT DEFAULT 'unknown';

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopeeItemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "status" "InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "lastSyncAt" TIMESTAMP(3),
    "costPrice" DECIMAL(18,2),
    "sellingPrice" DECIMAL(18,2),
    "supplier" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "performedBy" TEXT,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "PriceRuleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minMarginPercent" DECIMAL(5,2),
    "maxMarginPercent" DECIMAL(5,2),
    "fixedMarkupAmount" DECIMAL(18,2),
    "competitorUrls" TEXT[],
    "priceFloor" DECIMAL(18,2),
    "priceCeiling" DECIMAL(18,2),
    "applyToCategories" TEXT[],
    "excludeProducts" TEXT[],
    "scheduleStartTime" TIMESTAMP(3),
    "scheduleEndTime" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPrice" DECIMAL(18,2) NOT NULL,
    "newPrice" DECIMAL(18,2) NOT NULL,
    "changePercent" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "appliedRuleId" TEXT,
    "competitorPrice" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "retryAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "channelTypes" "NotificationType"[],
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentNotification" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "shopeeOrderId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "customerMessage" TEXT,
    "internalNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(18,2),
    "restockQty" INTEGER,
    "rmaNumber" TEXT,
    "attachments" TEXT[],
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "MarketplaceType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiKeyIv" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopeeItemId" TEXT NOT NULL,
    "amazonAsin" TEXT,
    "amazonUrl" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "performanceScore" DECIMAL(5,2),
    "avgShippingDays" INTEGER,
    "avgProfit" DECIMAL(18,2),
    "successRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "carrier" "ShippingCarrier" NOT NULL,
    "fromPostalCode" TEXT NOT NULL,
    "toPostalCode" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "lengthCm" INTEGER,
    "widthCm" INTEGER,
    "heightCm" INTEGER,
    "rate" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "estimatedDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopeeUserId" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "avgOrderValue" DECIMAL(18,2),
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "tags" TEXT[],
    "notes" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "sentiment" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "successfulOrders" INTEGER NOT NULL DEFAULT 0,
    "failedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "avgProfit" DECIMAL(18,2),
    "totalShippingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "avgShippingDays" DECIMAL(5,2),
    "errorRate" DECIMAL(5,2),
    "conversionRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowStockAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LowStockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecommendation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudDetection" (
    "id" TEXT NOT NULL,
    "shopeeOrderId" TEXT NOT NULL,
    "riskScore" DECIMAL(5,2) NOT NULL,
    "riskFactors" TEXT[],
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductInventory_status_idx" ON "ProductInventory"("status");

-- CreateIndex
CREATE INDEX "ProductInventory_currentStock_idx" ON "ProductInventory"("currentStock");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_shopId_shopeeItemId_key" ON "ProductInventory"("shopId", "shopeeItemId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingRule_shopId_isActive_idx" ON "PricingRule"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_createdAt_idx" ON "PriceHistory"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationChannel_shopId_type_idx" ON "NotificationChannel"("shopId", "type");

-- CreateIndex
CREATE INDEX "NotificationRule_shopId_isActive_idx" ON "NotificationRule"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "SentNotification_channelId_sentAt_idx" ON "SentNotification"("channelId", "sentAt");

-- CreateIndex
CREATE INDEX "SentNotification_trigger_sentAt_idx" ON "SentNotification"("trigger", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_rmaNumber_key" ON "ReturnRequest"("rmaNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE INDEX "ReturnRequest_shopeeOrderId_idx" ON "ReturnRequest"("shopeeOrderId");

-- CreateIndex
CREATE INDEX "Marketplace_type_isActive_idx" ON "Marketplace"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_shopId_type_accountId_key" ON "Marketplace"("shopId", "type", "accountId");

-- CreateIndex
CREATE INDEX "ProductMapping_shopeeItemId_idx" ON "ProductMapping"("shopeeItemId");

-- CreateIndex
CREATE INDEX "ProductMapping_performanceScore_idx" ON "ProductMapping"("performanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_productId_amazonUrl_key" ON "ProductMapping"("productId", "amazonUrl");

-- CreateIndex
CREATE INDEX "ShippingRate_carrier_fromPostalCode_toPostalCode_idx" ON "ShippingRate"("carrier", "fromPostalCode", "toPostalCode");

-- CreateIndex
CREATE INDEX "ShippingRate_isActive_idx" ON "ShippingRate"("isActive");

-- CreateIndex
CREATE INDEX "Customer_tier_idx" ON "Customer"("tier");

-- CreateIndex
CREATE INDEX "Customer_totalSpent_idx" ON "Customer"("totalSpent");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopId_shopeeUserId_key" ON "Customer"("shopId", "shopeeUserId");

-- CreateIndex
CREATE INDEX "CustomerInteraction_customerId_createdAt_idx" ON "CustomerInteraction"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_shopId_date_key" ON "DailyMetrics"("shopId", "date");

-- CreateIndex
CREATE INDEX "LowStockAlert_productId_resolvedAt_idx" ON "LowStockAlert"("productId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ProductRecommendation_shopId_confidence_idx" ON "ProductRecommendation"("shopId", "confidence");

-- CreateIndex
CREATE INDEX "FraudDetection_riskScore_idx" ON "FraudDetection"("riskScore");

-- CreateIndex
CREATE INDEX "FraudDetection_isBlocked_idx" ON "FraudDetection"("isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShippingShopSelection_shopId_shopeeItemId_key" ON "AutoShippingShopSelection"("shopId", "shopeeItemId");

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationChannel" ADD CONSTRAINT "NotificationChannel_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentNotification" ADD CONSTRAINT "SentNotification_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_shopeeOrderId_fkey" FOREIGN KEY ("shopeeOrderId") REFERENCES "ShopeeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marketplace" ADD CONSTRAINT "Marketplace_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecommendation" ADD CONSTRAINT "ProductRecommendation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudDetection" ADD CONSTRAINT "FraudDetection_shopeeOrderId_fkey" FOREIGN KEY ("shopeeOrderId") REFERENCES "ShopeeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
