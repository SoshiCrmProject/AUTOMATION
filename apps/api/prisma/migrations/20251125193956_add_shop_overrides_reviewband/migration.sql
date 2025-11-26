-- AlterTable
ALTER TABLE "AutoShippingSetting" ADD COLUMN     "reviewBandPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopRuleOverride" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "maxShippingDays" INTEGER,
    "minExpectedProfit" DOUBLE PRECISION,
    "includeAmazonPoints" BOOLEAN NOT NULL DEFAULT false,
    "includeDomesticShipping" BOOLEAN NOT NULL DEFAULT false,
    "domesticShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopRuleOverride_shopId_settingId_key" ON "ShopRuleOverride"("shopId", "settingId");

-- AddForeignKey
ALTER TABLE "ShopRuleOverride" ADD CONSTRAINT "ShopRuleOverride_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRuleOverride" ADD CONSTRAINT "ShopRuleOverride_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "AutoShippingSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
