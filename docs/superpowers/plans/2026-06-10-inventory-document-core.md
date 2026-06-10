# Inventory Document Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1 of the approved spec: inventory documents with multiple lines, audit-ready links to `StockMovement`, and import/export/transfer posting through documents.

**Architecture:** Add `InventoryDocument` and `InventoryDocumentLine` as the source of truth for user-facing slips. Keep `StockMovement` as the inventory ledger and generate movements only when a document is posted. Use small pure helpers for form parsing and movement generation so critical behavior can be tested without a database.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6, PostgreSQL, Zod, `tsx` for lightweight TypeScript behavior tests, existing `npm run lint` and `npm run typecheck`.

---

## Baseline Notes

- `npm run lint` currently passes.
- `npm run typecheck` currently fails before this feature because `.next/types/validator.ts` references old routes that are no longer in the app and `@prisma/client` appears stale for `Role` in `prisma/seed.ts`.
- Before final verification, run `npx prisma generate` and regenerate/clean Next type artifacts. If stale `.next` types still fail, remove `.next` locally and rerun typecheck.

## File Structure

- Modify `prisma/schema.prisma`: add document enums/models and relations; extend `StockMovement`.
- Create `prisma/migrations/20260610120000_inventory_documents/migration.sql`: schema migration and backfill existing movements into documents.
- Modify `db/postgres-logic.sql`: exclude superseded movements from stock views.
- Create `lib/inventory/posting.ts`: pure movement builder for import/export/transfer documents.
- Create `lib/inventory/document-form.ts`: parse JSON line payloads from `FormData` while keeping backward compatibility with current single-line forms.
- Create `tests/inventory-posting.test.ts`: behavior tests for movement generation.
- Create `tests/document-form.test.ts`: behavior tests for form parsing.
- Modify `lib/actions/movements.ts`: create posted import/export documents and generated movements.
- Modify `lib/actions/transfer.ts`: create posted transfer documents and generated movement pairs immediately.
- Modify `lib/queries/history.ts`: expose document code/id/revision when present.
- Modify `components/import-form.tsx`, `components/export-form.tsx`, `components/transfer-form.tsx`: support multiple lines and submit `lines` JSON.
- Modify pages under `app/(app)/nhap`, `xuat`, `chuyen-kho` only if props or labels need to change.

## Task 1: Add Failing Tests for Posting Helper

**Files:**
- Create: `tests/inventory-posting.test.ts`
- Create later: `lib/inventory/posting.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { buildStockMovementInputs } from "../lib/inventory/posting";

const userId = "user-1";

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-import",
      kind: "IMPORT",
      revisionNo: 1,
      warehouseId: "wh-main",
      lines: [
        { id: "line-1", materialId: "mat-xm", quantity: 10 },
        { id: "line-2", materialId: "mat-thep", quantity: 5 },
      ],
    },
    userId
  );

  assert.deepEqual(
    movements.map((m) => ({
      materialId: m.materialId,
      warehouseId: m.warehouseId,
      type: m.type,
      reason: m.reason,
      quantity: m.quantity,
      documentId: m.documentId,
      documentLineId: m.documentLineId,
      documentRevisionNo: m.documentRevisionNo,
      createdById: m.createdById,
    })),
    [
      {
        materialId: "mat-xm",
        warehouseId: "wh-main",
        type: "IN",
        reason: "PURCHASE",
        quantity: 10,
        documentId: "doc-import",
        documentLineId: "line-1",
        documentRevisionNo: 1,
        createdById: userId,
      },
      {
        materialId: "mat-thep",
        warehouseId: "wh-main",
        type: "IN",
        reason: "PURCHASE",
        quantity: 5,
        documentId: "doc-import",
        documentLineId: "line-2",
        documentRevisionNo: 1,
        createdById: userId,
      },
    ]
  );
}

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-export",
      kind: "EXPORT",
      revisionNo: 1,
      warehouseId: "wh-main",
      reason: "PROJECT",
      lines: [{ id: "line-1", materialId: "mat-xm", quantity: 3 }],
    },
    userId
  );

  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, "OUT");
  assert.equal(movements[0].reason, "PROJECT");
  assert.equal(movements[0].warehouseId, "wh-main");
}

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-transfer",
      kind: "TRANSFER",
      revisionNo: 2,
      fromWarehouseId: "wh-a",
      toWarehouseId: "wh-b",
      lines: [{ id: "line-1", materialId: "mat-da", quantity: 7 }],
    },
    userId
  );

  assert.deepEqual(
    movements.map((m) => ({ type: m.type, reason: m.reason, warehouseId: m.warehouseId, quantity: m.quantity })),
    [
      { type: "OUT", reason: "TRANSFER_OUT", warehouseId: "wh-a", quantity: 7 },
      { type: "IN", reason: "TRANSFER_IN", warehouseId: "wh-b", quantity: 7 },
    ]
  );
}

console.log("inventory-posting tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/inventory-posting.test.ts`

