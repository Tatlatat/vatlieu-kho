-- Migration: EquipmentLog gắn Công trình (Project). AN TOÀN cho production:
-- ADD COLUMN nullable + ON DELETE SET NULL + idempotent (IF NOT EXISTS / DO block).

-- AlterTable: thêm projectId nullable (không phá dữ liệu cũ)
ALTER TABLE "EquipmentLog" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Index projectId
CREATE INDEX IF NOT EXISTS "EquipmentLog_projectId_idx" ON "EquipmentLog"("projectId");

-- FK ON DELETE SET NULL (xóa Project -> log về null, giữ lịch sử giờ xe)
DO $$ BEGIN
  ALTER TABLE "EquipmentLog" ADD CONSTRAINT "EquipmentLog_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
