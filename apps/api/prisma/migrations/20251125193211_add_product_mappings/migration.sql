-- CreateTable
CREATE TABLE "AmazonProduct" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asin" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'JPY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopeeProduct" (
    "id" TEXT NOT NULL,
    "shopeeItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'JPY',
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopeeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "shopeeProductId" TEXT NOT NULL,
    "amazonProductId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopeeProduct_shopId_shopeeItemId_idx" ON "ShopeeProduct"("shopId", "shopeeItemId");

-- CreateIndex
CREATE INDEX "ProductMapping_shopeeProductId_priority_idx" ON "ProductMapping"("shopeeProductId", "priority");

-- AddForeignKey
ALTER TABLE "ShopeeProduct" ADD CONSTRAINT "ShopeeProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_shopeeProductId_fkey" FOREIGN KEY ("shopeeProductId") REFERENCES "ShopeeProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_amazonProductId_fkey" FOREIGN KEY ("amazonProductId") REFERENCES "AmazonProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