Expected: FAIL because `../lib/inventory/posting` does not exist.

## Task 2: Implement Posting Helper

**Files:**
- Create: `lib/inventory/posting.ts`
- Test: `tests/inventory-posting.test.ts`

- [ ] **Step 1: Write minimal implementation**

```ts
export type InventoryDocumentKind = "IMPORT" | "EXPORT" | "TRANSFER" | "OPENING" | "ADJUSTMENT";
export type MovementTypeValue = "IN" | "OUT";
export type MovementReasonValue =
  | "PURCHASE"
  | "PROJECT"
  | "DAMAGED"
  | "EXPIRED"
  | "NATURAL_LOSS"
  | "STOCKTAKE_ADJUST"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "VOID";

export interface PostingLine {
  id: string;
  materialId: string;
  quantity: number;
  note?: string | null;
}

export interface PostingDocument {
  id: string;
  kind: InventoryDocumentKind;
  revisionNo: number;
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  reason?: MovementReasonValue | null;
  note?: string | null;
  lines: PostingLine[];
}

export interface StockMovementInput {
  materialId: string;
  warehouseId: string;
  type: MovementTypeValue;
  quantity: number;
  reason: MovementReasonValue;
  note?: string | null;
  documentId: string;
  documentLineId: string;
  documentRevisionNo: number;
  createdById: string;
}

function requireWarehouse(value: string | null | undefined, label: string): string {
  if (!value) throw new Error(`Thiếu ${label}`);
  return value;
}

export function buildStockMovementInputs(doc: PostingDocument, createdById: string): StockMovementInput[] {
  if (doc.lines.length === 0) throw new Error("Phiếu phải có ít nhất một dòng");

  if (doc.kind === "TRANSFER") {
    const fromWarehouseId = requireWarehouse(doc.fromWarehouseId, "kho nguồn");
    const toWarehouseId = requireWarehouse(doc.toWarehouseId, "kho nhận");
    return doc.lines.flatMap((line) => [
      {
        materialId: line.materialId,
        warehouseId: fromWarehouseId,
        type: "OUT",
        quantity: line.quantity,
        reason: "TRANSFER_OUT",
        note: line.note ?? doc.note ?? null,
        documentId: doc.id,
        documentLineId: line.id,
        documentRevisionNo: doc.revisionNo,
        createdById,
      },
      {
        materialId: line.materialId,
        warehouseId: toWarehouseId,
        type: "IN",
        quantity: line.quantity,
        reason: "TRANSFER_IN",
        note: line.note ?? doc.note ?? null,
        documentId: doc.id,
        documentLineId: line.id,
        documentRevisionNo: doc.revisionNo,
        createdById,
      },
    ]);
  }

  const warehouseId = requireWarehouse(doc.warehouseId, "kho");
  const isIn = doc.kind === "IMPORT" || doc.kind === "OPENING";
  const reason = doc.kind === "IMPORT" || doc.kind === "OPENING" ? "PURCHASE" : doc.reason ?? "PROJECT";

  return doc.lines.map((line) => ({
    materialId: line.materialId,
    warehouseId,
    type: isIn ? "IN" : "OUT",
    quantity: line.quantity,
    reason,
    note: line.note ?? doc.note ?? null,
    documentId: doc.id,
    documentLineId: line.id,
    documentRevisionNo: doc.revisionNo,
    createdById,
  }));
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx tests/inventory-posting.test.ts`

