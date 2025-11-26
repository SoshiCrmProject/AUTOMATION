-- CreateTable
CREATE TABLE "ShopeeCredential" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerKeyEncrypted" TEXT NOT NULL,
    "partnerKeyIv" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://partner.shopeemobile.com',
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopeeCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeCredential_shopId_key" ON "ShopeeCredential"("shopId");

-- AddForeignKey
ALTER TABLE "ShopeeCredential" ADD CONSTRAINT "ShopeeCredential_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopeeCredential" ADD CONSTRAINT "ShopeeCredential_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
