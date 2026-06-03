ALTER TABLE "StockMovement" ADD COLUMN "stocktakeId" TEXT;
CREATE INDEX "StockMovement_stocktakeId_idx" ON "StockMovement"("stocktakeId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