Expected: PASS with `inventory-posting tests passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/inventory-posting.test.ts lib/inventory/posting.ts
git commit -m "test: cover inventory document posting"
```

## Task 3: Add Failing Tests for Form Line Parser

**Files:**
- Create: `tests/document-form.test.ts`
- Create later: `lib/inventory/document-form.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { parseDocumentLines } from "../lib/inventory/document-form";

{
  const formData = new FormData();
  formData.set(
    "lines",
    JSON.stringify([
      { materialId: "mat-1", quantity: "2.5", note: "Dòng 1" },
      { materialId: "mat-2", quantity: 3 },
    ])
  );

  assert.deepEqual(parseDocumentLines(formData), [
    { materialId: "mat-1", quantity: 2.5, note: "Dòng 1" },
    { materialId: "mat-2", quantity: 3, note: undefined },
  ]);
}

{
  const formData = new FormData();
  formData.set("materialId", "mat-single");
  formData.set("quantity", "4");
  formData.set("note", "legacy");

  assert.deepEqual(parseDocumentLines(formData), [
    { materialId: "mat-single", quantity: 4, note: "legacy" },
  ]);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ materialId: "", quantity: 1 }]));
  assert.throws(() => parseDocumentLines(formData), /Vui lòng chọn vật tư/);
}

console.log("document-form tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx tests/document-form.test.ts`

Expected: FAIL because `../lib/inventory/document-form` does not exist.

## Task 4: Implement Form Line Parser

**Files:**
- Create: `lib/inventory/document-form.ts`
- Test: `tests/document-form.test.ts`

- [ ] **Step 1: Write minimal implementation**

```ts
import { z } from "zod";

const lineSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().trim().max(500).optional(),
});

const linesSchema = z.array(lineSchema).min(1, "Phiếu phải có ít nhất một dòng");

export type ParsedDocumentLine = z.infer<typeof lineSchema>;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseDocumentLines(formData: FormData): ParsedDocumentLine[] {
  const rawLines = getString(formData, "lines");
  if (rawLines) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawLines);
    } catch {
      throw new Error("Danh sách dòng phiếu không hợp lệ");
    }
    const parsed = linesSchema.safeParse(parsedJson);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu không hợp lệ");
    return parsed.data.map((line) => ({ ...line, note: line.note || undefined }));
  }

  const parsed = lineSchema.safeParse({
    materialId: formData.get("materialId"),
    quantity: formData.get("quantity"),
    note: getString(formData, "note") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu không hợp lệ");
  return [{ ...parsed.data, note: parsed.data.note || undefined }];
}
```

- [ ] **Step 2: Run parser test**

Run: `npx tsx tests/document-form.test.ts`

Expected: PASS with `document-form tests passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/document-form.test.ts lib/inventory/document-form.ts
git commit -m "test: cover document form line parsing"
```

## Task 5: Add Prisma Schema and Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260610120000_inventory_documents/migration.sql`
- Modify: `db/postgres-logic.sql`

- [ ] **Step 1: Modify `prisma/schema.prisma`**

Add enums:

