# Phase A — Document Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lớp phiếu chứng từ (`Document`/`DocumentLine`) làm lớp nghiệp vụ trên sổ cái `StockMovement`, với engine lập/duyệt/hủy phiếu an toàn tương tranh và đúng kiểm toán.

**Architecture:** `Document`+`DocumentLine` gộp 4 loại phiếu (IN/OUT/TRANSFER/STOCKTAKE) ở DB. DRAFT không động tồn; POST sinh `StockMovement` (gắn `documentId`); VOID = bút toán đảo. TRANSFER qua PENDING→duyệt (segregation of duties). Mọi đường ghi sổ dùng `pg_advisory_xact_lock` (sorted + dedup) + recheck `current_stock`.

**Tech Stack:** Next.js 16 server actions · Prisma 6 · PostgreSQL (migration SQL thủ công) · Zod.

> **KHÔNG có test framework.** "Test" trong plan này = (a) thêm code, (b) `npm run typecheck` sạch, (c) verify hành vi qua psql/script Node với DB Docker thật. Mỗi task kết thúc bằng commit. **PUSH sau khi cả Phase A xong.**

---

## File Structure

| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `prisma/schema.prisma` | + model Document, DocumentLine; enum DocType, DocStatus; StockMovement.documentId + relation | Modify |
| `prisma/migrations/20260604130000_document_engine/migration.sql` | DDL tạo bảng + enum + cột + FK | Create |
| `lib/doc-codes.ts` | `nextDocCode(type)` tự tăng PN/PX/PC/KK | Create |
| `lib/validation.ts` | + docHeaderSchema, docLineSchema | Modify |
| `lib/actions/documents.ts` | saveDraft / postDocument / voidDocument | Create |
| `lib/actions/transfer-approve.ts` | submitTransferForApproval / approveTransfer / rejectTransfer | Create |
| `lib/queries/documents.ts` | listDocuments / getDocument | Create |
| `lib/actions/void.ts` | guard: chặn hủy lẻ movement thuộc documentId | Modify |

---

### Task 1: Schema — Document/DocumentLine models + enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Thêm 2 enum sau enum `StocktakeStatus` (sau dòng 36)**

```prisma
enum DocType {
  IN
  OUT
  TRANSFER
  STOCKTAKE
}

enum DocStatus {
  DRAFT
  PENDING
  POSTED
  VOIDED
}
```

- [ ] **Step 2: Thêm 2 model vào cuối file `schema.prisma`**

```prisma
model Document {
  id            String         @id @default(cuid())
  code          String         @unique
  type          DocType
  status        DocStatus      @default(DRAFT)
  reason        String?
  note          String?
  warehouseId   String
  warehouse     Warehouse      @relation("docWarehouse", fields: [warehouseId], references: [id])
  toWarehouseId String?
  toWarehouse   Warehouse?     @relation("docToWarehouse", fields: [toWarehouseId], references: [id])
  transferId    String?
  createdById   String
  createdBy     User           @relation("docCreated", fields: [createdById], references: [id])
  postedById    String?
  postedBy      User?          @relation("docPosted", fields: [postedById], references: [id])
  voidedById    String?
  voidedBy      User?          @relation("docVoided", fields: [voidedById], references: [id])
  postedAt      DateTime?
  voidedAt      DateTime?
  createdAt     DateTime       @default(now())
  lines         DocumentLine[]
  movements     StockMovement[]

  @@index([type])
  @@index([status])
  @@index([warehouseId])
  @@index([createdAt])
}

model DocumentLine {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  materialId String
  material   Material @relation(fields: [materialId], references: [id])
  quantity   Float

  @@index([documentId])
}
```

- [ ] **Step 3: Thêm `documentId` + relation vào `StockMovement`** (trong model StockMovement, sau dòng `stocktakeId`/stocktake relation, trước `voidedAt`)

```prisma
  documentId     String?
  document       Document?      @relation(fields: [documentId], references: [id])
```

Và thêm index trong khối `@@index` của StockMovement:
```prisma
  @@index([documentId])
```

- [ ] **Step 4: Thêm back-relations vào model có quan hệ mới**

Trong `model Warehouse`, thêm 2 dòng (sau `stocktakes Stocktake[]`):
```prisma
  docsFrom   Document[]      @relation("docWarehouse")
  docsTo     Document[]      @relation("docToWarehouse")
```

