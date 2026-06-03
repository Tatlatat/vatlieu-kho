-- ---------------------------------------------------------------------------
-- warehouse_logic: view tồn/loss theo kho + stock_by_material + trigger kiểm kê gắn kho
-- Idempotent: DROP VIEW IF EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS
-- ---------------------------------------------------------------------------

-- VIEW current_stock: warehouse-aware, excludes voided movements
DROP VIEW IF EXISTS stock_by_material;
DROP VIEW IF EXISTS current_stock;
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
LEFT JOIN "StockMovement" sm
  ON sm."materialId" = m.id
  AND sm."warehouseId" = w.id
  AND sm."voidedAt" IS NULL
  AND sm.reason <> 'VOID'
GROUP BY m.id, m.name, m.code, m.unit, m."minStock", w.id, w.name;

-- VIEW stock_by_material: total stock per material across all warehouses
CREATE OR REPLACE VIEW stock_by_material AS
SELECT material_id, name, code, unit, min_stock,
       SUM(on_hand) AS total_on_hand
FROM current_stock
GROUP BY material_id, name, code, unit, min_stock;

-- FUNCTION + TRIGGER: stocktake approval generates movements with warehouseId
CREATE OR REPLACE FUNCTION fn_apply_stocktake_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
    INSERT INTO "StockMovement" (id, "materialId", "warehouseId", type, quantity, reason, note, "stocktakeId", "createdById", "createdAt")
    SELECT
      gen_random_uuid()::text,
      si."materialId",
      NEW."warehouseId",
      CASE WHEN si.diff < 0 THEN 'OUT'::"MovementType" ELSE 'IN'::"MovementType" END,
      ABS(si.diff),
      'STOCKTAKE_ADJUST'::"MovementReason",
      'Điều chỉnh theo phiếu kiểm kê ' || NEW.code,
      NEW.id,
      COALESCE(NEW."approvedById", NEW."createdById"),
      NOW()
    FROM "StocktakeItem" si
    WHERE si."stocktakeId" = NEW.id
      AND si.diff <> 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stocktake_approve ON "Stocktake";
CREATE TRIGGER trg_stocktake_approve
  AFTER UPDATE ON "Stocktake"
  FOR EACH ROW
  EXECUTE FUNCTION fn_apply_stocktake_adjustments();

-- VIEW loss_by_month: losses by month × warehouse × reason, excludes voided
DROP VIEW IF EXISTS loss_by_month;
CREATE OR REPLACE VIEW loss_by_month AS
SELECT
  to_char(date_trunc('month', sm."createdAt"), 'YYYY-MM') AS month,
  sm."warehouseId"                                        AS warehouse_id,
  sm.reason                                               AS reason,
  SUM(sm.quantity)                                        AS total_qty,
  COUNT(*)                                                AS movement_count
FROM "StockMovement" sm
WHERE sm.type = 'OUT'
  AND sm."voidedAt" IS NULL
  AND sm.reason IN ('DAMAGED', 'EXPIRED', 'NATURAL_LOSS', 'STOCKTAKE_ADJUST')
GROUP BY date_trunc('month', sm."createdAt"), sm."warehouseId", sm.reason
ORDER BY month, reason;