```prisma
enum InventoryDocumentKind {
  IMPORT
  EXPORT
  TRANSFER
  OPENING
  ADJUSTMENT
}

enum InventoryDocumentStatus {
  DRAFT
  POSTED
  VOIDED
}

enum DocumentAuditAction {
  CREATE
  POST
  EDIT_DRAFT
  EDIT_POSTED
  VOID
  DELETE_DRAFT
}
```

Add models:

```prisma
model InventoryDocument {
  id              String                  @id @default(cuid())
  code            String                  @unique
  kind            InventoryDocumentKind
  status          InventoryDocumentStatus @default(DRAFT)
  documentDate    DateTime
  warehouseId     String?
  warehouse       Warehouse?              @relation("DocumentWarehouse", fields: [warehouseId], references: [id])
  fromWarehouseId String?
  fromWarehouse   Warehouse?              @relation("DocumentFromWarehouse", fields: [fromWarehouseId], references: [id])
  toWarehouseId   String?
  toWarehouse     Warehouse?              @relation("DocumentToWarehouse", fields: [toWarehouseId], references: [id])
  reason          MovementReason?
  note            String?
  revisionNo      Int                     @default(1)
  createdById     String
  createdBy       User                    @relation("DocumentCreatedBy", fields: [createdById], references: [id])
  updatedById     String?
  updatedBy       User?                   @relation("DocumentUpdatedBy", fields: [updatedById], references: [id])
  postedById      String?
  postedBy        User?                   @relation("DocumentPostedBy", fields: [postedById], references: [id])
  voidedById      String?
  voidedBy        User?                   @relation("DocumentVoidedBy", fields: [voidedById], references: [id])
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt
  postedAt        DateTime?
  voidedAt        DateTime?
  voidReason      String?
  lines           InventoryDocumentLine[]
  movements       StockMovement[]
  auditLogs       DocumentAuditLog[]

  @@index([kind, status])
  @@index([documentDate])
  @@index([warehouseId])
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
  @@index([createdById])
}

model InventoryDocumentLine {
  id          String            @id @default(cuid())
  documentId  String
  document    InventoryDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  lineNo      Int
  materialId  String
  material    Material          @relation(fields: [materialId], references: [id])
  quantity    Float
  note        String?
  movements   StockMovement[]

  @@unique([documentId, lineNo])
  @@index([materialId])
}

model DocumentAuditLog {
  id             String              @id @default(cuid())
  documentId     String
  document       InventoryDocument   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  action         DocumentAuditAction
  fromRevisionNo Int?
  toRevisionNo   Int?
  reason         String?
  snapshotBefore Json?
  snapshotAfter  Json?
  changedById    String
  changedBy      User                @relation(fields: [changedById], references: [id])
  changedAt      DateTime            @default(now())

  @@index([documentId])
  @@index([changedById])
  @@index([changedAt])
}
```

Extend relations on existing models:

```prisma
model User {
  documentsCreated InventoryDocument[] @relation("DocumentCreatedBy")
  documentsUpdated InventoryDocument[] @relation("DocumentUpdatedBy")
  documentsPosted  InventoryDocument[] @relation("DocumentPostedBy")
  documentsVoided  InventoryDocument[] @relation("DocumentVoidedBy")
  documentAuditLogs DocumentAuditLog[]
}

model Material {
  documentLines InventoryDocumentLine[]
}

model Warehouse {
  inventoryDocuments     InventoryDocument[] @relation("DocumentWarehouse")
  fromTransferDocuments  InventoryDocument[] @relation("DocumentFromWarehouse")
  toTransferDocuments    InventoryDocument[] @relation("DocumentToWarehouse")
}

model StockMovement {
  documentId              String?
  document                InventoryDocument?     @relation(fields: [documentId], references: [id])
  documentLineId          String?
  documentLine            InventoryDocumentLine? @relation(fields: [documentLineId], references: [id])
  documentRevisionNo      Int?
  supersededAt            DateTime?
  supersededByRevisionNo  Int?

  @@index([documentId])
  @@index([documentLineId])
}
```

