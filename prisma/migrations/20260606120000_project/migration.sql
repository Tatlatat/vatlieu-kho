-- Trục Công trình (Project): gom Kho + Quỹ. Migration AN TOÀN cho production:
-- nullable + ON DELETE SET NULL + idempotent (IF NOT EXISTS / DO block).

-- CreateTable Project
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON "Project"("code");

-- AlterTable: thêm projectId nullable (không phá data cũ)
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Fund" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Index projectId
CREATE INDEX IF NOT EXISTS "Warehouse_projectId_idx" ON "Warehouse"("projectId");
CREATE INDEX IF NOT EXISTS "Fund_projectId_idx" ON "Fund"("projectId");

-- FK ON DELETE SET NULL (xóa Project -> kho/quỹ về null, không mất data)
DO $$ BEGIN
  ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Fund" ADD CONSTRAINT "Fund_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
