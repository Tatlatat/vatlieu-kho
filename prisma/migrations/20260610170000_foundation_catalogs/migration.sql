DO $$
BEGIN
  CREATE TYPE "MaterialKind" AS ENUM ('MATERIAL', 'VEHICLE', 'MACHINE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TrackingMode" AS ENUM ('QUANTITY', 'HOURS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Unit" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Unit"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Unit' AND column_name = 'code'
  ) THEN
    UPDATE "Unit"
    SET "name" = "code"
    WHERE "name" IS NULL OR trim("name") = '';

    ALTER TABLE "Unit" ALTER COLUMN "code" DROP NOT NULL;
  END IF;
END $$;

UPDATE "Unit"
SET "name" = "id"
WHERE "name" IS NULL OR trim("name") = '';

ALTER TABLE "Unit" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Unit_name_key" ON "Unit"("name");

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "taxCode" TEXT,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "taxCode" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Supplier"
SET "code" = concat('NCC-', upper(substr(md5("id"), 1, 8)))
WHERE "code" IS NULL OR trim("code") = '';

UPDATE "Supplier"
SET "name" = "code"
WHERE "name" IS NULL OR trim("name") = '';

UPDATE "Supplier"
SET "name" = "id"
WHERE "name" IS NULL OR trim("name") = '';

ALTER TABLE "Supplier" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_code_key" ON "Supplier"("code");

ALTER TABLE "Material"
  ADD COLUMN IF NOT EXISTS "unitId" TEXT,
  ADD COLUMN IF NOT EXISTS "kind" "MaterialKind" NOT NULL DEFAULT 'MATERIAL',
  ADD COLUMN IF NOT EXISTS "trackingMode" "TrackingMode" NOT NULL DEFAULT 'QUANTITY';

ALTER TABLE "InventoryDocument"
  ADD COLUMN IF NOT EXISTS "supplierId" TEXT;

INSERT INTO "Unit" ("id", "name", "createdAt", "updatedAt")
SELECT
  concat('unit_', md5(unit_name)),
  unit_name,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT trim("unit") AS unit_name
  FROM "Material"
  WHERE "unit" IS NOT NULL AND trim("unit") <> ''
) existing_units
ON CONFLICT ("name") DO NOTHING;

UPDATE "Material" AS material
SET "unitId" = unit_row."id"
FROM "Unit" AS unit_row
WHERE material."unitId" IS NULL
  AND trim(material."unit") = unit_row."name";

CREATE INDEX IF NOT EXISTS "Material_unitId_idx" ON "Material"("unitId");
CREATE INDEX IF NOT EXISTS "Material_kind_idx" ON "Material"("kind");
CREATE INDEX IF NOT EXISTS "Material_trackingMode_idx" ON "Material"("trackingMode");
CREATE INDEX IF NOT EXISTS "InventoryDocument_supplierId_idx" ON "InventoryDocument"("supplierId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Material_unitId_fkey'
  ) THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "Unit"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryDocument_supplierId_fkey'
  ) THEN
    ALTER TABLE "InventoryDocument"
      ADD CONSTRAINT "InventoryDocument_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
