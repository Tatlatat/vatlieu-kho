-- Thêm Mã cho xe/máy (nullable + unique). Postgres unique index bỏ qua NULL
-- nên nhiều xe chưa-có-mã vẫn hợp lệ. An toàn data live.
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Equipment_code_key" ON "Equipment"("code");
