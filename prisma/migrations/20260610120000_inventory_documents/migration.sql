-- Inventory documents are the user-facing slips. StockMovement remains the
-- inventory ledger and is linked back to posted document lines.

CREATE TYPE "InventoryDocumentKind" AS ENUM ('IMPORT', 'EXPORT', 'TRANSFER', 'OPENING', 'ADJUSTMENT');
CREATE TYPE "InventoryDocumentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');
CREATE TYPE "DocumentAuditAction" AS ENUM ('CREATE', 'POST', 'EDIT_DRAFT', 'EDIT_POSTED', 'VOID', 'DELETE_DRAFT');

CREATE TABLE "InventoryDocument" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "kind" "InventoryDocumentKind" NOT NULL,
  "status" "InventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "documentDate" TIMESTAMP(3) NOT NULL,
  "warehouseId" TEXT,
  "fromWarehouseId" TEXT,
  "toWarehouseId" TEXT,
  "reason" "MovementReason",
  "note" TEXT,
  "revisionNo" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "postedById" TEXT,
  "voidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,

  CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryDocumentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "note" TEXT,

  CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentAuditLog" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "action" "DocumentAuditAction" NOT NULL,
  "fromRevisionNo" INTEGER,
  "toRevisionNo" INTEGER,
  "reason" TEXT,
  "snapshotBefore" JSONB,
  "snapshotAfter" JSONB,
  "changedById" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

-- Some local demo databases already had an experimental Document table that
-- added StockMovement.documentId. It was unused by ledger rows, but its FK
-- blocks this migration from repurposing the column for InventoryDocument.
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_documentId_fkey";

ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "documentId" TEXT,
  ADD COLUMN IF NOT EXISTS "documentLineId" TEXT,
  ADD COLUMN IF NOT EXISTS "documentRevisionNo" INTEGER,
  ADD COLUMN IF NOT EXISTS "supersededAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "supersededByRevisionNo" INTEGER;

CREATE UNIQUE INDEX "InventoryDocument_code_key" ON "InventoryDocument"("code");
CREATE INDEX "InventoryDocument_kind_status_idx" ON "InventoryDocument"("kind", "status");
CREATE INDEX "InventoryDocument_documentDate_idx" ON "InventoryDocument"("documentDate");
CREATE INDEX "InventoryDocument_warehouseId_idx" ON "InventoryDocument"("warehouseId");
CREATE INDEX "InventoryDocument_fromWarehouseId_idx" ON "InventoryDocument"("fromWarehouseId");
CREATE INDEX "InventoryDocument_toWarehouseId_idx" ON "InventoryDocument"("toWarehouseId");
CREATE INDEX "InventoryDocument_createdById_idx" ON "InventoryDocument"("createdById");
CREATE UNIQUE INDEX "InventoryDocumentLine_documentId_lineNo_key" ON "InventoryDocumentLine"("documentId", "lineNo");
CREATE INDEX "InventoryDocumentLine_materialId_idx" ON "InventoryDocumentLine"("materialId");
CREATE INDEX "DocumentAuditLog_documentId_idx" ON "DocumentAuditLog"("documentId");
CREATE INDEX "DocumentAuditLog_changedById_idx" ON "DocumentAuditLog"("changedById");
CREATE INDEX "DocumentAuditLog_changedAt_idx" ON "DocumentAuditLog"("changedAt");
CREATE INDEX IF NOT EXISTS "StockMovement_documentId_idx" ON "StockMovement"("documentId");
CREATE INDEX IF NOT EXISTS "StockMovement_documentLineId_idx" ON "StockMovement"("documentLineId");

ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentLineId_fkey" FOREIGN KEY ("documentLineId") REFERENCES "InventoryDocumentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT chk_document_line_quantity_positive CHECK ("quantity" > 0);

INSERT INTO "InventoryDocument" (
  "id", "code", "kind", "status", "documentDate", "warehouseId", "reason", "note",
  "revisionNo", "createdById", "postedById", "createdAt", "updatedAt", "postedAt"
)
SELECT
  'doc_' || sm.id,
  'LEG-' || sm.id,
  CASE
    WHEN sm.reason = 'STOCKTAKE_ADJUST' THEN 'ADJUSTMENT'::"InventoryDocumentKind"
    WHEN sm.type = 'IN' THEN 'IMPORT'::"InventoryDocumentKind"
    ELSE 'EXPORT'::"InventoryDocumentKind"
  END,
  'POSTED'::"InventoryDocumentStatus",
  sm."createdAt",
  sm."warehouseId",
  sm.reason,
  sm.note,
  1,
  sm."createdById",
  sm."createdById",
  sm."createdAt",
  sm."createdAt",
  sm."createdAt"