Trong `model User`, thêm 3 dòng (sau `stocktakesApproved`):
```prisma
  docsCreated  Document[]    @relation("docCreated")
  docsPosted   Document[]    @relation("docPosted")
  docsVoided   Document[]    @relation("docVoided")
```

Trong `model Material`, thêm 1 dòng (sau `stocktakeItems`):
```prisma
  documentLines DocumentLine[]
```

- [ ] **Step 5: Verify schema hợp lệ**

Run: `cd /tmp/vatlieu-kho && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 6: KHÔNG commit riêng — commit cùng Task 2 (schema + migration đi đôi).**

---

### Task 2: Migration SQL — tạo bảng/enum/cột trong DB

**Files:**
- Create: `prisma/migrations/20260604130000_document_engine/migration.sql`

> Dự án dùng migration SQL THỦ CÔNG (không `prisma migrate dev`). Viết DDL tay, áp bằng `prisma migrate deploy`.

- [ ] **Step 1: Tạo file migration với nội dung sau**

```sql
-- ---------------------------------------------------------------------------
-- document_engine: lớp phiếu chứng từ (Document/DocumentLine) trên sổ cái
-- ---------------------------------------------------------------------------

-- Enums
CREATE TYPE "DocType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'STOCKTAKE');
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'PENDING', 'POSTED', 'VOIDED');

-- Document
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "DocType" NOT NULL,
  "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT,
  "note" TEXT,
  "warehouseId" TEXT NOT NULL,
  "toWarehouseId" TEXT,
  "transferId" TEXT,
  "createdById" TEXT NOT NULL,
  "postedById" TEXT,
  "voidedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Document_code_key" ON "Document"("code");
CREATE INDEX "Document_type_idx" ON "Document"("type");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_warehouseId_idx" ON "Document"("warehouseId");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

