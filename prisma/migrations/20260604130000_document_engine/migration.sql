-- ---------------------------------------------------------------------------
-- document_engine: lớp phiếu chứng từ (Document/DocumentLine) + Supplier
-- Tái dựng khớp schema Bổ sung 2 cũ (xem docs/superpowers/reference/2026-06-04-OLD-bo-sung-2-schema.sql)
-- Document là bảng hợp nhất (gộp DB) cho 4 loại phiếu IN/OUT/TRANSFER/STOCKTAKE.
-- ---------------------------------------------------------------------------

-- Enums
CREATE TYPE "DocType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'STOCKTAKE');
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'PENDING', 'POSTED', 'VOIDED');

-- Supplier (Document.supplierId tham chiếu tới đây)
CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- Document (hợp nhất 4 loại phiếu)
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "DocType" NOT NULL,
  "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
  "docDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "warehouseId" TEXT,
  "fromWarehouseId" TEXT,
  "toWarehouseId" TEXT,
  "supplierId" TEXT,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidedById" TEXT,
  "transferId" TEXT,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Document_code_key" ON "Document"("code");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
CREATE INDEX "Document_type_status_docDate_idx" ON "Document"("type", "status", "docDate");

ALTER TABLE "Document" ADD CONSTRAINT "Document_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DocumentLine
CREATE TABLE "DocumentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  CONSTRAINT "DocumentLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentLine_documentId_idx" ON "DocumentLine"("documentId");
ALTER TABLE "DocumentLine" ADD CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLine" ADD CONSTRAINT "DocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockMovement.documentId (movement biết thuộc phiếu nào)
ALTER TABLE "StockMovement" ADD COLUMN "documentId" TEXT;
CREATE INDEX "StockMovement_documentId_idx" ON "StockMovement"("documentId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
