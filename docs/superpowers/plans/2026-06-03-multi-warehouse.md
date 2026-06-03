# Quản lý đa kho (Multi-Warehouse) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chiều "Kho" vào toàn hệ thống vatlieu-kho — quản lý nhiều kho, nhập/xuất theo kho, chuyển kho nội bộ, hủy chứng từ bằng bút toán đảo, và báo cáo cân đối Đầu kỳ–Nhập–Xuất–Tồn theo kỳ & theo kho — mà không phá kiến trúc append-only/Postgres-centric hiện có.

**Architecture:** Thêm bảng `Warehouse` + cột `warehouseId` vào `StockMovement`/`Stocktake`. Tồn kho vẫn được TÍNH từ sổ cái qua view Postgres (thêm chiều kho vào `GROUP BY`), không lưu cứng. Chuyển kho = cặp movement OUT+IN cùng `transferId`. Hủy chứng từ = đánh cờ `voidedAt` trên dòng gốc (view loại trừ) + ghi 1 dòng VOID để lưu dấu vết. Dữ liệu cũ được di trú vào "Kho chính" mặc định.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma 6, PostgreSQL 16, TypeScript, Zod, shadcn/ui (base-ui), Tailwind v4. Docker Compose cho DB local (container `vatlieu_db`, host port 5433).

**Cách kiểm thử trong dự án này (KHÔNG có test runner):** Dự án không dùng vitest/jest. Cổng kiểm chứng cho mỗi task là một trong:
- `npm run typecheck` (phải sạch, exit 0)
- `npm run build` (phải thành công)
- Query SQL xác minh trực tiếp qua psql: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "<SQL>"`
- Kịch bản thử thủ công cụ thể (ghi rõ bước + kết quả mong đợi)

Spec gốc: `docs/superpowers/specs/2026-06-03-multi-warehouse-design.md`

---

## Bản đồ file

**Tạo mới:**
- `components/searchable-material-select.tsx` — dropdown chọn mã vật tư có ô lọc tìm nhanh (dùng chung cho nhập/xuất/chuyển kho).
- `components/warehouse-select.tsx` — dropdown chọn kho (mặc định Kho chính).
- `components/warehouse-manager.tsx` — thêm/sửa kho trong trang Danh mục.
- `components/transfer-form.tsx` — form chuyển kho.
- `components/balance-report.tsx` — bảng cân đối Đầu kỳ–Nhập–Xuất–Tồn + nút hiện chuyển kho + drill-down.
- `app/(app)/chuyen-kho/page.tsx` — trang chuyển kho.
- `lib/actions/warehouses.ts` — server actions CRUD kho.
- `lib/actions/transfer.ts` — server action chuyển kho.
- `lib/actions/void.ts` — server action hủy chứng từ (bút toán đảo).
- `lib/queries/warehouses.ts` — đọc danh sách kho.
- `lib/queries/balance.ts` — query báo cáo cân đối theo kỳ/kho.
- `prisma/migrations/<timestamp>_multi_warehouse/migration.sql` — migration schema + backfill Kho chính.

**Sửa:**
- `prisma/schema.prisma` — thêm model Warehouse, cột warehouseId/transferId/voided* , enum mở rộng.
- `db/postgres-logic.sql` — view current_stock (+kho), stock_by_material, loss_by_month (+kho), trigger kiểm kê (+kho).
- `lib/validation.ts` — schema Zod cho kho/chuyển kho/hủy + REASON_LABELS mới.
- `lib/actions/movements.ts` — nhập/xuất nhận warehouseId.
- `lib/actions/stocktake.ts` — phiếu kiểm kê gắn warehouseId.
- `lib/queries/stock.ts` — getCurrentStock theo kho; getOnHand theo (mã,kho).
- `lib/queries/reports.ts` — loss/báo cáo lọc theo kho.
- `lib/queries/history.ts` — nhật ký kèm kho + cờ hủy.
- `components/import-form.tsx`, `components/export-form.tsx` — thêm kho, đơn vị, dropdown có lọc.
- `components/material-manager.tsx` — thêm số đếm mã + khu quản lý kho.
- `components/stocktake-detail.tsx`, `components/new-stocktake-button.tsx` — chọn kho.
- `components/history-table.tsx` — cột kho + nút hủy (OWNER).
- `app/(app)/bao-cao/page.tsx` — nhúng balance-report + lọc ngày/kho.
- `app/(app)/nhap/page.tsx`, `app/(app)/xuat/page.tsx` — truyền danh sách kho.
- `components/nav.tsx` — thêm link Chuyển kho.
- `prisma/seed.ts` — seed có kho.

---

## Task 1: Schema — thêm Warehouse + cột kho + enum

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Thêm model Warehouse + mở rộng enum**

Trong `prisma/schema.prisma`, sửa enum `MovementReason` và `StocktakeStatus`, thêm model `Warehouse`:

```prisma
enum MovementReason {
  PURCHASE
  PROJECT
  DAMAGED
  EXPIRED
  NATURAL_LOSS
  STOCKTAKE_ADJUST
  TRANSFER_OUT
  TRANSFER_IN
  VOID
}

enum StocktakeStatus {
  DRAFT
  APPROVED
  VOIDED
}

model Warehouse {
  id          String          @id @default(cuid())
  name        String
  code        String          @unique
  isDefault   Boolean         @default(false)
  createdAt   DateTime        @default(now())
  movements   StockMovement[]
  stocktakes  Stocktake[]
}
```

- [ ] **Step 2: Thêm cột vào StockMovement**

Sửa model `StockMovement`, thêm các trường (giữ nguyên các trường cũ):

```prisma
model StockMovement {
  id             String         @id @default(cuid())
  materialId     String
  material       Material       @relation(fields: [materialId], references: [id])
  warehouseId    String
  warehouse      Warehouse      @relation(fields: [warehouseId], references: [id])
  type           MovementType
  quantity       Float
  reason         MovementReason
  note           String?
  transferId     String?
  voidedAt       DateTime?
  voidedById     String?
  voidReversalOf String?
  createdById    String
  createdBy      User           @relation(fields: [createdById], references: [id])
  createdAt      DateTime       @default(now())

  @@index([materialId])
  @@index([warehouseId])
  @@index([transferId])
  @@index([createdAt])
}
```

- [ ] **Step 3: Thêm warehouseId vào Stocktake**

```prisma
model Stocktake {
  id           String          @id @default(cuid())
  code         String          @unique
  status       StocktakeStatus @default(DRAFT)
  warehouseId  String
  warehouse    Warehouse       @relation(fields: [warehouseId], references: [id])
  createdById  String
  createdBy    User            @relation("created", fields: [createdById], references: [id])
  approvedById String?
  approvedBy   User?           @relation("approved", fields: [approvedById], references: [id])
  createdAt    DateTime        @default(now())
  approvedAt   DateTime?
  items        StocktakeItem[]
}
```

- [ ] **Step 4: Verify schema hợp lệ**

Run: `cd /tmp/vatlieu-kho && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Commit**