ALTER TABLE "Document" ADD CONSTRAINT "Document_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DocumentLine
CREATE TABLE "DocumentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "DocumentLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentLine_documentId_idx" ON "DocumentLine"("documentId");
ALTER TABLE "DocumentLine" ADD CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLine" ADD CONSTRAINT "DocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockMovement.documentId
ALTER TABLE "StockMovement" ADD COLUMN "documentId" TEXT;
CREATE INDEX "StockMovement_documentId_idx" ON "StockMovement"("documentId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 2: Áp migration vào DB local**

Run: `cd /tmp/vatlieu-kho && npx prisma migrate deploy`
Expected: `Applying migration 20260604130000_document_engine` … `All migrations have been applied`.

- [ ] **Step 3: Regenerate Prisma client**

Run: `cd /tmp/vatlieu-kho && npx prisma generate`
Expected: `Generated Prisma Client`.

- [ ] **Step 4: Verify bảng tồn tại**

Run: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "\d \"Document\"" | head -5`
Expected: in ra cấu trúc bảng Document (có cột code, type, status…).

- [ ] **Step 5: Typecheck (schema mới phải khớp client mới)**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 6: Commit**

```bash
cd /tmp/vatlieu-kho
git add prisma/schema.prisma prisma/migrations/20260604130000_document_engine
git commit -m "feat(A): schema+migration Document/DocumentLine + StockMovement.documentId"
```

---

### Task 3: `lib/doc-codes.ts` — sinh mã phiếu tự tăng

**Files:**
- Create: `lib/doc-codes.ts`

- [ ] **Step 1: Tạo file**

```ts
import type { Prisma } from "@prisma/client";
import type { DocType } from "@prisma/client";

const PREFIX: Record<DocType, string> = {
  IN: "PN",
  OUT: "PX",
  TRANSFER: "PC",
  STOCKTAKE: "KK",
};

/**
 * Sinh mã phiếu kế tiếp cho loại `type`, dạng <PREFIX>-<số 5 chữ số>.
 * Phải gọi TRONG transaction (tx) để tránh trùng mã khi tạo song song.
 * Khóa theo prefix bằng advisory lock để 2 phiếu cùng loại không lấy trùng số.
 */
export async function nextDocCode(
  tx: Prisma.TransactionClient,
  type: DocType
): Promise<string> {
  const prefix = PREFIX[type];
  // Khóa theo loại phiếu để số tăng không bị đua.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"doccode:" + prefix}))`;
  const last = await tx.document.findFirst({
    where: { type },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let n = 1;
  if (last?.code) {
    const num = parseInt(last.code.split("-")[1] ?? "0", 10);
    if (!Number.isNaN(num)) n = num + 1;
  }
  return `${prefix}-${String(n).padStart(5, "0")}`;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/doc-codes.ts
git commit -m "feat(A): lib/doc-codes nextDocCode (PN/PX/PC/KK tự tăng, khóa theo prefix)"
```

---

### Task 4: `lib/validation.ts` — schema header/line phiếu

**Files:**
- Modify: `lib/validation.ts`

- [ ] **Step 1: Thêm vào cuối file (trước các `export type`)**

```ts
export const docLineSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
});

export const docHeaderSchema = z.object({
  type: z.enum(["IN", "OUT", "TRANSFER", "STOCKTAKE"]),
  warehouseId: z.string().min(1, "Vui lòng chọn kho"),
  toWarehouseId: z.string().optional(),
  reason: z.string().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(docLineSchema).min(1, "Phiếu phải có ít nhất 1 dòng"),
});
```

- [ ] **Step 2: Thêm export type (sau các type khác)**

```ts
export type DocLineInput = z.infer<typeof docLineSchema>;
export type DocHeaderInput = z.infer<typeof docHeaderSchema>;
```

- [ ] **Step 3: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/validation.ts
git commit -m "feat(A): docHeaderSchema/docLineSchema"
```

---

### Task 5: `lib/actions/documents.ts` — saveDraft / postDocument / voidDocument

**Files:**
- Create: `lib/actions/documents.ts`

> `outReasonOf`: map reason XUẤT (string) sang `MovementReason` enum. Nếu reason không khớp loss-enum hợp lệ thì mặc định `PROJECT`. Đây là điểm kiểm toán quan trọng (spec §3.4): DAMAGED/EXPIRED/NATURAL_LOSS phải vào báo cáo hao hụt.

- [ ] **Step 1: Tạo file với input dạng object (KHÔNG FormData — phiếu nhiều dòng)**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { docHeaderSchema, type DocHeaderInput } from "@/lib/validation";
import { nextDocCode } from "@/lib/doc-codes";
import type { ActionResult } from "@/lib/actions/movements";
import type { MovementReason } from "@prisma/client";

const LOSS_OUT: MovementReason[] = ["DAMAGED", "EXPIRED", "NATURAL_LOSS"];

/** Map lý do XUẤT sang enum sổ cái để báo cáo hao hụt không sót. */
function outReasonOf(reason?: string | null): MovementReason {
  if (reason && (LOSS_OUT as string[]).includes(reason)) return reason as MovementReason;
  return "PROJECT";
}

/** Lưu nháp: KHÔNG động tồn. Tạo Document(DRAFT) + lines. */
export async function saveDraft(input: DocHeaderInput): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  const parsed = docHeaderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const d = parsed.data;
  if (d.type === "TRANSFER" && !d.toWarehouseId) return { ok: false, error: "Phiếu chuyển kho cần kho đích" };
  if (d.type === "TRANSFER" && d.toWarehouseId === d.warehouseId) return { ok: false, error: "Kho nguồn và kho đích phải khác nhau" };

  try {
    const id = await prisma.$transaction(async (tx) => {
      const code = await nextDocCode(tx, d.type);
      const doc = await tx.document.create({
        data: {
          code, type: d.type, status: "DRAFT", reason: d.reason, note: d.note,
          warehouseId: d.warehouseId, toWarehouseId: d.type === "TRANSFER" ? d.toWarehouseId : null,
          createdById: user.id,
          lines: { create: d.lines.map((l) => ({ materialId: l.materialId, quantity: l.quantity })) },
        },
      });
      return doc.id;
    });
    revalidatePath("/nhap"); revalidatePath("/xuat"); revalidatePath("/chuyen-kho");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Step 2: Thêm `postDocument` (DRAFT→POSTED, sinh movements, advisory lock + recheck)**

```ts
/** Lập phiếu: DRAFT→POSTED, sinh StockMovement gắn documentId. */
export async function postDocument(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId }, include: { lines: true } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.status !== "DRAFT") throw new Error("Chỉ lập được phiếu đang ở trạng thái Nháp");
      if (doc.lines.length === 0) throw new Error("Phiếu không có dòng nào");
      if (doc.type === "TRANSFER") throw new Error("Phiếu chuyển kho phải gửi duyệt, không lập trực tiếp");
      for (const l of doc.lines) if (l.quantity <= 0) throw new Error("Số lượng phải lớn hơn 0");

      // Khóa các slot theo thứ tự xác định, dedup slot trùng (advisory lock re-entrant).
      const slots = [...new Set(doc.lines.map((l) => `${l.materialId}:${doc.warehouseId}`))].sort();
      for (const s of slots) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

      if (doc.type === "OUT") {
        // Gộp số lượng theo vật tư rồi recheck tồn (chống tồn âm, gồm cả dòng trùng vật tư).
        const need = new Map<string, number>();
        for (const l of doc.lines) need.set(l.materialId, (need.get(l.materialId) ?? 0) + l.quantity);
        for (const [materialId, qty] of need) {
          const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${doc.warehouseId}`;
          const onHand = rows.length ? Number(rows[0].on_hand) : 0;
          if (qty > onHand) throw new Error(`Không đủ tồn cho 1 vật tư (cần ${qty}, còn ${onHand})`);
        }
      }

      for (const l of doc.lines) {
        await tx.stockMovement.create({
          data: {
            materialId: l.materialId, warehouseId: doc.warehouseId,
            type: doc.type === "IN" ? "IN" : "OUT",
            reason: doc.type === "IN" ? "PURCHASE" : outReasonOf(doc.reason),
            quantity: l.quantity, note: doc.note, documentId: doc.id, createdById: user.id,
          },
        });
      }
      await tx.document.update({ where: { id: doc.id }, data: { status: "POSTED", postedById: user.id, postedAt: new Date() } });
    });
    revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/nhap"); revalidatePath("/xuat");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Step 3: Thêm `voidDocument` (POSTED→VOIDED bằng bút toán đảo)**

