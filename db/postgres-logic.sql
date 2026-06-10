-- ============================================================================
-- Postgres-centric logic: views, triggers, constraints
-- Áp dụng SAU khi `prisma migrate` đã tạo bảng.
-- Chạy idempotent (CREATE OR REPLACE / DROP IF EXISTS) — chạy lại nhiều lần OK.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CHECK constraint: số lượng giao dịch luôn > 0
-- ---------------------------------------------------------------------------
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS chk_quantity_positive;
ALTER TABLE "StockMovement" ADD CONSTRAINT chk_quantity_positive CHECK ("quantity" > 0);

-- ---------------------------------------------------------------------------
-- 2) VIEW current_stock: tự tính tồn kho hiện tại = Σ(IN) − Σ(OUT)
--    theo từng kho (warehouse-aware), loại trừ movement bị void
--    kèm trạng thái OK / LOW / OUT dựa trên minStock
-- ---------------------------------------------------------------------------
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
  AND sm."supersededAt" IS NULL
  AND sm.reason <> 'VOID'
GROUP BY m.id, m.name, m.code, m.unit, m."minStock", w.id, w.name;

-- ---------------------------------------------------------------------------
-- 2b) VIEW stock_by_material: tổng tồn kho toàn bộ kho theo từng vật liệu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW stock_by_material AS
SELECT material_id, name, code, unit, min_stock,
       SUM(on_hand) AS total_on_hand
FROM current_stock
GROUP BY material_id, name, code, unit, min_stock;

-- ---------------------------------------------------------------------------
-- 3) TRIGGER: khi Stocktake chuyển DRAFT -> APPROVED, tự sinh StockMovement
--    điều chỉnh cho mỗi item có diff != 0 (idempotent qua reason STOCKTAKE_ADJUST)
--    diff < 0  => hao hụt  => OUT
--    diff > 0  => thừa     => IN
--    Movement gắn warehouseId của phiếu kiểm kê
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4) VIEW loss_by_month: hao hụt theo tháng × kho × nguyên nhân
--    loại trừ movement bị void; TRANSFER_* không phải hao hụt nên không lọc
-- ---------------------------------------------------------------------------
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
  AND sm."supersededAt" IS NULL
  AND sm.reason IN ('DAMAGED', 'EXPIRED', 'NATURAL_LOSS', 'STOCKTAKE_ADJUST')
GROUP BY date_trunc('month', sm."createdAt"), sm."warehouseId", sm.reason
ORDER BY month, reason;
