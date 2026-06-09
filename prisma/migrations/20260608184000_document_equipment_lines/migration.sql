CREATE TABLE "DocumentEquipmentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "projectId" TEXT,
  "hours" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  CONSTRAINT "DocumentEquipmentLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentEquipmentLine_documentId_idx" ON "DocumentEquipmentLine"("documentId");
CREATE INDEX "DocumentEquipmentLine_equipmentId_idx" ON "DocumentEquipmentLine"("equipmentId");
CREATE INDEX "DocumentEquipmentLine_projectId_idx" ON "DocumentEquipmentLine"("projectId");

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_equipmentId_fkey"
FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog" ADD COLUMN "documentId" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "documentEquipmentLineId" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "EquipmentLog" ADD COLUMN "voidedById" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "voidReason" TEXT;

CREATE UNIQUE INDEX "EquipmentLog_documentEquipmentLineId_key" ON "EquipmentLog"("documentEquipmentLineId");
CREATE INDEX "EquipmentLog_documentId_idx" ON "EquipmentLog"("documentId");
CREATE INDEX "EquipmentLog_voidedById_idx" ON "EquipmentLog"("voidedById");

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_documentEquipmentLineId_fkey"
FOREIGN KEY ("documentEquipmentLineId") REFERENCES "DocumentEquipmentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
