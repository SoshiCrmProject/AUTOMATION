-- Migration: add unique constraint for defaultShippingProfileId on AutoShippingSetting
-- This migration adds a UNIQUE constraint so Prisma one-to-one relation is valid.

ALTER TABLE "AutoShippingSetting"
ADD CONSTRAINT "AutoShippingSetting_defaultShippingProfileId_key" UNIQUE ("defaultShippingProfileId");
