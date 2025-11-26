-- AlterTable
ALTER TABLE "AutoShippingSetting" ADD COLUMN IF NOT EXISTS "lastShopeePolledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopeeOrder_shopId_processingStatus_idx" ON "ShopeeOrder"("shopId", "processingStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopeeOrder_shopId_shopeeStatus_idx" ON "ShopeeOrder"("shopId", "shopeeStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopeeOrder_shopId_createdAt_idx" ON "ShopeeOrder"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopeeOrder_processingStatus_processingMode_idx" ON "ShopeeOrder"("processingStatus", "processingMode");