```bash
cd /tmp/vatlieu-kho && git add prisma/schema.prisma && git commit -m "feat(schema): thêm Warehouse + cột kho/transfer/void cho multi-warehouse"
```

---

## Task 2: Migration — tạo bảng + backfill Kho chính

**Files:**
- Create: `prisma/migrations/<timestamp>_multi_warehouse/migration.sql` (qua `prisma migrate dev`)

- [ ] **Step 1: Sinh migration KHÔNG áp dụng (để sửa thủ công phần backfill)**

Run: `cd /tmp/vatlieu-kho && npx prisma migrate dev --name multi_warehouse --create-only`
Expected: tạo file `prisma/migrations/<timestamp>_multi_warehouse/migration.sql` chứa CREATE TABLE Warehouse, ALTER TABLE thêm cột. Cột `warehouseId` lúc này có thể bị sinh là NOT NULL → sẽ gây lỗi vì bảng đã có dữ liệu. Cần sửa ở bước sau.

- [ ] **Step 2: Sửa migration để backfill an toàn**

Mở file migration vừa tạo. Đảm bảo thứ tự: (1) tạo bảng Warehouse, (2) thêm cột warehouseId dạng NULLABLE trước, (3) chèn Kho chính, (4) backfill, (5) set NOT NULL. Chèn/sửa khối SQL sau (đặt SAU lệnh CREATE TABLE "Warehouse"):

```sql
-- Thêm cột kho dạng nullable trước (vì bảng đã có dữ liệu)
ALTER TABLE "StockMovement" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "Stocktake" ADD COLUMN "warehouseId" TEXT;

-- Tạo Kho chính mặc định
INSERT INTO "Warehouse" ("id", "name", "code", "isDefault", "createdAt")
VALUES ('whse_default_main', 'Kho chính', 'KHO-CHINH', true, NOW());

-- Backfill toàn bộ dữ liệu cũ vào Kho chính
UPDATE "StockMovement" SET "warehouseId" = 'whse_default_main' WHERE "warehouseId" IS NULL;
UPDATE "Stocktake"     SET "warehouseId" = 'whse_default_main' WHERE "warehouseId" IS NULL;

-- Giờ mới ép NOT NULL + khóa ngoại
ALTER TABLE "StockMovement" ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "Stocktake"     ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

> Nếu Prisma đã tự sinh các lệnh ADD COLUMN/FK với NOT NULL, XÓA chúng và thay bằng khối trên. Các cột nullable khác (transferId, voidedAt, voidedById, voidReversalOf) để Prisma sinh tự nhiên (chúng nullable nên không cần backfill).

- [ ] **Step 3: Áp dụng migration**

Run: `cd /tmp/vatlieu-kho && npx prisma migrate deploy`
Expected: migration áp dụng thành công, không lỗi NULL constraint.

- [ ] **Step 4: Verify tồn kho KHÔNG đổi sau di trú**

Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT COUNT(*) AS movements_co_kho FROM \"StockMovement\" WHERE \"warehouseId\" IS NOT NULL; SELECT COUNT(*) AS movements_chua_kho FROM \"StockMovement\" WHERE \"warehouseId\" IS NULL;"`
Expected: `movements_chua_kho = 0` (mọi dòng đã có kho).

- [ ] **Step 5: Commit**

```bash
cd /tmp/vatlieu-kho && git add prisma/migrations && git commit -m "feat(db): migration multi-warehouse + backfill Kho chính cho dữ liệu cũ"
```

---

## Task 3: Logic Postgres — view current_stock theo kho + view phụ

**Files:**
- Modify: `db/postgres-logic.sql`

- [ ] **Step 1: Cập nhật view current_stock (thêm chiều kho + loại trừ void)**

Trong `db/postgres-logic.sql`, thay block `CREATE OR REPLACE VIEW current_stock` bằng:

```sql
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
```

- [ ] **Step 2: Thêm view stock_by_material (tổng tồn mỗi mã trên mọi kho)**

Thêm vào cuối `db/postgres-logic.sql`:

```sql
CREATE OR REPLACE VIEW stock_by_material AS
SELECT material_id, name, code, unit, min_stock,
       SUM(on_hand) AS total_on_hand
FROM current_stock
GROUP BY material_id, name, code, unit, min_stock;
```

- [ ] **Step 3: Cập nhật view loss_by_month (thêm kho, loại trừ void/transfer)**

Thay block `CREATE OR REPLACE VIEW loss_by_month` bằng:

```sql
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
```

> Lưu ý: TRANSFER_OUT KHÔNG nằm trong danh sách reason hao hụt → chuyển kho không bị tính là mất hàng. ✅

- [ ] **Step 4: Cập nhật trigger kiểm kê (gắn warehouseId từ phiếu)**

Thay block `CREATE OR REPLACE FUNCTION fn_apply_stocktake_adjustments` bằng:

```sql
CREATE OR REPLACE FUNCTION fn_apply_stocktake_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
    INSERT INTO "StockMovement" (id, "materialId", "warehouseId", type, quantity, reason, note, "createdById", "createdAt")
    SELECT
      gen_random_uuid()::text,
      si."materialId",
      NEW."warehouseId",
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
```

(Giữ nguyên các lệnh DROP/CREATE TRIGGER phía sau function.)

- [ ] **Step 5: Áp dụng logic SQL + verify view chạy**

Run: `cd /tmp/vatlieu-kho && npm run db:logic`
Then: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT material_id, warehouse_name, on_hand FROM current_stock WHERE on_hand <> 0 ORDER BY name LIMIT 10;"`
Expected: trả về tồn kho từng (mã × kho); với dữ liệu cũ, tất cả nằm ở "Kho chính" và khớp tồn trước đây.

- [ ] **Step 6: Đồng bộ SQL logic vào migration mới để deploy production lặp lại được**

Tạo file `prisma/migrations/<timestamp>_warehouse_logic/migration.sql` với nội dung y hệt 4 block SQL trên (giống cách migration `20260602020000_postgres_logic` đã làm). Đảm bảo idempotent (CREATE OR REPLACE / DROP IF EXISTS).

- [ ] **Step 7: Commit**

```bash
cd /tmp/vatlieu-kho && git add db/postgres-logic.sql prisma/migrations && git commit -m "feat(db): view tồn/loss theo kho + stock_by_material + trigger kiểm kê gắn kho"
```

---

## Task 4: Validation + queries kho

**Files:**
- Modify: `lib/validation.ts`
- Create: `lib/queries/warehouses.ts`
- Modify: `lib/queries/stock.ts`

