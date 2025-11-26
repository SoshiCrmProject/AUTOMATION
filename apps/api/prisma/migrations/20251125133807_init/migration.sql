-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopeeShopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoShippingSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includeAmazonPoints" BOOLEAN NOT NULL DEFAULT false,
    "includeDomesticShipping" BOOLEAN NOT NULL DEFAULT false,
    "domesticShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxShippingDays" INTEGER NOT NULL,
    "minExpectedProfit" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AutoShippingSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoShippingShopSelection" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoShippingShopSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginEmail" TEXT NOT NULL,
    "loginPasswordEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopeeCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerKeyEncrypted" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "baseUrl" TEXT DEFAULT 'https://partner.shopeemobile.com',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopeeCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopeeOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "amazonProductUrl" TEXT,
    "asin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShopeeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonOrder" (
    "id" TEXT NOT NULL,
    "shopeeOrderId" TEXT NOT NULL,
    "amazonOrderId" TEXT,
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AmazonOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorItem" (
    "id" TEXT NOT NULL,
    "shopeeOrderId" TEXT,
    "asin" TEXT,
    "productName" TEXT NOT NULL,
    "amazonProductUrl" TEXT,
    "shopeePrice" DOUBLE PRECISION NOT NULL,
    "amazonPrice" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Shop_userId_isActive_idx" ON "Shop"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Shop_shopeeShopId_idx" ON "Shop"("shopeeShopId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_userId_shopeeShopId_key" ON "Shop"("userId", "shopeeShopId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShippingSetting_userId_key" ON "AutoShippingSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShippingShopSelection_settingId_shopId_key" ON "AutoShippingShopSelection"("settingId", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonCredential_userId_key" ON "AmazonCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeCredential_userId_key" ON "ShopeeCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeOrder_orderNumber_key" ON "ShopeeOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ShopeeOrder_shopId_status_idx" ON "ShopeeOrder"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonOrder_shopeeOrderId_key" ON "AmazonOrder"("shopeeOrderId");

-- CreateIndex
CREATE INDEX "AmazonOrder_status_idx" ON "AmazonOrder"("status");

-- CreateIndex
CREATE INDEX "ErrorItem_createdAt_idx" ON "ErrorItem"("createdAt");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShippingSetting" ADD CONSTRAINT "AutoShippingSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShippingShopSelection" ADD CONSTRAINT "AutoShippingShopSelection_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "AutoShippingSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShippingShopSelection" ADD CONSTRAINT "AutoShippingShopSelection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmazonCredential" ADD CONSTRAINT "AmazonCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopeeCredential" ADD CONSTRAINT "ShopeeCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopeeOrder" ADD CONSTRAINT "ShopeeOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmazonOrder" ADD CONSTRAINT "AmazonOrder_shopeeOrderId_fkey" FOREIGN KEY ("shopeeOrderId") REFERENCES "ShopeeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorItem" ADD CONSTRAINT "ErrorItem_shopeeOrderId_fkey" FOREIGN KEY ("shopeeOrderId") REFERENCES "ShopeeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