- [ ] **Step 2: Create migration SQL**

Create `prisma/migrations/20260610120000_inventory_documents/migration.sql` with:

```sql
CREATE TYPE "InventoryDocumentKind" AS ENUM ('IMPORT', 'EXPORT', 'TRANSFER', 'OPENING', 'ADJUSTMENT');
CREATE TYPE "InventoryDocumentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');
CREATE TYPE "DocumentAuditAction" AS ENUM ('CREATE', 'POST', 'EDIT_DRAFT', 'EDIT_POSTED', 'VOID', 'DELETE_DRAFT');

CREATE TABLE "InventoryDocument" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "kind" "InventoryDocumentKind" NOT NULL,
  "status" "InventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "documentDate" TIMESTAMP(3) NOT NULL,
  "warehouseId" TEXT,
  "fromWarehouseId" TEXT,
  "toWarehouseId" TEXT,
  "reason" "MovementReason",
  "note" TEXT,
  "revisionNo" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "postedById" TEXT,
  "voidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryDocumentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentAuditLog" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "action" "DocumentAuditAction" NOT NULL,
  "fromRevisionNo" INTEGER,
  "toRevisionNo" INTEGER,
  "reason" TEXT,
  "snapshotBefore" JSONB,
  "snapshotAfter" JSONB,
  "changedById" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StockMovement"
  ADD COLUMN "documentId" TEXT,
  ADD COLUMN "documentLineId" TEXT,
  ADD COLUMN "documentRevisionNo" INTEGER,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "supersededByRevisionNo" INTEGER;
```

Then add indexes, foreign keys, and backfill:

```sql
CREATE UNIQUE INDEX "InventoryDocument_code_key" ON "InventoryDocument"("code");
CREATE INDEX "InventoryDocument_kind_status_idx" ON "InventoryDocument"("kind", "status");
CREATE INDEX "InventoryDocument_documentDate_idx" ON "InventoryDocument"("documentDate");
CREATE INDEX "InventoryDocument_warehouseId_idx" ON "InventoryDocument"("warehouseId");
CREATE INDEX "InventoryDocument_fromWarehouseId_idx" ON "InventoryDocument"("fromWarehouseId");
CREATE INDEX "InventoryDocument_toWarehouseId_idx" ON "InventoryDocument"("toWarehouseId");
CREATE INDEX "InventoryDocument_createdById_idx" ON "InventoryDocument"("createdById");
CREATE UNIQUE INDEX "InventoryDocumentLine_documentId_lineNo_key" ON "InventoryDocumentLine"("documentId", "lineNo");
CREATE INDEX "InventoryDocumentLine_materialId_idx" ON "InventoryDocumentLine"("materialId");
CREATE INDEX "DocumentAuditLog_documentId_idx" ON "DocumentAuditLog"("documentId");
CREATE INDEX "DocumentAuditLog_changedById_idx" ON "DocumentAuditLog"("changedById");
CREATE INDEX "DocumentAuditLog_changedAt_idx" ON "DocumentAuditLog"("changedAt");
CREATE INDEX "StockMovement_documentId_idx" ON "StockMovement"("documentId");
CREATE INDEX "StockMovement_documentLineId_idx" ON "StockMovement"("documentLineId");

ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocument" ADD CONSTRAINT "InventoryDocument_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_documentLineId_fkey" FOREIGN KEY ("documentLineId") REFERENCES "InventoryDocumentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Backfill non-transfer movements as one-line documents and transfer pairs as transfer documents:

```sql
INSERT INTO "InventoryDocument" (
  "id", "code", "kind", "status", "documentDate", "warehouseId", "reason", "note",
  "revisionNo", "createdById", "postedById", "createdAt", "updatedAt", "postedAt"
)
SELECT
  'doc_' || sm.id,
  'LEG-' || sm.id,
  CASE
    WHEN sm.reason = 'STOCKTAKE_ADJUST' THEN 'ADJUSTMENT'::"InventoryDocumentKind"
    WHEN sm.type = 'IN' THEN 'IMPORT'::"InventoryDocumentKind"
    ELSE 'EXPORT'::"InventoryDocumentKind"
  END,
  'POSTED'::"InventoryDocumentStatus",
  sm."createdAt",
  sm."warehouseId",
  sm.reason,
  sm.note,
  1,
  sm."createdById",
  sm."createdById",
  sm."createdAt",
  sm."createdAt",
  sm."createdAt"