- [ ] **Step 1: Thêm schema Zod + nhãn reason mới**

Trong `lib/validation.ts`, thêm:

```typescript
export const warehouseSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên kho"),
  code: z.string().min(1, "Vui lòng nhập mã kho").regex(/^[A-Za-z0-9-]+$/, "Mã kho chỉ gồm chữ, số, gạch ngang"),
});

export const transferSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  fromWarehouseId: z.string().min(1, "Vui lòng chọn kho nguồn"),
  toWarehouseId: z.string().min(1, "Vui lòng chọn kho đích"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().optional(),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
  message: "Kho nguồn và kho đích phải khác nhau",
  path: ["toWarehouseId"],
});

export const voidSchema = z.object({
  movementId: z.string().optional(),
  stocktakeId: z.string().optional(),
  reason: z.string().min(1, "Vui lòng nhập lý do hủy"),
});
```

Cập nhật `REASON_LABELS` (thêm khóa mới):
```typescript
// thêm vào object REASON_LABELS hiện có:
TRANSFER_OUT: "Chuyển kho (đi)",
TRANSFER_IN: "Chuyển kho (đến)",
VOID: "Hủy chứng từ",
```

- [ ] **Step 2: Tạo query đọc danh sách kho**

Create `lib/queries/warehouses.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
}

export async function getDefaultWarehouse() {
  return prisma.warehouse.findFirst({ where: { isDefault: true } });
}
```

- [ ] **Step 3: Cập nhật getCurrentStock + getOnHand theo kho**

Trong `lib/queries/stock.ts`, sửa interface `CurrentStockRow` thêm `warehouse_id` và `warehouse_name`, và sửa 2 hàm:

```typescript
export interface CurrentStockRow {
  material_id: string;
  name: string;
  code: string;
  unit: string;
  min_stock: number;
  warehouse_id: string;
  warehouse_name: string;
  on_hand: number;
  status: StockStatus;
}

/** Tồn hiện tại. Nếu truyền warehouseId thì lọc theo kho; không thì gộp mọi kho theo mã. */
export async function getCurrentStock(warehouseId?: string): Promise<CurrentStockRow[]> {
  if (warehouseId) {
    const rows = await prisma.$queryRaw<CurrentStockRow[]>`
      SELECT material_id, name, code, unit, min_stock, warehouse_id, warehouse_name, on_hand, status
      FROM current_stock
      WHERE warehouse_id = ${warehouseId} AND on_hand <> 0
      ORDER BY CASE status WHEN 'OUT' THEN 0 WHEN 'LOW' THEN 1 ELSE 2 END, name`;
    return rows.map((r) => ({ ...r, min_stock: Number(r.min_stock), on_hand: Number(r.on_hand) }));
  }
  // Gộp mọi kho: dùng stock_by_material, nhưng vẫn trả shape tương thích (warehouse_* để rỗng)
  const rows = await prisma.$queryRaw<Array<{ material_id: string; name: string; code: string; unit: string; min_stock: number; total_on_hand: number }>>`
    SELECT material_id, name, code, unit, min_stock, total_on_hand FROM stock_by_material
    WHERE total_on_hand <> 0 ORDER BY name`;
  return rows.map((r) => ({
    material_id: r.material_id, name: r.name, code: r.code, unit: r.unit,
    min_stock: Number(r.min_stock), warehouse_id: "", warehouse_name: "Tất cả kho",
    on_hand: Number(r.total_on_hand),
    status: Number(r.total_on_hand) <= 0 ? "OUT" : Number(r.total_on_hand) <= Number(r.min_stock) ? "LOW" : "OK",
  }));
}

/** Tồn của 1 vật liệu tại 1 kho cụ thể (kiểm tra trước khi xuất/chuyển). */
export async function getOnHand(materialId: string, warehouseId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ on_hand: number }[]>`
    SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${warehouseId}`;
  return rows.length ? Number(rows[0].on_hand) : 0;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: exit 0 (lưu ý: các nơi gọi getOnHand/getCurrentStock cũ sẽ báo lỗi thiếu tham số — sẽ sửa ở Task 6/7; nếu muốn pass ngay, tạm sửa caller ở các task tương ứng. Ghi nhận lỗi, tiếp tục.)

- [ ] **Step 5: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/validation.ts lib/queries/warehouses.ts lib/queries/stock.ts && git commit -m "feat(lib): validation + query kho, getCurrentStock/getOnHand theo kho"
```

---

## Task 5: Quản lý kho (Danh mục) + đếm số mã vật tư

**Files:**
- Create: `lib/actions/warehouses.ts`
- Create: `components/warehouse-manager.tsx`
- Modify: `components/material-manager.tsx`
- Modify: `app/(app)/vat-lieu/page.tsx`

- [ ] **Step 1: Server actions CRUD kho**

Create `lib/actions/warehouses.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { warehouseSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createWarehouse(formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), code: formData.get("code") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const existing = await prisma.warehouse.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false, error: `Mã kho "${parsed.data.code}" đã tồn tại.` };
  await prisma.warehouse.create({ data: parsed.data });
  revalidatePath("/vat-lieu");
  return { ok: true };
}

export async function updateWarehouse(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), code: formData.get("code") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const dup = await prisma.warehouse.findFirst({ where: { code: parsed.data.code, NOT: { id } } });
  if (dup) return { ok: false, error: `Mã kho "${parsed.data.code}" đã được dùng.` };
  await prisma.warehouse.update({ where: { id }, data: parsed.data });
  revalidatePath("/vat-lieu");
  return { ok: true };
}
```

- [ ] **Step 2: Component quản lý kho**

Create `components/warehouse-manager.tsx` — theo CÙNG mẫu `material-manager.tsx` hiện có (Card + bảng + Dialog thêm/sửa). Bảng cột: Tên kho, Mã, Mặc định (badge nếu isDefault), Hành động (nút Sửa cho OWNER). Form Dialog 2 trường: name, code. Gọi `createWarehouse`/`updateWarehouse`. Bọc bảng trong `<div className="overflow-x-auto">`. Props: `{ warehouses: { id: string; name: string; code: string; isDefault: boolean }[] }`.

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWarehouse, updateWarehouse } from "@/lib/actions/warehouses";
import { toast } from "sonner";

interface Warehouse { id: string; name: string; code: string; isDefault: boolean; }

