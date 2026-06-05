-- ---------------------------------------------------------------------------
-- cash_fund: Quỹ (Thu – Chi – Tồn) — Bổ sung 2 mục 6
-- Bảng Fund + CashEntry + enum CashType + view fund_balance + CHECK amount>0
-- ---------------------------------------------------------------------------

-- Enum loại bút toán quỹ
DO $$ BEGIN
  CREATE TYPE "CashType" AS ENUM ('THU', 'CHI');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Danh mục quỹ theo công trường
CREATE TABLE IF NOT EXISTS "Fund" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "code"      TEXT NOT NULL,
  "note"      TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Fund_code_key" ON "Fund"("code");

-- Sổ cái tiền (append-only, bất biến). amount > 0; sửa sai = đánh dấu void.
CREATE TABLE IF NOT EXISTS "CashEntry" (
  "id"          TEXT NOT NULL,
  "fundId"      TEXT NOT NULL,
  "type"        "CashType" NOT NULL,
  "category"    TEXT NOT NULL,
  "amount"      DECIMAL(15,0) NOT NULL,
  "entryDate"   TIMESTAMP(3) NOT NULL,
  "note"        TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt"    TIMESTAMP(3),
  "voidedById"  TEXT,
  "voidReason"  TEXT,
  CONSTRAINT "CashEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CashEntry_fundId_entryDate_idx" ON "CashEntry"("fundId", "entryDate");
CREATE INDEX IF NOT EXISTS "CashEntry_type_idx" ON "CashEntry"("type");
CREATE INDEX IF NOT EXISTS "CashEntry_createdAt_idx" ON "CashEntry"("createdAt");

-- FK (DO block để idempotent — không lỗi nếu chạy lại)
DO $$ BEGIN
  ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_fundId_fkey"
    FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_voidedById_fkey"
    FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CHECK: số tiền luôn dương (chính xác kế toán)
ALTER TABLE "CashEntry" DROP CONSTRAINT IF EXISTS chk_cash_amount_positive;
ALTER TABLE "CashEntry" ADD CONSTRAINT chk_cash_amount_positive CHECK ("amount" > 0);

-- VIEW fund_balance: tồn quỹ = Σ(THU) − Σ(CHI), loại bút toán đã void. Tự tính, không lưu cứng.
CREATE OR REPLACE VIEW fund_balance AS
SELECT
  f.id   AS fund_id,
  f.name AS fund_name,
  f.code AS fund_code,
  COALESCE(SUM(
    CASE c.type WHEN 'THU' THEN c.amount WHEN 'CHI' THEN -c.amount ELSE 0 END
  ), 0) AS balance
FROM "Fund" f
LEFT JOIN "CashEntry" c ON c."fundId" = f.id AND c."voidedAt" IS NULL
GROUP BY f.id, f.name, f.code;