FROM "StockMovement" sm
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

INSERT INTO "InventoryDocumentLine" ("id", "documentId", "lineNo", "materialId", "quantity", "note")
SELECT
  'line_' || sm.id,
  'doc_' || sm.id,
  1,
  sm."materialId",
  sm.quantity,
  sm.note
FROM "StockMovement" sm
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

UPDATE "StockMovement" sm
SET
  "documentId" = 'doc_' || sm.id,
  "documentLineId" = 'line_' || sm.id,
  "documentRevisionNo" = 1
WHERE sm."transferId" IS NULL
  AND sm."documentId" IS NULL;

WITH transfer_docs AS (
  SELECT
    sm."transferId",
    MIN(sm."createdAt") AS created_at,
    MIN(sm."createdById") AS created_by_id,
    MIN(sm.note) AS note,
    MAX(CASE WHEN sm.type = 'OUT' THEN sm."warehouseId" END) AS from_warehouse_id,
    MAX(CASE WHEN sm.type = 'IN' THEN sm."warehouseId" END) AS to_warehouse_id
  FROM "StockMovement" sm
  WHERE sm."transferId" IS NOT NULL
    AND sm."documentId" IS NULL
  GROUP BY sm."transferId"
)
INSERT INTO "InventoryDocument" (
  "id", "code", "kind", "status", "documentDate", "fromWarehouseId", "toWarehouseId",
  "note", "revisionNo", "createdById", "postedById", "createdAt", "updatedAt", "postedAt"
)
SELECT
  'doc_transfer_' || replace(td."transferId", '-', '_'),
  'LEG-TR-' || td."transferId",
  'TRANSFER'::"InventoryDocumentKind",
  'POSTED'::"InventoryDocumentStatus",
  td.created_at,
  td.from_warehouse_id,
  td.to_warehouse_id,
  td.note,
  1,
  td.created_by_id,
  td.created_by_id,
  td.created_at,
  td.created_at,
  td.created_at
FROM transfer_docs td;

WITH transfer_out AS (
  SELECT
    sm.id AS out_id,
    sm."transferId",
    sm."materialId",
    sm.quantity,
    sm.note,
    row_number() OVER (PARTITION BY sm."transferId" ORDER BY sm."createdAt", sm.id) AS line_no
  FROM "StockMovement" sm
  WHERE sm."transferId" IS NOT NULL
    AND sm.type = 'OUT'
    AND sm."documentId" IS NULL
)
INSERT INTO "InventoryDocumentLine" ("id", "documentId", "lineNo", "materialId", "quantity", "note")
SELECT
  'line_' || transfer_out.out_id,
  'doc_transfer_' || replace(transfer_out."transferId", '-', '_'),
  transfer_out.line_no,
  transfer_out."materialId",
  transfer_out.quantity,
  transfer_out.note
FROM transfer_out;

WITH transfer_lines AS (
  SELECT
    dl.id AS line_id,
    d.id AS document_id,
    d."fromWarehouseId",
    d."toWarehouseId",
    dl."materialId",
    dl.quantity
  FROM "InventoryDocumentLine" dl
  JOIN "InventoryDocument" d ON d.id = dl."documentId"
  WHERE d.kind = 'TRANSFER'
)
UPDATE "StockMovement" sm
SET
  "documentId" = transfer_lines.document_id,
  "documentLineId" = transfer_lines.line_id,
  "documentRevisionNo" = 1