```ts
/** Hủy phiếu đã lập: bút toán đảo, KHÔNG xóa. */
export async function voidDocument(documentId: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!reason?.trim()) return { ok: false, error: "Vui lòng nhập lý do hủy" };
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId }, include: { movements: { where: { voidedAt: null, reason: { not: "VOID" } } } } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.status !== "POSTED") throw new Error("Chỉ hủy được phiếu đã lập");

      // Khóa slot của các movement bị đảo (dedup + sort).
      const slots = [...new Set(doc.movements.map((m) => `${m.materialId}:${m.warehouseId}`))].sort();
      for (const s of slots) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

      for (const m of doc.movements) {
        await tx.stockMovement.create({
          data: {
            materialId: m.materialId, warehouseId: m.warehouseId,
            type: m.type === "IN" ? "OUT" : "IN",
            reason: "VOID", quantity: m.quantity, note: `Hủy phiếu ${doc.code}: ${reason}`,
            documentId: doc.id, voidReversalOf: m.id, createdById: user.id,
          },
        });
        await tx.stockMovement.update({ where: { id: m.id }, data: { voidedAt: new Date(), voidedById: user.id } });
      }
      await tx.document.update({ where: { id: doc.id }, data: { status: "VOIDED", voidedById: user.id, voidedAt: new Date() } });
    });
    revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/nhap"); revalidatePath("/xuat");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 5: Verify hành vi qua script Node (DB thật)** — tạo file tạm `/tmp/test-doc.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
// lấy 1 material + warehouse có sẵn từ seed
const m = await p.material.findFirst();
const w = await p.warehouse.findFirst();
const u = await p.user.findFirst({ where: { role: "OWNER" } });
// tạo phiếu nhập DRAFT thủ công + post bằng SQL-level kiểm tra movement sinh ra
const doc = await p.document.create({ data: { code: "PN-TEST1", type: "IN", warehouseId: w.id, createdById: u.id, lines: { create: [{ materialId: m.id, quantity: 7 }] } } });
console.log("DRAFT created", doc.code, "status", doc.status);
const before = await p.stockMovement.count({ where: { documentId: doc.id } });
console.log("movements before post:", before, "(phải = 0)");
await p.$disconnect();
```

Run: `cd /tmp/vatlieu-kho && node /tmp/test-doc.mjs`
Expected: `DRAFT created PN-TEST1 status DRAFT` và `movements before post: 0` (DRAFT KHÔNG động tồn). Sau đó dọn: `docker exec -i vatlieu_db psql -U vatlieu -d vatlieu -c "DELETE FROM \"Document\" WHERE code='PN-TEST1';"` và `rm /tmp/test-doc.mjs`.

- [ ] **Step 6: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/actions/documents.ts
git commit -m "feat(A): documents.ts saveDraft/postDocument/voidDocument (lock+recheck, OUT reason→enum)"
```

