-- ---------------------------------------------------------------------------
-- equipment: Xe/Máy + nhật ký giờ chạy (khớp DDL Bổ sung 2 cũ)
-- ---------------------------------------------------------------------------

CREATE TABLE "Equipment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "plateNo" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquipmentLog" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "logDate" TIMESTAMP(3) NOT NULL,
  "hours" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EquipmentLog_equipmentId_idx" ON "EquipmentLog"("equipmentId");
CREATE INDEX "EquipmentLog_logDate_idx" ON "EquipmentLog"("logDate");

ALTER TABLE "EquipmentLog" ADD CONSTRAINT "EquipmentLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentLog" ADD CONSTRAINT "EquipmentLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