FROM transfer_lines
WHERE sm."transferId" IS NOT NULL
  AND sm."documentId" IS NULL
  AND sm."materialId" = transfer_lines."materialId"
  AND sm.quantity = transfer_lines.quantity
  AND (
    (sm.type = 'OUT' AND sm."warehouseId" = transfer_lines."fromWarehouseId")
    OR
    (sm.type = 'IN' AND sm."warehouseId" = transfer_lines."toWarehouseId")
  );

INSERT INTO "DocumentAuditLog" (
  "id", "documentId", "action", "toRevisionNo", "reason", "changedById", "changedAt"
)
SELECT
  'audit_' || d.id,
  d.id,
  'POST'::"DocumentAuditAction",
  1,
  'Backfill từ StockMovement hiện có',
  d."createdById",
  d."createdAt"
FROM "InventoryDocument" d
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentAuditLog" al WHERE al."documentId" = d.id
);
```

- [ ] **Step 3: Update `db/postgres-logic.sql` views**

Change every active movement filter from:

```sql
AND sm."voidedAt" IS NULL
AND sm.reason <> 'VOID'
```

to:

```sql
AND sm."voidedAt" IS NULL
AND sm."supersededAt" IS NULL
AND sm.reason <> 'VOID'
```

Also add `AND sm."supersededAt" IS NULL` to `loss_by_month`.

- [ ] **Step 4: Validate Prisma schema**

Run: `npx prisma validate`

Expected: schema valid.

- [ ] **Step 5: Generate Prisma client**

Run: `npx prisma generate`

Expected: Prisma Client generated successfully.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260610120000_inventory_documents/migration.sql db/postgres-logic.sql
git commit -m "feat: add inventory document schema"
```

## Task 6: Post Import and Export Through Documents

**Files:**
- Modify: `lib/actions/movements.ts`
- Test: `tests/inventory-posting.test.ts`, `tests/document-form.test.ts`

- [ ] **Step 1: Replace direct movement creation with document posting**

Use this flow inside `createImport`:

```ts
const lines = parseDocumentLines(formData);
const documentDate = new Date();
await prisma.$transaction(async (tx) => {
  const doc = await tx.inventoryDocument.create({
    data: {
      code: `PN-${Date.now()}`,
      kind: "IMPORT",
      status: "POSTED",
      documentDate,
      warehouseId,
      reason: "PURCHASE",
      note,
      createdById: user.id,
      postedById: user.id,
      postedAt: documentDate,
      lines: {
        create: lines.map((line, index) => ({
          lineNo: index + 1,
          materialId: line.materialId,
          quantity: line.quantity,
          note: line.note,
        })),
      },
      auditLogs: {
        create: {
          action: "POST",
          toRevisionNo: 1,
          changedById: user.id,
          reason: "Ghi sổ phiếu nhập",
        },
      },
    },
    include: { lines: true },
  });
  const movements = buildStockMovementInputs(
    { id: doc.id, kind: "IMPORT", revisionNo: doc.revisionNo, warehouseId: doc.warehouseId, note: doc.note, lines: doc.lines },
    user.id
  );
  await tx.stockMovement.createMany({ data: movements });
});
```

Use the same pattern for `createExport`, but keep advisory locks and stock checks for each distinct `(materialId, warehouseId)` before creating movements.

- [ ] **Step 2: Run helper tests**

Run:

```bash
npx tsx tests/inventory-posting.test.ts
npx tsx tests/document-form.test.ts
```

