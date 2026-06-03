-- Backfill stocktakeId cho các điều chỉnh kiểm kê (STOCKTAKE_ADJUST) tạo TRƯỚC
-- migration stocktake_link (chúng có stocktakeId = NULL). Khớp qua note do trigger
-- ghi: 'Điều chỉnh theo phiếu kiểm kê ' || code. Idempotent: chỉ cập nhật dòng còn NULL.
UPDATE "StockMovement" sm
SET "stocktakeId" = st.id
FROM "Stocktake" st
WHERE sm.reason = 'STOCKTAKE_ADJUST'
  AND sm."stocktakeId" IS NULL
  AND sm.note = 'Điều chỉnh theo phiếu kiểm kê ' || st.code;
