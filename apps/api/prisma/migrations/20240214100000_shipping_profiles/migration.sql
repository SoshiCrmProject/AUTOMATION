-- Shipping profiles to manage address book entries per shop
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'JP',
    "instructions" TEXT,
    "amazonAddressLabel" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingProfile_shopId_label_key" ON "ShippingProfile"("shopId", "label");
CREATE INDEX "ShippingProfile_shopId_isDefault_idx" ON "ShippingProfile"("shopId", "isDefault");

ALTER TABLE "AutoShippingSetting" ADD COLUMN "defaultShippingProfileId" TEXT;
ALTER TABLE "ManualAmazonOrder" ADD COLUMN "shippingProfileId" TEXT;

ALTER TABLE "ShippingProfile"
  ADD CONSTRAINT "ShippingProfile_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutoShippingSetting"
  ADD CONSTRAINT "AutoShippingSetting_defaultShippingProfileId_fkey"
  FOREIGN KEY ("defaultShippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualAmazonOrder"
  ADD CONSTRAINT "ManualAmazonOrder_shippingProfileId_fkey"
  FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