Expected: both PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/movements.ts
git commit -m "feat: post import and export documents"
```

## Task 7: Post Transfer Through Documents Immediately

**Files:**
- Modify: `lib/actions/transfer.ts`

- [ ] **Step 1: Replace direct transfer pair creation with document posting**

Use this flow:

```ts
const lines = parseDocumentLines(formData);
await prisma.$transaction(async (tx) => {
  for (const line of lines) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${line.materialId + ":" + fromWarehouseId}))`;
    const rows = await tx.$queryRaw<{ on_hand: number }[]>`
      SELECT on_hand FROM current_stock
      WHERE material_id = ${line.materialId} AND warehouse_id = ${fromWarehouseId}`;
    const onHand = rows.length ? Number(rows[0].on_hand) : 0;
    if (line.quantity > onHand) throw new Error(`Kho nguồn không đủ tồn (còn ${onHand})`);
  }
  const doc = await tx.inventoryDocument.create({
    data: {
      code: `CK-${Date.now()}`,
      kind: "TRANSFER",
      status: "POSTED",
      documentDate: new Date(),
      fromWarehouseId,
      toWarehouseId,
      note,
      createdById: user.id,
      postedById: user.id,
      postedAt: new Date(),
      lines: { create: lines.map((line, index) => ({ lineNo: index + 1, materialId: line.materialId, quantity: line.quantity, note: line.note })) },
      auditLogs: { create: { action: "POST", toRevisionNo: 1, changedById: user.id, reason: "Ghi sổ phiếu chuyển kho" } },
    },
    include: { lines: true },
  });
  const movements = buildStockMovementInputs(
    { id: doc.id, kind: "TRANSFER", revisionNo: doc.revisionNo, fromWarehouseId: doc.fromWarehouseId, toWarehouseId: doc.toWarehouseId, note: doc.note, lines: doc.lines },
    user.id
  );
  await tx.stockMovement.createMany({ data: movements });
});
```

- [ ] **Step 2: Run helper tests and lint**

Run:

```bash
npx tsx tests/inventory-posting.test.ts
npx tsx tests/document-form.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/transfer.ts
git commit -m "feat: post transfer documents immediately"
```

## Task 8: Add Multi-Line UI Payloads

**Files:**
- Modify: `components/import-form.tsx`
- Modify: `components/export-form.tsx`
- Modify: `components/transfer-form.tsx`

- [ ] **Step 1: Update forms to keep line state**

Each form should keep:

```ts
type DocumentLineState = {
  id: string;
  materialId: string;
  quantity: string;
  note: string;
};
```

Before submit, serialize valid rows:

```ts
formData.set(
  "lines",
  JSON.stringify(
    lines.map((line) => ({
      materialId: line.materialId,
      quantity: line.quantity,
      note: line.note || undefined,
    }))
  )
);
```

Keep client-side validation:

- at least one line
- every line has material
- every line has positive quantity

- [ ] **Step 2: Add row controls**

Use existing components plus `lucide-react` icons:

- `Plus` button to add a line.
- `Trash2` icon button to remove a line.
- `SearchableMaterialSelect` per line.
- Unit label from selected material.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/import-form.tsx components/export-form.tsx components/transfer-form.tsx
git commit -m "feat: support multi-line inventory forms"
```

## Task 9: Verification

**Files:**
- No code edits unless verification exposes a defect.

- [ ] **Step 1: Run behavior tests**

Run:

```bash
npx tsx tests/inventory-posting.test.ts
npx tsx tests/document-form.test.ts
```

Expected: both PASS.

- [ ] **Step 2: Run Prisma validation**

Run:

```bash
npx prisma validate
npx prisma generate
```

Expected: both PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS after generated artifacts are refreshed. If `.next/types` is stale, clean `.next` and rerun.

- [ ] **Step 5: Commit any verification fixes**

If fixes were needed:

```bash
git add <fixed-files>
git commit -m "fix: stabilize inventory document core"
```

## Scope Not Included in This Plan

- Posted document editing/revisions UI.
- Full document list/detail pages.
- Project/work item/norm schema.
- Dynamic permissions.
- Fund documents.
- Excel import/export and print views.
- Transfer approval, because client deferred it for demo.

These are later plans after the document core is stable.