FROM "StockMovement" sm
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

INSERT INTO "InventoryDocumentLine" ("id", "documentId", "lineNo", "materialId", "quantity", "note")
SELECT
  'line_' || sm.id,
  'doc_' || sm.id,
  1,
  sm."materialId",
  sm.quantity,
  sm.note
FROM "StockMovement" sm
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

UPDATE "StockMovement" sm
SET
  "documentId" = 'doc_' || sm.id,
  "documentLineId" = 'line_' || sm.id,
  "documentRevisionNo" = 1
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

WITH transfer_docs AS (
  SELECT
    sm."transferId",
    MIN(sm."createdAt") AS created_at,
    MIN(sm."createdById") AS created_by_id,
    MIN(sm.note) AS note,
    MAX(CASE WHEN sm.type = 'OUT' THEN sm."warehouseId" END) AS from_warehouse_id,
    MAX(CASE WHEN sm.type = 'IN' THEN sm."warehouseId" END) AS to_warehouse_id
  FROM "StockMovement" sm
  WHERE sm."transferId" IS NOT NULL
    AND sm."documentId" IS NULL
  GROUP BY sm."transferId"
)
INSERT INTO "InventoryDocument" (
  "id", "code", "kind", "status", "documentDate", "fromWarehouseId", "toWarehouseId",
  "note", "revisionNo", "createdById", "postedById", "createdAt", "updatedAt", "postedAt"
)
SELECT
  'doc_transfer_' || replace(td."transferId", '-', '_'),
  'LEG-TR-' || td."transferId",
  'TRANSFER'::"InventoryDocumentKind",
  'POSTED'::"InventoryDocumentStatus",
  td.created_at,
  td.from_warehouse_id,
  td.to_warehouse_id,
  td.note,
  1,
  td.created_by_id,
  td.created_by_id,
  td.created_at,
  td.created_at,
  td.created_at
FROM transfer_docs td;

WITH transfer_out AS (
  SELECT
    sm.id AS out_id,
    sm."transferId",
    sm."materialId",
    sm.quantity,
    sm.note,
    row_number() OVER (PARTITION BY sm."transferId" ORDER BY sm."createdAt", sm.id) AS line_no
  FROM "StockMovement" sm
  WHERE sm."transferId" IS NOT NULL
    AND sm.type = 'OUT'
    AND sm."documentId" IS NULL
)
INSERT INTO "InventoryDocumentLine" ("id", "documentId", "lineNo", "materialId", "quantity", "note")
SELECT
  'line_' || transfer_out.out_id,
  'doc_transfer_' || replace(transfer_out."transferId", '-', '_'),
  transfer_out.line_no,
  transfer_out."materialId",
  transfer_out.quantity,
  transfer_out.note
FROM transfer_out;

WITH transfer_lines AS (
  SELECT
    dl.id AS line_id,
    d.id AS document_id,
    d."fromWarehouseId",
    d."toWarehouseId",
    dl."materialId",
    dl.quantity
  FROM "InventoryDocumentLine" dl
  JOIN "InventoryDocument" d ON d.id = dl."documentId"
  WHERE d.kind = 'TRANSFER'
)
UPDATE "StockMovement" sm
SET
  "documentId" = transfer_lines.document_id,
  "documentLineId" = transfer_lines.line_id,
  "documentRevisionNo" = 1
FROM transfer_lines
WHERE sm."transferId" IS NOT NULL
  AND sm."documentId" IS NULL
  AND sm."materialId" = transfer_lines."materialId"
  AND sm.quantity = transfer_lines.quantity
  AND (
    (sm.type = 'OUT' AND sm."warehouseId" = transfer_lines."fromWarehouseId")
    OR
    (sm.type = 'IN' AND sm."warehouseId" = transfer_lines."toWarehouseId")
  );

INSERT INTO "DocumentAuditLog" (
  "id", "documentId", "action", "toRevisionNo", "reason", "changedById", "changedAt"
)
SELECT
  'audit_' || d.id,
  d.id,
  'POST'::"DocumentAuditAction",
  1,
  'Backfill từ StockMovement hiện có',
  d."createdById",
  d."createdAt"
FROM "InventoryDocument" d
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentAuditLog" al WHERE al."documentId" = d.id
);
