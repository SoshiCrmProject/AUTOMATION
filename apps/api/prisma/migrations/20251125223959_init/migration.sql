/*
  Warnings:

  - You are about to drop the column `loginEmail` on the `AmazonCredential` table. All the data in the column will be lost.
  - You are about to drop the column `loginPasswordEncrypted` on the `AmazonCredential` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AmazonCredential` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `AmazonOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dryRun` on the `AmazonOrder` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDelivery` on the `AmazonOrder` table. All the data in the column will be lost.
  - You are about to drop the column `manualNote` on the `AmazonOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pricePaid` on the `AmazonOrder` table. All the data in the column will be lost.
  - The `status` column on the `AmazonOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `deletedAt` on the `AutoShippingSetting` table. All the data in the column will be lost.
  - You are about to drop the column `domesticShippingCost` on the `AutoShippingSetting` table. All the data in the column will be lost.
  - You are about to drop the column `includeAmazonPoints` on the `AutoShippingSetting` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AutoShippingSetting` table. All the data in the column will be lost.
  - You are about to alter the column `minExpectedProfit` on the `AutoShippingSetting` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `reviewBandPercent` on the `AutoShippingSetting` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to drop the column `isSelected` on the `AutoShippingShopSelection` table. All the data in the column will be lost.
  - You are about to drop the column `settingId` on the `AutoShippingShopSelection` table. All the data in the column will be lost.
  - You are about to drop the column `amazonPrice` on the `ErrorItem` table. All the data in the column will be lost.
  - You are about to drop the column `asin` on the `ErrorItem` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `ErrorItem` table. All the data in the column will be lost.
  - You are about to drop the column `profit` on the `ErrorItem` table. All the data in the column will be lost.
  - You are about to drop the column `shopeePrice` on the `ErrorItem` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `amazonProductUrl` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `asin` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `buyerName` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderNumber` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `productUrl` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddress` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `ShopeeOrder` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AmazonProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopRuleOverride` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopeeCredential` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopeeProduct` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shopId]` on the table `AmazonCredential` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopId]` on the table `AutoShippingSetting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopeeOrderSn]` on the table `ShopeeOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `encryptionIv` to the `AmazonCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordEncrypted` to the `AmazonCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `AmazonCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedByUserId` to the `AmazonCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `AmazonCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productUrl` to the `AmazonOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasePrice` to the `AmazonOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `AutoShippingSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amazonProductUrl` to the `AutoShippingShopSelection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopeeItemId` to the `AutoShippingShopSelection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `errorCode` to the `ErrorItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `ErrorItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Shop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopeeRegion` to the `Shop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyerAddressJson` to the `ShopeeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderTotal` to the `ShopeeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rawPayload` to the `ShopeeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopeeOrderSn` to the `ShopeeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopeeStatus` to the `ShopeeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "AutoFulfillmentMode" AS ENUM ('MANUAL_ONLY', 'AUTO_WITH_REVIEW_BAND', 'AUTO_STRICT');

-- CreateEnum
CREATE TYPE "ShopeeStatus" AS ENUM ('UNPAID', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('UNPROCESSED', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'FULFILLED', 'MANUAL_REVIEW', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingMode" AS ENUM ('AUTO', 'MANUAL', 'AUTO_DRY_RUN');

-- CreateEnum
CREATE TYPE "AmazonOrderStatus" AS ENUM ('CREATED', 'PLACED', 'SHIPPED', 'CANCELLED', 'FAILED');

-- DropForeignKey
ALTER TABLE "AmazonCredential" DROP CONSTRAINT "AmazonCredential_userId_fkey";

-- DropForeignKey
ALTER TABLE "AutoShippingSetting" DROP CONSTRAINT "AutoShippingSetting_userId_fkey";

-- DropForeignKey
ALTER TABLE "AutoShippingShopSelection" DROP CONSTRAINT "AutoShippingShopSelection_settingId_fkey";

-- DropForeignKey
ALTER TABLE "ProductMapping" DROP CONSTRAINT "ProductMapping_amazonProductId_fkey";

-- DropForeignKey
ALTER TABLE "ProductMapping" DROP CONSTRAINT "ProductMapping_shopeeProductId_fkey";

-- DropForeignKey
ALTER TABLE "Shop" DROP CONSTRAINT "Shop_userId_fkey";

-- DropForeignKey
ALTER TABLE "ShopRuleOverride" DROP CONSTRAINT "ShopRuleOverride_settingId_fkey";

-- DropForeignKey
ALTER TABLE "ShopRuleOverride" DROP CONSTRAINT "ShopRuleOverride_shopId_fkey";

-- DropForeignKey
ALTER TABLE "ShopeeCredential" DROP CONSTRAINT "ShopeeCredential_userId_fkey";

-- DropForeignKey
ALTER TABLE "ShopeeProduct" DROP CONSTRAINT "ShopeeProduct_shopId_fkey";

-- DropIndex
DROP INDEX "AmazonCredential_userId_key";

-- DropIndex
DROP INDEX "AutoShippingSetting_userId_key";

-- DropIndex
DROP INDEX "AutoShippingShopSelection_settingId_shopId_key";

-- DropIndex
DROP INDEX "Shop_userId_isActive_idx";

-- DropIndex
DROP INDEX "Shop_userId_shopeeShopId_key";

-- DropIndex
DROP INDEX "ShopeeOrder_orderNumber_key";

-- DropIndex
DROP INDEX "ShopeeOrder_shopId_status_idx";

-- AlterTable
ALTER TABLE "AmazonCredential" DROP COLUMN "loginEmail",
DROP COLUMN "loginPasswordEncrypted",
DROP COLUMN "userId",
ADD COLUMN     "encryptionIv" TEXT NOT NULL,
ADD COLUMN     "passwordEncrypted" TEXT NOT NULL,
ADD COLUMN     "shopId" TEXT NOT NULL,
ADD COLUMN     "updatedByUserId" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AmazonOrder" DROP COLUMN "deletedAt",
DROP COLUMN "dryRun",
DROP COLUMN "estimatedDelivery",
DROP COLUMN "manualNote",
DROP COLUMN "pricePaid",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'JPY',
ADD COLUMN     "placedAt" TIMESTAMP(3),
ADD COLUMN     "pointsUsed" DECIMAL(18,2),
ADD COLUMN     "productUrl" TEXT NOT NULL,
ADD COLUMN     "purchasePrice" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "rawPayload" JSONB,
ADD COLUMN     "shippingCost" DECIMAL(18,2),
DROP COLUMN "status",
ADD COLUMN     "status" "AmazonOrderStatus" NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "AutoShippingSetting" DROP COLUMN "deletedAt",
DROP COLUMN "domesticShippingCost",
DROP COLUMN "includeAmazonPoints",
DROP COLUMN "userId",
ADD COLUMN     "autoFulfillmentMode" "AutoFulfillmentMode" NOT NULL DEFAULT 'MANUAL_ONLY',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'JPY',
ADD COLUMN     "defaultShippingAddressLabel" TEXT,
ADD COLUMN     "includePoints" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shopId" TEXT NOT NULL,
ALTER COLUMN "minExpectedProfit" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "reviewBandPercent" DROP NOT NULL,
ALTER COLUMN "reviewBandPercent" DROP DEFAULT,
ALTER COLUMN "reviewBandPercent" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "AutoShippingShopSelection" DROP COLUMN "isSelected",
DROP COLUMN "settingId",
ADD COLUMN     "amazonProductUrl" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "shopeeItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ErrorItem" DROP COLUMN "amazonPrice",
DROP COLUMN "asin",
DROP COLUMN "productName",
DROP COLUMN "profit",
DROP COLUMN "shopeePrice",
ADD COLUMN     "errorCode" TEXT NOT NULL,
ADD COLUMN     "filterFailureType" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "profitValue" DECIMAL(18,2),
ADD COLUMN     "shippingDays" INTEGER,
ADD COLUMN     "shopId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "userId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "shopeeRegion" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShopeeOrder" DROP COLUMN "amazonProductUrl",
DROP COLUMN "asin",
DROP COLUMN "buyerName",
DROP COLUMN "deletedAt",
DROP COLUMN "orderNumber",
DROP COLUMN "productUrl",
DROP COLUMN "shippingAddress",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
ADD COLUMN     "buyerAddressJson" JSONB NOT NULL,
ADD COLUMN     "expectedProfit" DECIMAL(18,2),
ADD COLUMN     "expectedProfitCurrency" TEXT,
ADD COLUMN     "lastProcessingErrorCode" TEXT,
ADD COLUMN     "lastProcessingErrorMessage" TEXT,
ADD COLUMN     "orderTotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "processingMode" "ProcessingMode",
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'UNPROCESSED',
ADD COLUMN     "rawPayload" JSONB NOT NULL,
ADD COLUMN     "shippingDays" INTEGER,
ADD COLUMN     "shippingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shopeeOrderSn" TEXT NOT NULL,
ADD COLUMN     "shopeeStatus" "ShopeeStatus" NOT NULL,
ADD COLUMN     "usedIncludeDomesticShipping" BOOLEAN,
ADD COLUMN     "usedIncludePoints" BOOLEAN;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "locale",
DROP COLUMN "password",
ADD COLUMN     "passwordHash" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'OPERATOR';

-- DropTable
DROP TABLE "AmazonProduct";

-- DropTable
DROP TABLE "ProductMapping";

-- DropTable
DROP TABLE "ShopRuleOverride";

-- DropTable
DROP TABLE "ShopeeCredential";

-- DropTable
DROP TABLE "ShopeeProduct";

-- CreateIndex
CREATE UNIQUE INDEX "AmazonCredential_shopId_key" ON "AmazonCredential"("shopId");

-- CreateIndex
CREATE INDEX "AmazonOrder_status_idx" ON "AmazonOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShippingSetting_shopId_key" ON "AutoShippingSetting"("shopId");

-- CreateIndex
CREATE INDEX "AutoShippingSetting_shopId_idx" ON "AutoShippingSetting"("shopId");

-- CreateIndex
CREATE INDEX "AutoShippingShopSelection_shopId_shopeeItemId_idx" ON "AutoShippingShopSelection"("shopId", "shopeeItemId");

-- CreateIndex
CREATE INDEX "ErrorItem_shopId_idx" ON "ErrorItem"("shopId");

-- CreateIndex
CREATE INDEX "Shop_ownerId_isActive_idx" ON "Shop"("ownerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeOrder_shopeeOrderSn_key" ON "ShopeeOrder"("shopeeOrderSn");

-- CreateIndex
CREATE INDEX "ShopeeOrder_shopId_shopeeOrderSn_idx" ON "ShopeeOrder"("shopId", "shopeeOrderSn");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShippingSetting" ADD CONSTRAINT "AutoShippingSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmazonCredential" ADD CONSTRAINT "AmazonCredential_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmazonCredential" ADD CONSTRAINT "AmazonCredential_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorItem" ADD CONSTRAINT "ErrorItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
