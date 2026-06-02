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
--    kèm trạng thái OK / LOW / OUT dựa trên minStock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW current_stock AS
SELECT
  m.id                         AS material_id,
  m.name                       AS name,
  m.code                       AS code,
  m.unit                       AS unit,
  m."minStock"                 AS min_stock,
  COALESCE(SUM(
    CASE sm.type
      WHEN 'IN'  THEN sm.quantity
      WHEN 'OUT' THEN -sm.quantity
      ELSE 0
    END
  ), 0)                        AS on_hand,
  CASE
    WHEN COALESCE(SUM(
      CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END
    ), 0) <= 0 THEN 'OUT'
    WHEN COALESCE(SUM(
      CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END
    ), 0) <= m."minStock" THEN 'LOW'
    ELSE 'OK'
  END                          AS status
FROM "Material" m
LEFT JOIN "StockMovement" sm ON sm."materialId" = m.id
GROUP BY m.id, m.name, m.code, m.unit, m."minStock";

-- ---------------------------------------------------------------------------
-- 3) TRIGGER: khi Stocktake chuyển DRAFT -> APPROVED, tự sinh StockMovement
--    điều chỉnh cho mỗi item có diff != 0 (idempotent qua reason STOCKTAKE_ADJUST)
--    diff < 0  => hao hụt  => OUT
--    diff > 0  => thừa     => IN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_apply_stocktake_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
    INSERT INTO "StockMovement" (id, "materialId", type, quantity, reason, note, "createdById", "createdAt")
    SELECT
      gen_random_uuid()::text,
      si."materialId",
      CASE WHEN si.diff < 0 THEN 'OUT'::"MovementType" ELSE 'IN'::"MovementType" END,
      ABS(si.diff),
      'STOCKTAKE_ADJUST'::"MovementReason",
      'Điều chỉnh theo phiếu kiểm kê ' || NEW.code,
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
-- 4) VIEW loss_by_month: hao hụt theo tháng × nguyên nhân (window-friendly)
--    "hao hụt" = các movement OUT có lý do hao hụt (không phải bán/công trình
--    thông thường vẫn tính, nhưng tách nguyên nhân để phân tích)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW loss_by_month AS
SELECT
  to_char(date_trunc('month', sm."createdAt"), 'YYYY-MM')      AS month,
  sm.reason                                                    AS reason,
  SUM(sm.quantity)                                             AS total_qty,
  COUNT(*)                                                     AS movement_count
FROM "StockMovement" sm
WHERE sm.type = 'OUT'
  AND sm.reason IN ('DAMAGED', 'EXPIRED', 'NATURAL_LOSS', 'STOCKTAKE_ADJUST')
GROUP BY date_trunc('month', sm."createdAt"), sm.reason
ORDER BY month, reason;
