CREATE TABLE "Unit" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

ALTER TABLE "Material" ADD COLUMN "unitId" TEXT;
CREATE INDEX "Material_unitId_idx" ON "Material"("unitId");

INSERT INTO "Unit" ("id", "code", "name")
SELECT
  'unit_' || md5(lower(trim(unit))),
  upper(regexp_replace(lower(trim(unit)), '\s+', '_', 'g')),
  MIN(trim(unit))
FROM "Material"
WHERE trim(unit) <> ''
GROUP BY lower(trim(unit));

UPDATE "Material" m
SET "unitId" = u.id
FROM "Unit" u
WHERE lower(trim(m.unit)) = lower(trim(u.name));

ALTER TABLE "Material"
ADD CONSTRAINT "Material_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