---

### Task 6: `lib/actions/transfer-approve.ts` — gửi duyệt / duyệt / từ chối

**Files:**
- Create: `lib/actions/transfer-approve.ts`

> Segregation of duties: người tạo phiếu KHÔNG được tự duyệt trừ khi role OWNER. `transferId` sinh 1 lần/phiếu (KHÔNG per-line — bài học spec §8.1).

- [ ] **Step 1: Tạo file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/actions/movements";

/** Gửi phiếu chuyển kho đi duyệt: DRAFT→PENDING. */
export async function submitTransferForApproval(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId }, include: { lines: true } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Chỉ phiếu chuyển kho mới gửi duyệt");
      if (doc.status !== "DRAFT") throw new Error("Chỉ gửi duyệt phiếu đang Nháp");
      if (doc.lines.length === 0) throw new Error("Phiếu không có dòng nào");
      if (!doc.toWarehouseId) throw new Error("Thiếu kho đích");
      await tx.document.update({ where: { id: doc.id }, data: { status: "PENDING" } });
    });
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Duyệt phiếu chuyển kho: PENDING→POSTED, sinh cặp TRANSFER_OUT/IN cùng 1 transferId. */
export async function approveTransfer(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId }, include: { lines: true } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Không phải phiếu chuyển kho");
      if (doc.status !== "PENDING") throw new Error("Chỉ duyệt phiếu đang Chờ duyệt");
      if (!doc.toWarehouseId) throw new Error("Thiếu kho đích");
      // Segregation of duties: người tạo không tự duyệt, trừ OWNER.
      if (doc.createdById === user.id && user.role !== "OWNER") throw new Error("Người lập phiếu không được tự duyệt");

      const transferId = randomUUID(); // 1 transferId / phiếu (hoisted ngoài loop)

      // Khóa slot kho NGUỒN (dedup + sort) rồi recheck tồn.
      const fromSlots = [...new Set(doc.lines.map((l) => `${l.materialId}:${doc.warehouseId}`))].sort();
      for (const s of fromSlots) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;
      const need = new Map<string, number>();
      for (const l of doc.lines) need.set(l.materialId, (need.get(l.materialId) ?? 0) + l.quantity);
      for (const [materialId, qty] of need) {
        const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${doc.warehouseId}`;
        const onHand = rows.length ? Number(rows[0].on_hand) : 0;
        if (qty > onHand) throw new Error(`Kho nguồn không đủ tồn (cần ${qty}, còn ${onHand})`);
      }

      for (const l of doc.lines) {
        await tx.stockMovement.create({ data: { materialId: l.materialId, warehouseId: doc.warehouseId, type: "OUT", reason: "TRANSFER_OUT", quantity: l.quantity, transferId, documentId: doc.id, createdById: user.id } });
        await tx.stockMovement.create({ data: { materialId: l.materialId, warehouseId: doc.toWarehouseId!, type: "IN", reason: "TRANSFER_IN", quantity: l.quantity, transferId, documentId: doc.id, createdById: user.id } });
      }
      await tx.document.update({ where: { id: doc.id }, data: { status: "POSTED", postedById: user.id, postedAt: new Date(), transferId } });
    });
    revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Từ chối phiếu chuyển kho: PENDING→DRAFT (để sửa lại) hoặc VOIDED. Ở đây trả về DRAFT. */
export async function rejectTransfer(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Không phải phiếu chuyển kho");
      if (doc.status !== "PENDING") throw new Error("Chỉ từ chối phiếu đang Chờ duyệt");
      await tx.document.update({ where: { id: doc.id }, data: { status: "DRAFT" } });
    });
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/actions/transfer-approve.ts
git commit -m "feat(A): transfer-approve submit/approve/reject (1 transferId/phiếu, segregation, lock+recheck)"
```

---

### Task 7: `lib/queries/documents.ts` — listDocuments / getDocument

**Files:**
- Create: `lib/queries/documents.ts`

- [ ] **Step 1: Tạo file**

```ts
import { prisma } from "@/lib/prisma";
import type { DocType } from "@prisma/client";

export async function listDocuments(type: DocType) {
  return prisma.document.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      warehouse: { select: { name: true, code: true } },
      toWarehouse: { select: { name: true, code: true } },
      createdBy: { select: { name: true } },
      postedBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
      lines: { include: { material: { select: { name: true, code: true, unit: true } } } },
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/queries/documents.ts
git commit -m "feat(A): queries/documents listDocuments/getDocument"
```

---

### Task 8: Guard `lib/actions/void.ts` — chặn hủy lẻ movement thuộc phiếu

**Files:**
- Modify: `lib/actions/void.ts`

> Bài học spec §8.2 (CRITICAL): nếu hủy lẻ 1 movement thuộc Document, phiếu bị strand. Phải chặn — hủy chỉ qua `voidDocument`.

- [ ] **Step 1: Đọc void.ts để tìm chỗ load movement trong `voidMovement`**

Run: `cd /tmp/vatlieu-kho && grep -n "findUnique\|documentId\|async function voidMovement" lib/actions/void.ts`

- [ ] **Step 2: Ngay sau khi load `mv` (movement) trong `voidMovement`, thêm guard**

Tìm dòng load movement (ví dụ `const mv = await tx.stockMovement.findUnique(...)` hoặc tương tự) và NGAY sau khi kiểm tra `mv` tồn tại, thêm:

```ts
if (mv.documentId) throw new Error("Giao dịch này thuộc một phiếu chứng từ — hãy hủy bằng cách hủy phiếu, không hủy lẻ.");
```

(Nếu `voidMovement` trả `ActionResult` thay vì throw, dùng `return { ok: false, error: "..." }` cho khớp pattern hàm đó.)

- [ ] **Step 3: Typecheck**

Run: `cd /tmp/vatlieu-kho && npm run typecheck`
Expected: không lỗi.

- [ ] **Step 4: Commit**

```bash
cd /tmp/vatlieu-kho
git add lib/actions/void.ts
git commit -m "feat(A): void.ts chặn hủy lẻ movement thuộc Document (tránh strand phiếu)"
```

---

### Task 9: Phase A — Verify tổng + PUSH

- [ ] **Step 1: typecheck + lint sạch**

Run: `cd /tmp/vatlieu-kho && npm run typecheck && npm run lint`
Expected: cả hai không lỗi.

- [ ] **Step 2: migrate status up-to-date**

Run: `cd /tmp/vatlieu-kho && npx prisma migrate status`
Expected: `Database schema is up to date!`

- [ ] **Step 3: PUSH (LUẬT VÀNG — không để treo trong /tmp)**

```bash
cd /tmp/vatlieu-kho && git push origin feat/bo-sung-2
```
Expected: push thành công, các commit A có trên remote.

- [ ] **Step 4: Đánh dấu Phase A ✅ trong spec §9 và cập nhật memory.**

---

## Self-Review

**Spec coverage (Phase A phần của spec §4):**
- Schema Document/DocumentLine + enum + StockMovement.documentId + voidedBy FK → Task 1,2 ✅
- doc-codes nextDocCode → Task 3 ✅
- documents.ts saveDraft/postDocument/voidDocument (lock, recheck, OUT reason→enum, quantity>0 guard) → Task 5 ✅
- transfer-approve submit/approve/reject (1 transferId/phiếu, segregation, sorted locks) → Task 6 ✅
- queries/documents listDocuments/getDocument → Task 7 ✅
- bỏ regex mã kho → KHÔNG ở Phase A (regex ở warehouseSchema; spec đặt việc bỏ ở Phase D — đúng, không làm sớm) ✅
- docHeaderSchema/docLineSchema → Task 4 ✅
- voidMovement chặn dòng thuộc documentId → Task 8 ✅

**Placeholder scan:** Không có TBD/TODO; mọi step có code/command thật. Task 8 Step 2 mô tả "tìm dòng load mv" — chấp nhận vì void.ts chưa đọc; người thực thi grep ở Step 1 rồi chèn guard. ✅

**Type consistency:** `ActionResult` import từ `lib/actions/movements`. `nextDocCode(tx, type)` chữ ký nhất quán giữa doc-codes và documents/transfer-approve. `outReasonOf` chỉ dùng trong documents.ts. `DocType`/`DocStatus`/`MovementReason` từ `@prisma/client`. Slot dedup+sort dùng `[...new Set(...)].sort()` nhất quán mọi nơi. ✅