export function WarehouseManager({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Warehouse | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing ? await updateWarehouse(editing.id, fd) : await createWarehouse(fd);
      if (res.ok) { toast.success(editing ? "Đã cập nhật kho" : "Đã thêm kho"); setOpen(false); setEditing(null); router.refresh(); }
      else toast.error(res.error || "Có lỗi xảy ra");
    });
  };

  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Danh sách kho</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setEditing(null)}>+ Thêm kho</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Sửa kho" : "Thêm kho"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="wname">Tên kho</Label><Input id="wname" name="name" defaultValue={editing?.name} required /></div>
              <div className="space-y-2"><Label htmlFor="wcode">Mã kho</Label><Input id="wcode" name="code" defaultValue={editing?.code} required /></div>
              <Button type="submit" disabled={pending} className="w-full">{pending ? "Đang lưu..." : "Lưu"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Tên kho</TableHead><TableHead>Mã</TableHead><TableHead>Mặc định</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
            <TableBody>
              {warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-semibold">{w.name}</TableCell>
                  <TableCell className="font-mono text-xs">{w.code}</TableCell>
                  <TableCell>{w.isDefault && <Badge className="bg-blue-500/10 text-blue-600 border-transparent">Mặc định</Badge>}</TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setEditing(w); setOpen(true); }}>Sửa</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Thêm số đếm mã vật tư + nhúng WarehouseManager vào trang Danh mục**

Trong `components/material-manager.tsx`, thêm badge tổng số mã ở header bảng vật tư: ngay cạnh tiêu đề bảng, thêm `<span className="text-sm text-muted-foreground">({materials.length} mã)</span>`.

Trong `app/(app)/vat-lieu/page.tsx`, đọc thêm kho và render WarehouseManager dưới MaterialManager:

```tsx
import { getWarehouses } from "@/lib/queries/warehouses";
import { WarehouseManager } from "@/components/warehouse-manager";
// trong component (async):
const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
// trong JSX, sau <MaterialManager .../>:
<WarehouseManager warehouses={warehouses} />
```

- [ ] **Step 4: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: typecheck exit 0, build thành công.

- [ ] **Step 5: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/actions/warehouses.ts components/warehouse-manager.tsx components/material-manager.tsx "app/(app)/vat-lieu/page.tsx" && git commit -m "feat(danh-muc): quản lý kho + đếm số mã vật tư"
```

---

## Task 6: Dropdown chọn mã có lọc + chọn kho (component dùng chung)

**Files:**
- Create: `components/searchable-material-select.tsx`
- Create: `components/warehouse-select.tsx`

- [ ] **Step 1: Dropdown chọn mã vật tư có ô lọc tìm nhanh**

Create `components/searchable-material-select.tsx`. Dùng `Select` của shadcn nhưng thêm ô Input lọc ở đầu `SelectContent`. Lọc theo tên hoặc mã (không phân biệt hoa thường). Hiển thị tên đã chọn qua children của `SelectValue` (theo bài học lỗi #7 — không để SelectValue rỗng).

```tsx
"use client";
import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Material { id: string; name: string; code: string; unit: string; }

export function SearchableMaterialSelect({
  materials, name, value, onChange,
}: { materials: Material[]; name: string; value: string; onChange: (v: string) => void; }) {
  const [filter, setFilter] = React.useState("");
  const selected = materials.find((m) => m.id === value);
  const q = filter.trim().toLowerCase();
  const list = q ? materials.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) : materials;

  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Chọn vật tư...">{selected ? `${selected.name} (${selected.code})` : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 sticky top-0 bg-popover z-10">
            <Input autoFocus placeholder="Gõ để tìm mã/tên..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9" />
          </div>
          {list.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>))}
          {list.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy</div>}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
```

- [ ] **Step 2: Dropdown chọn kho**

Create `components/warehouse-select.tsx`:

```tsx
"use client";
import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Warehouse { id: string; name: string; code: string; }

