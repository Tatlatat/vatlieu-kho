-- Only posted inventory documents and approved stocktakes are allowed to affect
-- active stock reports. Hard-deleting a document must not leave orphan ledger
-- rows that still appear in history or stock views.

DROP VIEW IF EXISTS stock_by_material;
DROP VIEW IF EXISTS current_stock;
DROP VIEW IF EXISTS loss_by_month;

ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_documentId_fkey";
ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_documentLineId_fkey";
ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_documentLineId_fkey"
  FOREIGN KEY ("documentLineId") REFERENCES "InventoryDocumentLine"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE VIEW current_stock AS
SELECT
  m.id                         AS material_id,
  m.name                       AS name,
  m.code                       AS code,
  m.unit                       AS unit,
  m."minStock"                 AS min_stock,
  w.id                         AS warehouse_id,
  w.name                       AS warehouse_name,
  COALESCE(SUM(
    CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END
  ), 0)                        AS on_hand,
  CASE
    WHEN COALESCE(SUM(CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END),0) <= 0 THEN 'OUT'
    WHEN COALESCE(SUM(CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END),0) <= m."minStock" THEN 'LOW'
    ELSE 'OK'
  END                          AS status
FROM "Material" m
CROSS JOIN "Warehouse" w
LEFT JOIN (
    SELECT sm2.id
      , sm2."materialId"
      , sm2."warehouseId"
      , sm2.type
      , sm2.quantity
      , sm2.reason
    FROM "StockMovement" sm2
    LEFT JOIN "InventoryDocument" d ON d.id = sm2."documentId"
    LEFT JOIN "Stocktake" st ON st.id = sm2."stocktakeId"
    WHERE sm2."voidedAt" IS NULL
      AND sm2."supersededAt" IS NULL
      AND sm2.reason <> 'VOID'
      AND (
        (sm2."documentId" IS NOT NULL AND d.status = 'POSTED')
        OR (sm2."stocktakeId" IS NOT NULL AND st.status = 'APPROVED')
      )
  ) sm
  ON sm."materialId" = m.id
  AND sm."warehouseId" = w.id
GROUP BY m.id, m.name, m.code, m.unit, m."minStock", w.id, w.name;

CREATE OR REPLACE VIEW stock_by_material AS
SELECT material_id, name, code, unit, min_stock,
       SUM(on_hand) AS total_on_hand
FROM current_stock
GROUP BY material_id, name, code, unit, min_stock;

CREATE OR REPLACE VIEW loss_by_month AS
SELECT
  to_char(date_trunc('month', sm."createdAt"), 'YYYY-MM') AS month,
  sm."warehouseId"                                        AS warehouse_id,
  sm.reason                                               AS reason,
  SUM(sm.quantity)                                        AS total_qty,
  COUNT(*)                                                AS movement_count
FROM "StockMovement" sm
LEFT JOIN "InventoryDocument" d ON d.id = sm."documentId"
LEFT JOIN "Stocktake" st ON st.id = sm."stocktakeId"
WHERE sm.type = 'OUT'
  AND sm."voidedAt" IS NULL
  AND sm."supersededAt" IS NULL
  AND sm.reason IN ('DAMAGED', 'EXPIRED', 'NATURAL_LOSS', 'STOCKTAKE_ADJUST')
  AND (
    (sm."documentId" IS NOT NULL AND d.status = 'POSTED')
    OR (sm."stocktakeId" IS NOT NULL AND st.status = 'APPROVED')
  )
GROUP BY date_trunc('month', sm."createdAt"), sm."warehouseId", sm.reason
ORDER BY month, reason;
