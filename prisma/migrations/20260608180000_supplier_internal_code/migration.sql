ALTER TABLE "Supplier" ADD COLUMN "code" TEXT;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Supplier"
  WHERE "code" IS NULL
)
UPDATE "Supplier" s
SET "code" = 'NCC' || LPAD(numbered.rn::text, 3, '0')
FROM numbered
WHERE s.id = numbered.id;

CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
ALTER TABLE "Supplier" ALTER COLUMN "code" SET NOT NULL;