export function WarehouseSelect({
  warehouses, name, value, onChange, placeholder = "Chọn kho...",
}: { warehouses: Warehouse[]; name: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const selected = warehouses.find((w) => w.id === value);
  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder={placeholder}>{selected ? selected.name : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /tmp/vatlieu-kho && git add components/searchable-material-select.tsx components/warehouse-select.tsx && git commit -m "feat(ui): dropdown chọn mã có lọc + dropdown chọn kho"
```

---

## Task 7: Nhập/Xuất theo kho + đơn vị hiển thị

**Files:**
- Modify: `lib/actions/movements.ts`
- Modify: `components/import-form.tsx`
- Modify: `components/export-form.tsx`
- Modify: `app/(app)/nhap/page.tsx`, `app/(app)/xuat/page.tsx`

- [ ] **Step 1: Action nhập/xuất nhận warehouseId**

Trong `lib/validation.ts`, thêm `warehouseId` vào `importSchema` và `exportSchema`:
```typescript
// trong importSchema và exportSchema, thêm trường:
warehouseId: z.string().min(1, "Vui lòng chọn kho"),
```

Trong `lib/actions/movements.ts`:
- `createImport`: đọc `warehouseId` từ formData, lưu vào StockMovement `data: { ..., warehouseId }`.
- `createExport`: đọc `warehouseId`, kiểm tra tồn bằng `getOnHand(materialId, warehouseId)` trước khi cho xuất; nếu `quantity > onHand` trả `{ ok:false, error:"Không đủ tồn tại kho này (còn X)" }`. Lưu movement kèm `warehouseId`.

```typescript
// ví dụ createExport (rút gọn — giữ cấu trúc hiện có, thêm phần kho):
const warehouseId = formData.get("warehouseId") as string;
// ...sau khi parse quantity & materialId hợp lệ:
const onHand = await getOnHand(parsed.data.materialId, warehouseId);
if (parsed.data.quantity > onHand) {
  return { ok: false, error: `Không đủ tồn tại kho này (còn ${onHand})` };
}
await prisma.stockMovement.create({ data: { ...parsed.data, warehouseId, type: "OUT", createdById: user.id } });
```
(import `getOnHand` từ `@/lib/queries/stock`.)

- [ ] **Step 2: Form nhập — thêm kho, đơn vị, dropdown lọc**

Trong `components/import-form.tsx`:
- Đổi import từ `MaterialSelect` sang `SearchableMaterialSelect`.
- Thêm props `warehouses` + state `warehouseId` (mặc định = kho isDefault).
- Thêm khối chọn kho (dùng `WarehouseSelect`) phía trên hoặc cạnh ô vật tư.
- Hiển thị đơn vị: tìm material theo materialId, render `<span>` đơn vị cạnh ô số lượng (chỉ đọc). Ví dụ: `{selectedMaterial ? selectedMaterial.unit : ""}`.
- Validate trước submit: nếu chưa chọn kho → toast "Vui lòng chọn kho".

- [ ] **Step 3: Form xuất — tương tự nhập**

Trong `components/export-form.tsx`: làm y như Step 2 (kho + đơn vị + SearchableMaterialSelect). Giữ phần chọn lý do xuất hiện có.

- [ ] **Step 4: Trang nhập/xuất truyền danh sách kho**

Trong `app/(app)/nhap/page.tsx` và `app/(app)/xuat/page.tsx`: đọc thêm `getWarehouses()` (Promise.all với getMaterials) và truyền `warehouses` vào form.

```tsx
import { getWarehouses } from "@/lib/queries/warehouses";
const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
// <ImportForm materials={materials} warehouses={warehouses} />
```

- [ ] **Step 5: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 6: Verify thủ công — nhập rồi kiểm tồn theo kho**

Chạy app local (`npm run dev`), đăng nhập, Nhập 10 đơn vị một mã vào "Kho chính". Sau đó:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT name, warehouse_name, on_hand FROM current_stock WHERE code='<mã vừa nhập>' AND on_hand<>0;"`
Expected: tồn của mã đó tại Kho chính tăng đúng 10.

- [ ] **Step 7: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/validation.ts lib/actions/movements.ts components/import-form.tsx components/export-form.tsx "app/(app)/nhap/page.tsx" "app/(app)/xuat/page.tsx" && git commit -m "feat(nhap-xuat): chọn kho + hiển thị đơn vị + dropdown lọc mã, kiểm tồn theo kho khi xuất"
```

---

## Task 8: Chuyển kho

**Files:**
- Create: `lib/actions/transfer.ts`
- Create: `components/transfer-form.tsx`
- Create: `app/(app)/chuyen-kho/page.tsx`
- Modify: `components/nav.tsx`

- [ ] **Step 1: Server action chuyển kho (cặp OUT+IN trong 1 transaction)**

Create `lib/actions/transfer.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { transferSchema } from "@/lib/validation";
import { getOnHand } from "@/lib/queries/stock";
import type { ActionResult } from "@/lib/actions/movements";

export async function createTransfer(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = transferSchema.safeParse({
    materialId: formData.get("materialId"),
    fromWarehouseId: formData.get("fromWarehouseId"),
    toWarehouseId: formData.get("toWarehouseId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const onHand = await getOnHand(parsed.data.materialId, parsed.data.fromWarehouseId);
  if (parsed.data.quantity > onHand) return { ok: false, error: `Kho nguồn không đủ tồn (còn ${onHand})` };

  const transferId = randomUUID();
  await prisma.$transaction([
    prisma.stockMovement.create({ data: {
      materialId: parsed.data.materialId, warehouseId: parsed.data.fromWarehouseId,
      type: "OUT", quantity: parsed.data.quantity, reason: "TRANSFER_OUT",
      note: parsed.data.note, transferId, createdById: user.id,
    }}),
    prisma.stockMovement.create({ data: {
      materialId: parsed.data.materialId, warehouseId: parsed.data.toWarehouseId,
      type: "IN", quantity: parsed.data.quantity, reason: "TRANSFER_IN",
      note: parsed.data.note, transferId, createdById: user.id,
    }}),
  ]);
  revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/chuyen-kho");
  return { ok: true };
}
```

- [ ] **Step 2: Form chuyển kho**

Create `components/transfer-form.tsx` — theo mẫu `export-form.tsx`. Trường: SearchableMaterialSelect (materialId), WarehouseSelect (fromWarehouseId, placeholder "Kho nguồn..."), WarehouseSelect (toWarehouseId, placeholder "Kho đích..."), Input số lượng + đơn vị hiển thị, Input ghi chú. Validate client: 3 trường bắt buộc + nguồn≠đích. Gọi `createTransfer`, toast, `router.push("/")`. Props: `{ materials, warehouses }`.

- [ ] **Step 3: Trang chuyển kho**

Create `app/(app)/chuyen-kho/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { TransferForm } from "@/components/transfer-form";

export default async function ChuyenKhoPage() {
  await requireUser();
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return <TransferForm materials={materials} warehouses={warehouses} />;
}
```

- [ ] **Step 4: Thêm link Chuyển kho vào nav**

Trong `components/nav.tsx`, thêm vào mảng `links` (sau Kiểm kê):
```tsx
{ href: "/chuyen-kho", label: "Chuyển kho", icon: ArrowLeftRight, roles: ["OWNER", "STAFF"] },
```
Import icon: `import { ArrowLeftRight } from "lucide-react";`

- [ ] **Step 5: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 6: Verify thủ công — chuyển kho cân bằng**

Tạo kho thứ 2 ("Kho công trình A"). Chuyển 5 đơn vị một mã từ Kho chính sang Kho công trình A. Sau đó:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT warehouse_name, on_hand FROM current_stock WHERE code='<mã>' AND on_hand<>0; SELECT total_on_hand FROM stock_by_material WHERE code='<mã>';"`
Expected: Kho chính giảm 5, Kho công trình A tăng 5, **tổng (total_on_hand) KHÔNG đổi**.

- [ ] **Step 7: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/actions/transfer.ts components/transfer-form.tsx "app/(app)/chuyen-kho/page.tsx" components/nav.tsx && git commit -m "feat(chuyen-kho): chuyển vật tư giữa kho (cặp OUT+IN cân bằng)"
```

---

## Task 9: Kiểm kê theo kho

**Files:**
- Modify: `lib/actions/stocktake.ts`
- Modify: `components/new-stocktake-button.tsx`
- Modify: `lib/queries/stocktake.ts`

- [ ] **Step 1: Tạo phiếu kiểm kê gắn warehouseId**

Trong `lib/actions/stocktake.ts`, hàm tạo phiếu: đọc `warehouseId` từ formData, lưu vào `Stocktake.warehouseId`. Khi sinh `StocktakeItem`, `systemQty` phải lấy tồn của (mã × kho đó) qua `getOnHand(materialId, warehouseId)` thay vì tồn toàn hệ thống.

- [ ] **Step 2: Nút tạo phiếu cho chọn kho**

Trong `components/new-stocktake-button.tsx`: thêm WarehouseSelect vào dialog/flow tạo phiếu (nhận props `warehouses`). Trang `app/(app)/kiem-ke/page.tsx` truyền `getWarehouses()` xuống.

- [ ] **Step 3: Hiển thị kho trong danh sách + chi tiết phiếu**

Trong `lib/queries/stocktake.ts`, `listStocktakes` include `warehouse: { select: { name: true } }`. Hiển thị tên kho ở danh sách phiếu (`app/(app)/kiem-ke/page.tsx`) và đầu trang chi tiết (`app/(app)/kiem-ke/[id]/page.tsx`).

- [ ] **Step 4: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 5: Verify thủ công — duyệt phiếu sinh điều chỉnh đúng kho**

Tạo phiếu kiểm kê cho "Kho công trình A", sửa countedQty lệch systemQty một mã, duyệt phiếu. Sau đó:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT reason, type, quantity, \"warehouseId\" FROM \"StockMovement\" WHERE reason='STOCKTAKE_ADJUST' ORDER BY \"createdAt\" DESC LIMIT 3;"`
Expected: movement điều chỉnh có `warehouseId` = id Kho công trình A (không phải Kho chính).

- [ ] **Step 6: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/actions/stocktake.ts components/new-stocktake-button.tsx lib/queries/stocktake.ts "app/(app)/kiem-ke/page.tsx" "app/(app)/kiem-ke/[id]/page.tsx" && git commit -m "feat(kiem-ke): kiểm kê theo từng kho, điều chỉnh sinh đúng kho"
```

---

## Task 10: Hủy chứng từ (bút toán đảo)

**Files:**
- Create: `lib/actions/void.ts`
- Modify: `lib/queries/history.ts`
- Modify: `components/history-table.tsx`

- [ ] **Step 1: Server action hủy chứng từ**

Create `lib/actions/void.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { voidSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

/** Hủy 1 movement (hoặc cả cặp chuyển kho) bằng cách đánh cờ voidedAt + ghi 1 dòng VOID lưu vết. */
export async function voidMovement(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  const parsed = voidSchema.safeParse({ movementId: formData.get("movementId"), reason: formData.get("reason") });
  if (!parsed.success || !parsed.data.movementId) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Thiếu chứng từ" };

  const mv = await prisma.stockMovement.findUnique({ where: { id: parsed.data.movementId } });
  if (!mv) return { ok: false, error: "Không tìm thấy chứng từ" };
  if (mv.voidedAt) return { ok: false, error: "Chứng từ này đã được hủy trước đó" };

  // Nếu là chuyển kho → hủy cả cặp (cùng transferId)
  const targets = mv.transferId
    ? await prisma.stockMovement.findMany({ where: { transferId: mv.transferId, voidedAt: null } })
    : [mv];

  await prisma.$transaction([
    prisma.stockMovement.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { voidedAt: new Date(), voidedById: user.id },
    }),
    // ghi dòng VOID lưu vết cho từng dòng gốc (ngược type, KHÔNG tính tồn vì view loại reason='VOID')
    ...targets.map((t) => prisma.stockMovement.create({ data: {
      materialId: t.materialId, warehouseId: t.warehouseId,
      type: t.type === "IN" ? "OUT" : "IN", quantity: t.quantity,
      reason: "VOID", note: `Hủy chứng từ: ${parsed.data.reason}`,
      voidReversalOf: t.id, createdById: user.id,
    }})),
  ]);
  revalidatePath("/"); revalidatePath("/lich-su");
  return { ok: true };
}
```

- [ ] **Step 2: Nhật ký kèm cờ hủy**

Trong `lib/queries/history.ts`, `getHistory` select thêm `voidedAt`, `reason`, `warehouse: { select: { name: true } }`. Trả về để bảng hiển thị trạng thái.

- [ ] **Step 3: Nút hủy trong bảng lịch sử (chỉ OWNER)**

Trong `components/history-table.tsx`:
- Thêm cột "Kho" (hiển thị `row.warehouse?.name`).
- Thêm prop `isOwner: boolean`. Nếu `isOwner` và dòng chưa hủy → hiện nút "Hủy" mở Dialog nhập lý do, gọi `voidMovement`.
- Dòng đã hủy (`voidedAt != null`): hiển thị mờ + gạch ngang + badge "Đã hủy". Dòng reason=VOID: badge "Bút toán hủy".
- Trang `app/(app)/lich-su/page.tsx` truyền `isOwner={user.role === "OWNER"}`.

- [ ] **Step 4: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 5: Verify thủ công — hủy phục hồi tồn, không hủy 2 lần**

Nhập 7 đơn vị một mã vào Kho chính → ghi nhớ tồn. Vào Lịch sử (đăng nhập OWNER), bấm Hủy dòng nhập đó, nhập lý do "nhập trùng". Sau đó:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT on_hand FROM current_stock WHERE code='<mã>' AND warehouse_name='Kho chính'; SELECT reason, \"voidedAt\" IS NOT NULL AS da_huy FROM \"StockMovement\" WHERE code IS NULL;"`
Expected: tồn trở về như trước khi nhập (giảm đúng 7); dòng gốc có `voidedAt`; có 1 dòng reason=VOID. Bấm Hủy lần 2 trên cùng dòng → báo lỗi "đã được hủy trước đó".

- [ ] **Step 6: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/actions/void.ts lib/queries/history.ts components/history-table.tsx "app/(app)/lich-su/page.tsx" && git commit -m "feat(huy-chung-tu): hủy nhập/xuất/chuyển kho bằng bút toán đảo, giữ dấu vết audit"
```

---

## Task 11: Hủy phiếu kiểm kê đã duyệt

**Files:**
- Modify: `lib/actions/void.ts`
- Modify: `components/stocktake-detail.tsx`

- [ ] **Step 1: Action hủy phiếu kiểm kê**

Trong `lib/actions/void.ts`, thêm:

```typescript
/** Hủy phiếu kiểm kê đã duyệt: đảo các STOCKTAKE_ADJUST nó sinh ra + đánh dấu phiếu VOIDED. */
export async function voidStocktake(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  const stocktakeId = formData.get("stocktakeId") as string;
  const reason = formData.get("reason") as string;
  if (!stocktakeId) return { ok: false, error: "Thiếu phiếu kiểm kê" };
  if (!reason?.trim()) return { ok: false, error: "Vui lòng nhập lý do hủy" };

  const st = await prisma.stocktake.findUnique({ where: { id: stocktakeId } });
  if (!st) return { ok: false, error: "Không tìm thấy phiếu" };
  if (st.status === "VOIDED") return { ok: false, error: "Phiếu đã bị hủy" };
  if (st.status !== "APPROVED") return { ok: false, error: "Chỉ hủy được phiếu đã duyệt" };

  // các movement điều chỉnh sinh từ phiếu này = STOCKTAKE_ADJUST có note chứa mã phiếu, chưa void
  const adjusts = await prisma.stockMovement.findMany({
    where: { reason: "STOCKTAKE_ADJUST", note: { contains: st.code }, voidedAt: null },
  });
  await prisma.$transaction([
    prisma.stockMovement.updateMany({ where: { id: { in: adjusts.map((a) => a.id) } }, data: { voidedAt: new Date(), voidedById: user.id } }),
    ...adjusts.map((a) => prisma.stockMovement.create({ data: {
      materialId: a.materialId, warehouseId: a.warehouseId,
      type: a.type === "IN" ? "OUT" : "IN", quantity: a.quantity,
      reason: "VOID", note: `Hủy kiểm kê ${st.code}: ${reason}`, voidReversalOf: a.id, createdById: user.id,
    }})),
    prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: "VOIDED" } }),
  ]);
  revalidatePath("/"); revalidatePath("/kiem-ke"); revalidatePath(`/kiem-ke/${stocktakeId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Nút hủy phiếu trong chi tiết kiểm kê (OWNER, phiếu APPROVED)**

Trong `components/stocktake-detail.tsx`: nếu `isOwner` và `status === "APPROVED"` → nút "Hủy phiếu" mở Dialog nhập lý do gọi `voidStocktake`. Nếu `status === "VOIDED"` → badge "Đã hủy", ẩn nút duyệt/sửa.

- [ ] **Step 3: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 4: Verify thủ công — hủy phiếu phục hồi tồn**

Dùng phiếu đã duyệt ở Task 9 (đã sinh điều chỉnh). Hủy phiếu, nhập lý do. Sau đó:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT status FROM \"Stocktake\" ORDER BY \"createdAt\" DESC LIMIT 1; SELECT on_hand FROM current_stock WHERE code='<mã đã điều chỉnh>' AND warehouse_name='Kho công trình A';"`
Expected: phiếu status=VOIDED; tồn của mã quay về như trước khi duyệt phiếu.

- [ ] **Step 5: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/actions/void.ts components/stocktake-detail.tsx && git commit -m "feat(huy-kiem-ke): hủy phiếu kiểm kê đã duyệt, đảo điều chỉnh + đánh dấu VOIDED"
```

---

## Task 12: Báo cáo cân đối Đầu kỳ–Nhập–Xuất–Tồn theo kỳ & kho

**Files:**
- Create: `lib/queries/balance.ts`
- Create: `components/balance-report.tsx`
- Modify: `app/(app)/bao-cao/page.tsx`

- [ ] **Step 1: Query cân đối theo kỳ + kho (dùng `Prisma.sql`, KHÔNG nội suy chuỗi)**

Create `lib/queries/balance.ts`. Điều kiện lọc kho ghép an toàn bằng `Prisma.sql`/`Prisma.empty`; mọi tham số `from`/`to`/`warehouseId` truyền qua placeholder `${}` (chống SQL injection):

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface BalanceRow {
  material_id: string; name: string; code: string; unit: string;
  opening: number; in_qty: number; out_qty: number;
  transfer_in: number; transfer_out: number; closing: number;
}

function buildQuery(from: string, to: string, whFilter: Prisma.Sql) {
  return Prisma.sql`
    WITH base AS (
      SELECT sm."materialId" AS material_id, m.name, m.code, m.unit, sm.reason, sm.type, sm.quantity, sm."createdAt",
        (CASE sm.type WHEN 'IN' THEN sm.quantity ELSE -sm.quantity END) AS signed,
        (sm."createdAt" >= ${from}::timestamp AND sm."createdAt" < ${to}::timestamp + INTERVAL '1 day') AS in_period
      FROM "StockMovement" sm
      JOIN "Material" m ON m.id = sm."materialId"
      WHERE sm."voidedAt" IS NULL AND sm.reason <> 'VOID' ${whFilter}
    )
    SELECT material_id, name, code, unit,
      COALESCE(SUM(CASE WHEN "createdAt" < ${from}::timestamp THEN signed ELSE 0 END),0) AS opening,
      COALESCE(SUM(CASE WHEN in_period AND type='IN' AND reason='PURCHASE' THEN quantity ELSE 0 END),0) AS in_qty,
      COALESCE(SUM(CASE WHEN in_period AND type='OUT' AND reason NOT IN ('TRANSFER_OUT') THEN quantity ELSE 0 END),0) AS out_qty,
      COALESCE(SUM(CASE WHEN in_period AND reason='TRANSFER_IN' THEN quantity ELSE 0 END),0) AS transfer_in,
      COALESCE(SUM(CASE WHEN in_period AND reason='TRANSFER_OUT' THEN quantity ELSE 0 END),0) AS transfer_out,
      COALESCE(SUM(CASE WHEN "createdAt" < ${to}::timestamp + INTERVAL '1 day' THEN signed ELSE 0 END),0) AS closing
    FROM base
    GROUP BY material_id, name, code, unit
    HAVING COALESCE(SUM(CASE WHEN "createdAt" < ${to}::timestamp + INTERVAL '1 day' THEN signed ELSE 0 END),0) <> 0
        OR COALESCE(SUM(CASE WHEN in_period THEN 1 ELSE 0 END),0) > 0
    ORDER BY name`;
}

export async function getBalanceReport(from: string, to: string, warehouseId?: string): Promise<BalanceRow[]> {
  const whFilter = warehouseId ? Prisma.sql`AND sm."warehouseId" = ${warehouseId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<BalanceRow[]>(buildQuery(from, to, whFilter));
  return rows.map((r) => ({
    ...r, opening: Number(r.opening), in_qty: Number(r.in_qty), out_qty: Number(r.out_qty),
    transfer_in: Number(r.transfer_in), transfer_out: Number(r.transfer_out), closing: Number(r.closing),
  }));
}
```

> Định nghĩa "Nhập trong kỳ" = chỉ reason PURCHASE (mua thật). "Xuất trong kỳ" = mọi OUT trừ TRANSFER_OUT (gồm cả hao hụt & điều chỉnh — vì đó là hàng rời kho thật). transfer_in/out tách riêng. closing = signed lũy kế tới hết "đến ngày" (đã loại void & transfer-neutral vì transfer cân nhau toàn hệ thống nhưng theo từng kho thì signed đã phản ánh đúng). opening = signed lũy kế trước "từ ngày". Quan hệ: closing = opening + (Σ signed trong kỳ) — luôn cân.

- [ ] **Step 2: Component bảng cân đối + nút hiện chuyển kho + drill-down**

Create `components/balance-report.tsx` (client component):
- Props: `{ rows: BalanceRow[]; warehouses: Warehouse[] }`.
- State: `from`, `to` (mặc định đầu tháng → hôm nay), `warehouseId` ("" = tất cả), `showTransfer` (false), `expandedCode` (drill-down).
- Form lọc: 2 input `type="date"` (từ/đến) + WarehouseSelect (thêm option "Tất cả kho") + nút "Xem".
- Khi đổi filter → điều hướng tới `/bao-cao?from=...&to=...&wh=...` (server đọc lại). Hoặc dùng router.push với searchParams.
- Bảng: cột Mã | Tên | Đầu kỳ | Nhập | Xuất | Tồn cuối. Khi `showTransfer` bật → chèn 2 cột "Chuyển đến" / "Chuyển đi" giữa Xuất và Tồn cuối.
- Nút toggle "Hiện chuyển kho" / "Ẩn chuyển kho".
- Click 1 dòng → toggle `expandedCode`; khi mở, fetch nhật ký chi tiết của mã đó (gọi server action/route trả movement theo mã+kỳ+kho) hiển thị inline.
- Tất cả số format `toLocaleString("vi-VN")`. Bọc bảng `overflow-x-auto`.

- [ ] **Step 3: Drill-down query nhật ký theo mã**

Trong `lib/queries/balance.ts`, thêm:

```typescript
export async function getMaterialLedger(materialId: string, from: string, to: string, warehouseId?: string) {
  const whFilter = warehouseId ? Prisma.sql`AND sm."warehouseId" = ${warehouseId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<Array<{ created_at: Date; type: string; reason: string; quantity: number; warehouse_name: string; note: string | null; voided: boolean }>>(Prisma.sql`
    SELECT sm."createdAt" AS created_at, sm.type, sm.reason, sm.quantity,
           w.name AS warehouse_name, sm.note, (sm."voidedAt" IS NOT NULL) AS voided
    FROM "StockMovement" sm JOIN "Warehouse" w ON w.id = sm."warehouseId"
    WHERE sm."materialId" = ${materialId}
      AND sm."createdAt" >= ${from}::timestamp AND sm."createdAt" < ${to}::timestamp + INTERVAL '1 day'
      ${whFilter}
    ORDER BY sm."createdAt"`);
  return rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
}
```

Tạo route `app/api/ledger/route.ts` (GET, query params materialId/from/to/wh, requireUser) gọi `getMaterialLedger` trả JSON — để client drill-down fetch. (Theo mẫu `app/api/ping/route.ts`.)

- [ ] **Step 4: Nhúng vào trang báo cáo**

Trong `app/(app)/bao-cao/page.tsx`: đọc `searchParams` (from/to/wh), gọi `getBalanceReport` + `getWarehouses`, render `<BalanceReport rows={...} warehouses={...} />` BÊN CẠNH (không thay thế) phần biểu đồ hao hụt hiện có. Đặt báo cáo cân đối ở trên cùng (vì là tính năng chính khách yêu cầu), biểu đồ hao hụt giữ nguyên bên dưới.

- [ ] **Step 5: Verify typecheck + build**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run build`
Expected: exit 0, build OK.

- [ ] **Step 6: Verify thủ công — báo cáo cân**

Chọn kỳ bao trùm các giao dịch đã tạo ở các task trước, kho = Kho chính. Kiểm tra với 1 mã:
Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "SELECT * FROM current_stock WHERE code='<mã>' AND warehouse_name='Kho chính';"`
Expected: cột "Tồn cuối" trong báo cáo (đến hôm nay) = `on_hand` trong current_stock. Và Đầu kỳ + Nhập + Chuyển đến − Xuất − Chuyển đi = Tồn cuối (bật cột chuyển kho để đối chiếu).

- [ ] **Step 7: Commit**

```bash
cd /tmp/vatlieu-kho && git add lib/queries/balance.ts components/balance-report.tsx "app/(app)/bao-cao/page.tsx" app/api/ledger/route.ts && git commit -m "feat(bao-cao): cân đối Đầu kỳ-Nhập-Xuất-Tồn theo kỳ/kho + cột chuyển kho ẩn + drill-down nhật ký"
```

---

## Task 13: Cập nhật seed + dashboard tồn theo kho + kiểm thử tổng thể

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Seed có kho**

Trong `prisma/seed.ts`: tạo 2 kho ("Kho chính" isDefault + "Kho công trình A"). Mọi `StockMovement` seed gắn `warehouseId` Kho chính. Thêm vài movement TRANSFER (cặp) để demo chuyển kho. Stocktake seed (nếu có) gắn warehouseId.

- [ ] **Step 2: Dashboard hiển thị tồn — chọn xem theo kho hoặc tổng**

Trong `app/(app)/page.tsx`: bảng tồn hiện tại đang gọi `getCurrentStock()`. Giữ mặc định = tổng mọi kho (gọi `getCurrentStock()` không tham số → dùng stock_by_material). Thêm WarehouseSelect nhỏ phía trên bảng để lọc theo kho (tùy chọn, gọi lại với searchParam). Cột thêm "Kho" khi xem tổng-theo-kho. Giữ giao diện gọn: mặc định không chọn kho = xem tổng.

- [ ] **Step 3: Reset DB local + seed lại để kiểm thử sạch**

Run: `cd /tmp/vatlieu-kho && npm run db:logic && npm run db:seed`
(Nếu cần reset hẳn: `npx prisma migrate reset --force` rồi `npm run db:setup` — lưu ý cơ chế consent, có thể chạy seed trực tiếp `tsx prisma/seed.ts`.)
Expected: seed chạy không lỗi, có 2 kho.

- [ ] **Step 4: Kiểm thử tổng thể (full regression thủ công)**

Chạy `npm run dev`, lần lượt:
1. Đăng nhập OWNER → Danh mục: thấy 2 kho + số đếm mã. ✅
2. Nhập 1 mã vào Kho công trình A → Dashboard (lọc kho đó) thấy tồn. ✅
3. Xuất quá tồn ở 1 kho → bị chặn báo "không đủ tồn". ✅
4. Chuyển kho A→B → tổng không đổi (kiểm psql stock_by_material). ✅
5. Tạo + duyệt kiểm kê cho 1 kho → điều chỉnh đúng kho. ✅
6. Lịch sử: Hủy 1 chứng từ → tồn phục hồi, dòng "Đã hủy" + "Bút toán hủy". ✅
7. Báo cáo: chọn kỳ + kho → bảng cân đối cân; bật cột chuyển kho; click mã → nhật ký chi tiết. ✅
8. Đăng nhập STAFF → KHÔNG thấy nút Hủy, KHÔNG vào được Danh mục/Báo cáo. ✅

- [ ] **Step 5: Verify typecheck + build + lint cuối**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run lint && npm run build`
Expected: tất cả sạch.

- [ ] **Step 6: Commit + deploy**

```bash
cd /tmp/vatlieu-kho && git add prisma/seed.ts "app/(app)/page.tsx" && git commit -m "feat(seed+dashboard): seed đa kho + dashboard tồn theo kho; hoàn tất multi-warehouse"
git push origin HEAD
```
Sau đó deploy production: `vercel --prod --yes` rồi trỏ alias. Migration tự chạy qua `vercel-build` (prisma migrate deploy). Kiểm tra `/api/ping` 200 và dữ liệu cũ vẫn nguyên (Kho chính).

---

## Ghi chú triển khai production (quan trọng)

- Migration Task 2 sẽ chạy trên DB production (Neon) qua `prisma migrate deploy` trong `vercel-build`. Backfill "Kho chính" áp dụng cho dữ liệu thật hiện có → tồn không đổi.
- SQL logic (view/trigger) phải được đóng gói trong migration (Task 3 Step 6) để production áp dụng được — KHÔNG dựa vào `db:logic` (lệnh đó chỉ chạy local qua docker exec).
- Sau deploy, verify trên production DB: `SELECT total_on_hand FROM stock_by_material` khớp tồn trước khi nâng cấp.
