-- Project, work item, and material norm foundation.
-- This migration is defensive because some local demo databases already
-- contain experimental Project/Fund tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus') THEN
    CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'CLOSED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "warehouseId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'isActive'
  ) THEN
    UPDATE "Project" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"ProjectStatus" ELSE 'CLOSED'::"ProjectStatus" END;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON "Project"("code");
CREATE INDEX IF NOT EXISTS "Project_warehouseId_idx" ON "Project"("warehouseId");
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Project_warehouseId_fkey'
  ) THEN
    ALTER TABLE "Project"
      ADD CONSTRAINT "Project_warehouseId_fkey"
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProjectWorkItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectWorkItem_projectId_name_key" ON "ProjectWorkItem"("projectId", "name");
CREATE INDEX IF NOT EXISTS "ProjectWorkItem_projectId_idx" ON "ProjectWorkItem"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectWorkItem_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectWorkItem"
      ADD CONSTRAINT "ProjectWorkItem_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "ProjectWorkItem" ("id", "projectId", "code", "name", "isDefault", "createdAt", "updatedAt")
SELECT 'pwi_default_' || p.id, p.id, 'CHUNG', 'Chung', true, NOW(), NOW()
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProjectWorkItem" wi WHERE wi."projectId" = p.id AND wi."isDefault" = true
);

CREATE TABLE IF NOT EXISTS "MaterialNorm" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workItemId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "normQty" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaterialNorm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaterialNorm_workItemId_materialId_key" ON "MaterialNorm"("workItemId", "materialId");
CREATE INDEX IF NOT EXISTS "MaterialNorm_projectId_idx" ON "MaterialNorm"("projectId");
CREATE INDEX IF NOT EXISTS "MaterialNorm_materialId_idx" ON "MaterialNorm"("materialId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialNorm_projectId_fkey') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT "MaterialNorm_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialNorm_workItemId_fkey') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT "MaterialNorm_workItemId_fkey"
      FOREIGN KEY ("workItemId") REFERENCES "ProjectWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialNorm_materialId_fkey') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT "MaterialNorm_materialId_fkey"
      FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialNorm_createdById_fkey') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT "MaterialNorm_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MaterialNorm_updatedById_fkey') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT "MaterialNorm_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_norm_qty_non_negative') THEN
    ALTER TABLE "MaterialNorm"
      ADD CONSTRAINT chk_material_norm_qty_non_negative CHECK ("normQty" >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Fund" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "projectId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Fund"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Fund_code_key" ON "Fund"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Fund_projectId_key" ON "Fund"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Fund_projectId_fkey') THEN
    ALTER TABLE "Fund"
      ADD CONSTRAINT "Fund_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "InventoryDocumentLine"
  ADD COLUMN IF NOT EXISTS "projectId" TEXT,
  ADD COLUMN IF NOT EXISTS "workItemId" TEXT;

CREATE INDEX IF NOT EXISTS "InventoryDocumentLine_projectId_idx" ON "InventoryDocumentLine"("projectId");
CREATE INDEX IF NOT EXISTS "InventoryDocumentLine_workItemId_idx" ON "InventoryDocumentLine"("workItemId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryDocumentLine_projectId_fkey') THEN
    ALTER TABLE "InventoryDocumentLine"
      ADD CONSTRAINT "InventoryDocumentLine_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryDocumentLine_workItemId_fkey') THEN
    ALTER TABLE "InventoryDocumentLine"
      ADD CONSTRAINT "InventoryDocumentLine_workItemId_fkey"
      FOREIGN KEY ("workItemId") REFERENCES "ProjectWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
