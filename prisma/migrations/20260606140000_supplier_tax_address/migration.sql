-- Migration: NCC thêm Mã số thuế + Địa chỉ. AN TOÀN cho production:
-- ADD COLUMN nullable idempotent.

-- AlterTable: thêm taxCode + address nullable (không phá dữ liệu cũ)
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "taxCode" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "address" TEXT;
