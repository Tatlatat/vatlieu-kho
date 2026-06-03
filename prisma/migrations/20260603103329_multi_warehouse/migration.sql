-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "MovementReason" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "MovementReason" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "MovementReason" ADD VALUE 'VOID';

-- AlterEnum
ALTER TYPE "StocktakeStatus" ADD VALUE 'VOIDED';

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- AlterTable (nullable columns first — no backfill needed)
ALTER TABLE "StockMovement" ADD COLUMN "transferId" TEXT,
ADD COLUMN "voidReversalOf" TEXT,
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedById" TEXT;

-- Thêm cột kho dạng nullable trước (vì bảng đã có dữ liệu)
ALTER TABLE "StockMovement" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "Stocktake" ADD COLUMN "warehouseId" TEXT;

-- Tạo Kho chính mặc định
INSERT INTO "Warehouse" ("id", "name", "code", "isDefault", "createdAt")
VALUES ('whse_default_main', 'Kho chính', 'KHO-CHINH', true, NOW());

-- Backfill toàn bộ dữ liệu cũ vào Kho chính
UPDATE "StockMovement" SET "warehouseId" = 'whse_default_main' WHERE "warehouseId" IS NULL;
UPDATE "Stocktake"     SET "warehouseId" = 'whse_default_main' WHERE "warehouseId" IS NULL;

-- Giờ mới ép NOT NULL + khóa ngoại
ALTER TABLE "StockMovement" ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "Stocktake"     ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_transferId_idx" ON "StockMovement"("transferId");
