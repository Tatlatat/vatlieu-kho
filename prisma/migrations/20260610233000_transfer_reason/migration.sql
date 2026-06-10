ALTER TABLE "InventoryDocument" ADD COLUMN "transferReason" TEXT;

CREATE INDEX "InventoryDocument_transferReason_idx" ON "InventoryDocument"("transferReason");
