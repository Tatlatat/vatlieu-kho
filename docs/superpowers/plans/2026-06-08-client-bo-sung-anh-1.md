# Client Additions From 2026-06-08 Image 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the client additions from image 1 without turning this app into a heavier system than the client actually needs right now.

**Architecture:** Keep the current fixed role model (`ADMIN / MANAGER / KEEPER`) for this delivery. Add focused data structures for supplier internal codes, fixed units, selected transfer approvers, equipment-hour lines on import documents, opening-stock file import, and project-level cash summary. Record full configurable RBAC like image 2 as a later architecture project.

**Tech Stack:** Next.js 16 App Router, React 19, Server Actions, Prisma 6, PostgreSQL, Auth.js v5, shadcn/base-ui components, ExcelJS.

---

## 0. Read This First

### Source Of Truth

Before coding, read these files in this order:

- `docs/COLLAB-SOURCE-OF-TRUTH.md`
- `AGENTS.md`
- `prisma/schema.prisma`
- `lib/auth-helpers.ts`
- `proxy.ts`
- `lib/actions/documents.ts`
- `lib/actions/transfer-approve.ts`
- `lib/actions/opening.ts`
- `lib/actions/cash.ts`
- `lib/validation.ts`

### Confirmed Client Decisions

- `Mã NCC` is an internal supplier code. It is not the tax code.
- Transfer form must let the creator choose the destination-side keeper directly. The selected keeper is the user who receives and approves the request.
- Equipment/machines should appear as line items on an import document, but they must not become stock materials.
- Full permission matrix like image 2 is deferred. Do not implement dynamic permissions in this batch.

### Existing Dirty Worktree

At the time this plan was written, docs already had uncommitted changes:

- `README.md`
- `docs/AI-COLLAB-GUIDE.md`
- `docs/bugs-log.md`
- `docs/huong-dan-khach-hang.md`
- `docs/production-checklist.md`
- `docs/COLLAB-SOURCE-OF-TRUTH.md`
- old spec notes

Do not revert these changes. Work with them.

### Implementation Rules

- Use existing patterns: Server Actions in `lib/actions/*`, queries in `lib/queries/*`, client components in `components/*`.
- Keep ledger behavior intact. Posted stock documents are not edited or deleted; cancellation is done through void/reversal logic.
- Do not mix equipment hours into `StockMovement`.
- Do not implement image 2 dynamic RBAC in this batch.
- After every phase, run `npm run typecheck` and `npm run lint`.
- Before final handoff, run `npm run build`.

---

## 1. Delivery Order

Implement in this order:

1. Supplier internal code
2. Fixed unit catalog
3. Cash summary across projects
4. Bulk opening stock import
5. Transfer approval sent to selected destination keeper
6. Equipment/machine lines in import documents
7. Light role mapping and docs update

Reasoning:

- Phases 1-4 are mostly additive and can be verified independently.
- Phases 5-6 touch document workflow and audit behavior, so they come after easier wins.
- Phase 7 aligns permissions and docs after real behavior is known.

---

## 2. Backlog Only: Full RBAC Like Image 2

### Goal

Record image 2 as a later architecture project, not part of this batch.

### Required Later Changes

- Add dynamic roles with `code`, `name`, `description`.
- Add permission registry and role-permission matrix.
- Add UI to edit role permissions by module/action.
- Replace or wrap `requireAtLeast(...)` with permission-aware guards.
- Gate menus, buttons, Server Actions, and Excel exports by permission.
- Model domain actions explicitly:
  - `transfer.approve`
  - `stocktake.approve`
  - `document.void`
  - `opening.create`
  - `cash.export`
  - `user.manage`

### Do Not Do Now

- Do not add `Role` database table for dynamic roles.
- Do not replace the `Role` enum.
- Do not build a permission matrix screen.
- Do not make broad auth refactors while implementing image 1.

### Documentation Step

- [ ] Ensure `docs/COLLAB-SOURCE-OF-TRUTH.md` says full RBAC is deferred.

Expected verification:

```bash
rg -n "Full RBAC|permission matrix|ma trận" docs/COLLAB-SOURCE-OF-TRUTH.md
```

Expected result: one clear note saying full RBAC is a later architecture project.

---

## 3. Phase 1: Supplier Internal Code

### Goal

Add a client-managed internal supplier code (`Mã NCC`) separate from `taxCode`.

### Existing State

- `Supplier` has `name`, `taxCode`, `address`, `contact`, `note`.
- `components/supplier-manager.tsx` already supports create/edit/delete.
- `lib/actions/suppliers.ts` validates with `supplierSchema`.
- `lib/queries/suppliers.ts` must be checked and updated; do not assume it selects every field.

### Data Model

Modify `prisma/schema.prisma`:

```prisma
model Supplier {
  id        String     @id @default(cuid())
  code      String     @unique
  name      String
  taxCode   String?
  address   String?
  contact   String?
  note      String?
  createdAt DateTime   @default(now())
  documents Document[]
}
```

Create migration:

- `prisma/migrations/20260608180000_supplier_internal_code/migration.sql`

Migration content:

```sql
ALTER TABLE "Supplier" ADD COLUMN "code" TEXT;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Supplier"
  WHERE "code" IS NULL
)
UPDATE "Supplier" s
SET "code" = 'NCC' || LPAD(numbered.rn::text, 3, '0')
FROM numbered
WHERE s.id = numbered.id;

CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
ALTER TABLE "Supplier" ALTER COLUMN "code" SET NOT NULL;
```

### Backend Changes

Modify `lib/validation.ts`:

```ts
export const supplierSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã NCC").max(50),
  name: z.string().min(1, "Vui lòng nhập tên nhà cung cấp"),
  taxCode: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  contact: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});
```

Modify `lib/actions/suppliers.ts`:

- Read `code` from input.
- Trim `code`; reject empty values through `supplierSchema`.
- Catch Prisma `P2002` and return `"Mã NCC đã được dùng."`.
- Preserve current `KEEPER+` guard unless Phase 7 changes mapping.
- Revalidate both `/nha-cung-cap` and `/danh-muc`.

Modify `lib/queries/suppliers.ts`:

- Select `id`, `code`, `name`, `taxCode`, `address`, `contact`, `note`.
- Order by `code ASC NULLS LAST` is not directly Prisma-friendly. Use `orderBy: [{ code: "asc" }, { name: "asc" }]`.

Modify `prisma/seed.ts`:

- Give seeded suppliers stable codes like `NCC001`, `NCC002`.

### UI Changes

Modify `components/supplier-manager.tsx`:

- Extend `Supplier` interface with `code?: string | null`.
- Add table column `Mã NCC`.
- Add `Mã NCC` input to create dialog.
- Add `Mã NCC` input to edit dialog.
- Mark `Mã NCC` as required in both dialogs.
- Send `code` to `createSupplier` and `updateSupplier`.

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Create supplier with code `NCC999`.
- Edit code to `NCC998`.
- Try creating another supplier with `NCC998`.
- Expected: duplicate rejected with friendly error.
- Open import form and verify supplier dropdown still works.

### Done Criteria

- Existing suppliers have codes after migration.
- Supplier list displays `Mã NCC`.
- Create/edit preserves tax lookup behavior.
- No report or document query breaks.

---

## 4. Phase 2: Fixed Unit Catalog

### Goal

Replace free-text material unit entry with a managed unit catalog while keeping existing reports stable.

### Existing State

- `Material.unit` is a string.
- `Material.unit` is used by stock views, report queries, document line display, print page, and Excel output.
- Removing `Material.unit` now would cause broad breakage.

### Data Model

Modify `prisma/schema.prisma`:

```prisma
model Unit {
  id        String     @id @default(cuid())
  code      String     @unique
  name      String
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  materials Material[]
}

model Material {
  id             String          @id @default(cuid())
  name           String
  code           String          @unique
  unit           String
  unitId         String?
  unitRef        Unit?           @relation(fields: [unitId], references: [id], onDelete: SetNull)
  minStock       Float           @default(0)
  createdAt      DateTime        @default(now())
  movements      StockMovement[]
  stocktakeItems StocktakeItem[]
  documentLines  DocumentLine[]

  @@index([unitId])
}
```

Create migration:

- `prisma/migrations/20260608181000_unit_catalog/migration.sql`

Migration content:

```sql
CREATE TABLE "Unit" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

ALTER TABLE "Material" ADD COLUMN "unitId" TEXT;
CREATE INDEX "Material_unitId_idx" ON "Material"("unitId");

INSERT INTO "Unit" ("id", "code", "name")
SELECT
  'unit_' || md5(lower(trim(unit))),
  upper(regexp_replace(trim(unit), '\s+', '_', 'g')),
  trim(unit)
FROM "Material"
WHERE trim(unit) <> ''
GROUP BY trim(unit);

UPDATE "Material" m
SET "unitId" = u.id
FROM "Unit" u
WHERE lower(trim(m.unit)) = lower(trim(u.name));

ALTER TABLE "Material"
ADD CONSTRAINT "Material_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Backend Changes

Create `lib/queries/units.ts`:

```ts
import { prisma } from "@/lib/prisma";

export async function getActiveUnits() {
  return prisma.unit.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, code: true, name: true },
  });
}

export async function getAllUnits() {
  return prisma.unit.findMany({
    orderBy: [{ name: "asc" }],
    select: { id: true, code: true, name: true, isActive: true, _count: { select: { materials: true } } },
  });
}
```

Create `lib/actions/units.ts`:

- Guard: `requireAtLeast("MANAGER")`.
- Actions:
  - `createUnit({ code, name })`
  - `updateUnit(id, { code, name, isActive })`
  - `deleteUnit(id)`
- Delete rule:
  - If unit has materials, do not delete. Return `"Đơn vị tính đang được dùng — không thể xóa."`.
- Duplicate code:
  - Catch `P2002`, return `"Mã đơn vị tính đã được dùng."`.

Modify `lib/validation.ts`:

```ts
export const unitSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã đơn vị"),
  name: z.string().trim().min(1, "Vui lòng nhập tên đơn vị"),
  isActive: z.boolean().optional(),
});

export const materialSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên vật liệu"),
  code: z.string().min(1, "Vui lòng nhập mã vật liệu"),
  unitId: z.string().min(1, "Vui lòng chọn đơn vị tính"),
  minStock: z.coerce.number().min(0, "Mức tối thiểu không được âm").optional().default(0),
});
```

Modify `lib/actions/materials.ts`:

- Read `unitId`.
- Find unit by `unitId`.
- Store `unitId` and denormalized `unit: unit.name`.
- Keep existing duplicate material code handling.

### UI Changes

Create `components/unit-manager.tsx`:

- Table columns: `STT`, `Mã`, `Tên đơn vị`, `Trạng thái`, `Số vật tư dùng`, `Hành động`.
- Create/edit dialog fields: `Mã đơn vị`, `Tên đơn vị`, `Đang dùng`.
- Delete disabled or blocked if `_count.materials > 0`.

Modify `app/(app)/danh-muc/page.tsx`:

- Add tab `{ key: "don-vi", label: "Đơn vị tính", minRole: "MANAGER" }`.
- Fetch `getAllUnits()` only when active tab is `don-vi`.
- Render `UnitManager`.
- For `vat-tu` tab, also fetch `getActiveUnits()` and pass into `MaterialManager`.

Modify `components/material-manager.tsx`:

- Accept prop `units`.
- Replace unit text input with select.
- On edit, default to `material.unitId` if available; fallback by unit name if necessary.
- Material interface must include `unitId?: string | null`.

Modify `lib/queries/stock.ts`:

- Ensure `getMaterials()` selects `unitId` if `MaterialManager` depends on it.

Modify `prisma/seed.ts`:

- Seed common units:
  - `KG` / `kg`
  - `CAY` / `cây`
  - `MD` / `md`
  - `BAO` / `bao`
  - `M3` / `m3`
  - `VIEN` / `viên`
- Link seeded materials to unit IDs and keep `unit` string populated.

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Open `/danh-muc?tab=don-vi`.
- Create unit `TAN` / `tấn`.
- Create material using unit `tấn`.
- Edit material to another unit.
- Verify dashboard and reports still show `unit`.

### Done Criteria

- Users can manage fixed units.
- Material form no longer allows arbitrary unit text.
- Reports and print pages still work because `Material.unit` remains populated.

---

## 5. Phase 3: Cash Summary Across Projects

### Goal

Add a project-level cash summary: total income, total expense, balance, and fund count across all construction projects.

### Existing State

- `Project` exists.
- `Fund.projectId` exists.
- `CashEntry` exists.
- `fund_balance` view exists.
- `/quy` currently shows one selected fund at a time.

### Query Changes

Modify `lib/queries/cash.ts`.

Add types:

```ts
export interface ProjectCashSummaryRow {
  project_id: string | null;
  project_code: string | null;
  project_name: string;
  fund_count: number;
  total_in: number;
  total_out: number;
  balance: number;
}
```

Add query:

```ts
export async function getProjectCashSummary(from: string, to: string): Promise<ProjectCashSummaryRow[]> {
  const rows = await prisma.$queryRaw<ProjectCashSummaryRow[]>`
    WITH fund_scope AS (
      SELECT f.id AS fund_id, f."projectId", p.code AS project_code, p.name AS project_name
      FROM "Fund" f
      LEFT JOIN "Project" p ON p.id = f."projectId"
      WHERE f."isActive" = true
    ),
    period AS (
      SELECT ce."fundId", ce.type, SUM(ce.amount)::float8 AS total
      FROM "CashEntry" ce
      WHERE ce."voidedAt" IS NULL
        AND ce."entryDate" >= ${new Date(`${from}T00:00:00.000Z`)}
        AND ce."entryDate" <= ${new Date(`${to}T23:59:59.999Z`)}
      GROUP BY ce."fundId", ce.type
    )
    SELECT
      fs."projectId" AS project_id,
      fs.project_code,
      COALESCE(fs.project_name, 'Chưa gắn công trình') AS project_name,
      COUNT(DISTINCT fs.fund_id)::int AS fund_count,
      COALESCE(SUM(CASE WHEN p.type = 'THU' THEN p.total ELSE 0 END), 0)::float8 AS total_in,
      COALESCE(SUM(CASE WHEN p.type = 'CHI' THEN p.total ELSE 0 END), 0)::float8 AS total_out,
      (COALESCE(SUM(CASE WHEN p.type = 'THU' THEN p.total ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN p.type = 'CHI' THEN p.total ELSE 0 END), 0))::float8 AS balance
    FROM fund_scope fs
    LEFT JOIN period p ON p."fundId" = fs.fund_id
    GROUP BY fs."projectId", fs.project_code, fs.project_name
    ORDER BY fs.project_name NULLS LAST`;

  return rows.map((r) => ({
    ...r,
    fund_count: Number(r.fund_count),
    total_in: Number(r.total_in),
    total_out: Number(r.total_out),
    balance: Number(r.balance),
  }));
}
```

### UI Changes

Create `components/project-cash-summary.tsx`:

- Props: `rows`, `from`, `to`.
- Display table:
  - `Công trình`
  - `Số quỹ`
  - `Tổng thu`
  - `Tổng chi`
  - `Tồn trong kỳ`
- Add total row at bottom.
- Add Excel link:
  - `/api/quy/tong-hop-excel?from=<from>&to=<to>`

Modify `app/(app)/quy/page.tsx`:

- Add view mode from `searchParams.view`.
- `view=ledger` shows current selected fund ledger.
- `view=summary` shows project summary.
- Default can remain `ledger` to avoid surprising users.
- Fetch `getProjectCashSummary(from, to)` only when `view === "summary"`.

Create `app/api/quy/tong-hop-excel/route.ts`:

- Guard with `requireAtLeast("MANAGER")`.
- Use `getProjectCashSummary(from, to)`.
- Use ExcelJS.
- Sheet columns:
  - `Mã công trình`
  - `Tên công trình`
  - `Số quỹ`
  - `Tổng thu`
  - `Tổng chi`
  - `Tồn trong kỳ`

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Open `/quy?view=summary`.
- Change date range.
- Export Excel.
- Compare UI totals with direct DB query:

```sql
SELECT type, SUM(amount)
FROM "CashEntry"
WHERE "voidedAt" IS NULL
GROUP BY type;
```

### Done Criteria

- Quỹ page can switch between ledger and project summary.
- Summary includes funds not linked to a project as `Chưa gắn công trình`.
- Excel exports same totals shown in UI.

---

## 6. Phase 4: Bulk Opening Stock Import

### Goal

Allow users to import opening stock in bulk from an Excel file while keeping the existing manual table.

### Existing State

- `components/opening-stock-form.tsx` supports manual multi-line entry.
- `lib/actions/opening.ts` contains `createOpeningStock(entries)`.
- `createOpeningStock` already validates duplicates and blocks material-warehouse slots that have transactions.

### File Format

Template columns:

| Column | Required | Meaning |
|---|---|---|
| `ma_kho` | yes | `Warehouse.code` |
| `ma_vat_tu` | yes | `Material.code` |
| `so_luong` | yes | positive number |

### Parser

Create `lib/opening-import.ts`.

Exports:

```ts
export interface OpeningImportRow {
  rowNumber: number;
  warehouseCode: string;
  materialCode: string;
  quantity: number;
}

export interface OpeningImportValidationError {
  rowNumber: number;
  message: string;
}

export interface OpeningImportValidationResult {
  entries: { warehouseId: string; materialId: string; quantity: number }[];
  errors: OpeningImportValidationError[];
}
```

Functions:

- `parseOpeningStockWorkbook(buffer: ArrayBuffer): Promise<OpeningImportRow[]>`
- `validateOpeningRows(rows: OpeningImportRow[]): Promise<OpeningImportValidationResult>`

Validation rules:

- Missing `ma_kho`: row error.
- Missing `ma_vat_tu`: row error.
- Missing or non-positive `so_luong`: row error.
- Unknown warehouse code: row error.
- Unknown material code: row error.
- Duplicate pair in file: row error.
- Pair already has `StockMovement`: row error.

### Server Action

Create `lib/actions/opening-import.ts`.

Action:

```ts
export async function importOpeningStock(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  errors?: { rowNumber: number; message: string }[];
  insertedCount?: number;
}>
```

Behavior:

- Guard with `requireAtLeast("MANAGER")`.
- Read file from `formData.get("file")`.
- Parse and validate file.
- If errors exist, return `{ ok: false, errors }` and write nothing.
- If valid, call `createOpeningStock(entries)`.

### Template Route

Create `app/api/ton-dau-ky/template/route.ts`.

Behavior:

- Guard with `requireAtLeast("MANAGER")`.
- Create workbook with one sheet.
- Header row: `ma_kho`, `ma_vat_tu`, `so_luong`.
- Include example rows with concrete sample values: `KHO-CHINH`, `XM-PCB40`, `100`; `KHO-CHINH`, `THEP-D10`, `50`.
- Return `.xlsx` response with download filename `mau-ton-dau-ky.xlsx`.

### UI Changes

Modify `components/opening-stock-form.tsx`:

- Add a compact import panel above the manual table.
- Add button/link `Tải file mẫu`.
- Add file input accepting `.xlsx`.
- Add button `Nhập từ file`.
- Show row-level errors in a simple table if import returns errors.
- Keep manual input unchanged.

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Download template.
- Upload valid file.
- Verify opening documents are created.
- Upload file with unknown material code.
- Expected: row-level error and no stock movements inserted.
- Upload duplicate material-warehouse pair.
- Expected: duplicate row-level error and no writes.

### Done Criteria

- Manual opening stock still works.
- Excel import is all-or-nothing.
- Error messages name exact row numbers.

---

## 7. Phase 5: Transfer Approval Sent To Selected Destination Keeper

### Goal

Change transfer flow so non-admin creators choose the destination keeper who receives and approves the transfer request. Admin-created transfers can post immediately.

### Existing State

- `Document` has `createdById`, `approvedById`.
- `transfer-approve.ts` prevents creator from approving unless `ADMIN`.
- There is no selected approver field.
- Transfer form currently has source warehouse, destination warehouse, date, reason, note, and material lines.

### Data Model

Modify `prisma/schema.prisma`.

In `User`:

```prisma
transferRequestsToApprove Document[] @relation("docRequestedApprover")
```

In `Document`:

```prisma
requestedApproverId String?
requestedApprover   User? @relation("docRequestedApprover", fields: [requestedApproverId], references: [id])

@@index([requestedApproverId])
```

Create migration:

- `prisma/migrations/20260608183000_transfer_requested_approver/migration.sql`

Migration content:

```sql
ALTER TABLE "Document" ADD COLUMN "requestedApproverId" TEXT;
CREATE INDEX "Document_requestedApproverId_idx" ON "Document"("requestedApproverId");
ALTER TABLE "Document"
ADD CONSTRAINT "Document_requestedApproverId_fkey"
FOREIGN KEY ("requestedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Query Changes

Modify `lib/queries/users.ts`.

Add:

```ts
export async function getTransferApprovers() {
  return prisma.user.findMany({
    where: { role: "KEEPER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}
```

Modify `lib/queries/documents.ts`:

- Include `requestedApprover: { select: { id: true, name: true, email: true } }`.

### Validation Changes

Modify `lib/validation.ts`:

- Add `requestedApproverId: z.string().optional()` to `docHeaderSchema`.

### Action Changes

Modify `lib/actions/documents.ts`:

- In `saveDraft`, when `d.type === "TRANSFER"`, store `requestedApproverId: d.requestedApproverId ?? null`.
- For non-transfer documents, store `requestedApproverId: null`.

Modify `lib/actions/transfer-approve.ts`:

Extract shared posting logic:

```ts
async function postTransferDocument(tx: Prisma.TransactionClient, docId: string, approverId: string) {
  // Move existing approveTransfer transaction body here after doc loading.
  // Keep advisory locks, stock checks, TRANSFER_OUT/TRANSFER_IN creation, and status update.
}
```

New behavior:

- `submitTransferForApproval(documentId)`:
  - Load doc and current user.
  - Validate type/status/lines/source/destination.
  - If current user is `ADMIN`, call `postTransferDocument(...)` immediately and return success.
  - If not `ADMIN`, require `doc.requestedApproverId`.
  - If `doc.requestedApproverId === user.id`, reject with `"Người lập phiếu không được chọn chính mình làm người duyệt."`.
  - Set status `PENDING`.

- `approveTransfer(documentId)`:
  - Load doc.
  - If current user is not `ADMIN` and `doc.requestedApproverId !== user.id`, reject with `"Chỉ thủ kho được chỉ định hoặc quản trị viên mới được duyệt phiếu này."`.
  - Call shared posting function.

- `rejectTransfer(documentId)`:
  - Same permission rule as approve.
  - Set status back to `DRAFT`.

### Page/UI Changes

Modify `app/(app)/chuyen-kho/moi/page.tsx`:

- Fetch:
  - `getMaterials()`
  - `getWarehouses()`
  - `getTransferApprovers()`
  - `requireUser()`
- Pass `currentUser` and `approvers` to `TransferDocForm`.

Modify `components/transfer-doc-form.tsx`:

- Add props:

```ts
currentUser: { id: string; role: "ADMIN" | "MANAGER" | "KEEPER" };
approvers: { id: string; name: string; email?: string | null }[];
```

- Add state `requestedApproverId`.
- Show select `Thủ kho đích duyệt` when `currentUser.role !== "ADMIN"`.
- Filter out current user from approver options.
- If no approvers are available, disable submit and show a small warning.
- Include `requestedApproverId` in `saveDraft`.
- Submit button label:
  - Admin: `Lưu & Lập phiếu`
  - Others: `Lưu & Gửi thủ kho đích duyệt`

Modify `app/(app)/chuyen-kho/[id]/page.tsx`:

- Show requested approver in metadata.

Modify `components/document-detail-actions.tsx`:

- Pass `canApproveTransfer` from the detail page.
- Hide approve/reject buttons when the current user is neither `ADMIN` nor the selected requested approver.
- Keep server action as final authority because UI hiding is not security.

Modify `app/(app)/phieu/[id]/in/page.tsx`:

- Show requested approver for transfer documents.

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Login as `ADMIN`, create transfer, click submit.
- Expected: document becomes `POSTED`, no `PENDING`.
- Login as `KEEPER A`, create transfer and select `KEEPER B`.
- Expected: document becomes `PENDING`.
- Login as `KEEPER A`, try approving own pending transfer.
- Expected: rejected.
- Login as `KEEPER C`, try approving transfer assigned to `KEEPER B`.
- Expected: rejected.
- Login as `KEEPER B`, approve.
- Expected: transfer posts, movements created.
- Login as `ADMIN`, approve/reject any pending transfer.
- Expected: allowed.

### Done Criteria

- Transfer has selected destination approver.
- Admin-created transfer can bypass approval.
- Wrong keeper cannot approve.
- Selected keeper can approve.
- Stock movement behavior remains unchanged.

---

## 8. Phase 6: Equipment/Machine Lines In Import Documents

### Goal

Allow import documents to contain equipment/machine hour lines alongside material lines. These lines behave like phiếu lines in the UI, but they create `EquipmentLog` records, not stock movements.

### Existing State

- `Equipment` and `EquipmentLog` already exist.
- Equipment logs can be created from `components/equipment-manager.tsx`.
- Import documents currently only store `DocumentLine` material rows.
- Voiding import documents currently reverses stock movements only.

### Data Model

Modify `prisma/schema.prisma`.

Add:

```prisma
model DocumentEquipmentLine {
  id          String    @id @default(cuid())
  documentId  String
  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  equipmentId String
  equipment   Equipment @relation(fields: [equipmentId], references: [id])
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
  hours       Float
  note        String?
  log         EquipmentLog?

  @@index([documentId])
  @@index([equipmentId])
  @@index([projectId])
}
```

Update existing models. Name the new relations explicitly because `EquipmentLog` will point to `User` and `Document` in more than one way:

```prisma
model Document {
  equipmentLines DocumentEquipmentLine[]
  equipmentLogs   EquipmentLog[]          @relation("equipmentLogDocument")
}

model Equipment {
  documentLines DocumentEquipmentLine[]
}

model Project {
  documentEquipmentLines DocumentEquipmentLine[]
}

model User {
  equipmentLogs       EquipmentLog[] @relation("equipmentLogCreated")
  equipmentLogsVoided EquipmentLog[] @relation("equipmentLogVoided")
}

model EquipmentLog {
  createdBy               User      @relation("equipmentLogCreated", fields: [createdById], references: [id])
  documentId              String?
  document                Document? @relation("equipmentLogDocument", fields: [documentId], references: [id], onDelete: SetNull)
  documentEquipmentLineId String?   @unique
  documentEquipmentLine   DocumentEquipmentLine? @relation(fields: [documentEquipmentLineId], references: [id], onDelete: SetNull)
  voidedAt                DateTime?
  voidedById              String?
  voidedBy                User?     @relation("equipmentLogVoided", fields: [voidedById], references: [id])
  voidReason              String?

  @@index([documentId])
  @@index([voidedById])
}
```

Create migration:

- `prisma/migrations/20260608184000_document_equipment_lines/migration.sql`

Migration content:

```sql
CREATE TABLE "DocumentEquipmentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "projectId" TEXT,
  "hours" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  CONSTRAINT "DocumentEquipmentLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentEquipmentLine_documentId_idx" ON "DocumentEquipmentLine"("documentId");
CREATE INDEX "DocumentEquipmentLine_equipmentId_idx" ON "DocumentEquipmentLine"("equipmentId");
CREATE INDEX "DocumentEquipmentLine_projectId_idx" ON "DocumentEquipmentLine"("projectId");

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_equipmentId_fkey"
FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentEquipmentLine"
ADD CONSTRAINT "DocumentEquipmentLine_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog" ADD COLUMN "documentId" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "documentEquipmentLineId" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "EquipmentLog" ADD COLUMN "voidedById" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "voidReason" TEXT;

CREATE UNIQUE INDEX "EquipmentLog_documentEquipmentLineId_key" ON "EquipmentLog"("documentEquipmentLineId");
CREATE INDEX "EquipmentLog_documentId_idx" ON "EquipmentLog"("documentId");
CREATE INDEX "EquipmentLog_voidedById_idx" ON "EquipmentLog"("voidedById");

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_documentEquipmentLineId_fkey"
FOREIGN KEY ("documentEquipmentLineId") REFERENCES "DocumentEquipmentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentLog"
ADD CONSTRAINT "EquipmentLog_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Validation Changes

Modify `lib/validation.ts`.

Add:

```ts
export const docEquipmentLineSchema = z.object({
  equipmentId: z.string().min(1, "Vui lòng chọn xe/máy"),
  hours: z.coerce.number().positive("Số giờ phải lớn hơn 0"),
  projectId: z.string().optional().nullable(),
  note: z.string().max(500).optional(),
});
```

Extend `docHeaderSchema`:

```ts
equipmentLines: z.array(docEquipmentLineSchema).optional().default([]),
```

Rules:

- `IN` document can have material lines, equipment lines, or both.
- `OUT` and `TRANSFER` ignore/reject equipment lines.
- At least one material line or equipment line is required for `IN`.

### Query Changes

Modify `lib/queries/equipment.ts`:

- Update `getEquipmentLogs` to exclude voided logs by default or return void status clearly.
- Add `getActiveEquipmentForSelect()` selecting `id`, `code`, `name`, `type`, `plateNo`.

Modify `lib/queries/documents.ts`:

- Include `equipmentLines`:

```ts
equipmentLines: {
  include: {
    equipment: { select: { code: true, name: true, type: true, plateNo: true } },
    project: { select: { code: true, name: true } },
  },
}
```

### Action Changes

Modify `lib/actions/documents.ts`.

In `saveDraft`:

- If `d.type === "IN"`, allow `d.equipmentLines`.
- Store `equipmentLines.create`.
- If `d.type !== "IN"` and equipment lines exist, return error.

In `postDocument`:

- For `IN`, allow document with only equipment lines.
- Keep material movement creation unchanged.
- For each equipment line, create `EquipmentLog` in the same transaction:

```ts
const log = await tx.equipmentLog.create({
  data: {
    equipmentId: line.equipmentId,
    logDate: doc.docDate,
    hours: line.hours,
    projectId: line.projectId,
    note: line.note ?? doc.note,
    documentId: doc.id,
    documentEquipmentLineId: line.id,
    createdById: user.id,
  },
});
```

In `voidDocument`:

- When voiding an `IN` document, find related active `EquipmentLog` records by `documentId`.
- Set `voidedAt`, `voidedById`, `voidReason`.
- Do not delete equipment logs.

### UI Changes

Create `components/document-equipment-line-editor.tsx`.

Props:

```ts
interface EquipmentOption {
  id: string;
  code?: string | null;
  name: string;
  type?: string | null;
  plateNo?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export interface EquipmentLineItem {
  equipmentId: string;
  hours: string;
  projectId?: string;
  note?: string;
  _key: string;
}
```

Table columns:

- `Xe/máy`
- `Số giờ`
- `Công trình`
- `Ghi chú`
- delete icon

Modify `app/(app)/nhap/moi/page.tsx`:

- Fetch `getActiveEquipmentForSelect()`.
- Fetch `getAllProjects()` or active projects query.
- Pass to `ImportDocForm`.

Modify `components/import-doc-form.tsx`:

- Add `equipmentLines` state.
- Render material lines section as today.
- Render equipment lines section below it.
- Validation:
  - At least one valid material line or equipment line.
  - Equipment line requires equipment and positive hours.
- Submit `equipmentLines` to `saveDraft`.

Modify `app/(app)/nhap/[id]/page.tsx`:

- Render equipment lines below material lines.
- If no equipment lines, show nothing.

Modify `app/(app)/phieu/[id]/in/page.tsx`:

- Print equipment lines below material lines for `IN` documents.

### Verification

Run:

```bash
npm run typecheck
npm run lint
```

Manual checks:

- Create import with only material lines.
- Expected: behavior unchanged.
- Create import with material + equipment lines.
- Expected: stock movement and equipment log created.
- Create import with only equipment lines.
- Expected: no stock movement, equipment log created, document posts.
- Void import with equipment lines.
- Expected: stock reversal happens for material lines; equipment logs are marked voided.
- Open equipment manager/logs.
- Expected: voided logs are not counted as active hours if reports/log list excludes them.

### Done Criteria

- Equipment appears in import phiếu like a line item.
- Equipment hours do not affect stock quantities.
- Posted import creates equipment logs.
- Voided import does not leave active equipment hours behind.

---

## 9. Phase 7: Light Role Mapping Only

### Goal

Align current fixed roles with client image 1 without building dynamic RBAC.

### Target Mapping

`ADMIN`:

- Full current rights.
- Manage users.
- Manage setup/category data.
- Opening stock.
- Admin transfer auto-post.
- Can approve/reject any pending transfer as rescue override.

`MANAGER`:

- View categories.
- Create supplier code.
- Create/edit materials and units.
- Import/export/transfer.
- Stock report.
- Cash report.
- Print documents.
- Export Excel.

`KEEPER`:

- View categories.
- Create supplier code.
- Import/export/transfer.
- Stock report.
- Print documents.
- Export Excel.
- Approve transfer only when selected as destination approver.

### Files To Review

- `lib/auth-helpers.ts`
- `proxy.ts`
- `components/nav.tsx`
- `app/(app)/bao-cao/page.tsx`
- `app/api/bao-cao/excel/route.ts`
- `app/api/quy/excel/route.ts`
- `app/api/quy/tong-hop-excel/route.ts`
- `app/(app)/danh-muc/page.tsx`
- `lib/actions/suppliers.ts`
- `lib/actions/materials.ts`
- `lib/actions/units.ts`
- `lib/actions/transfer-approve.ts`

### Steps

- [ ] Compare current guards against the target mapping.
- [ ] Keep `users` as `ADMIN` only.
- [ ] Keep `quy` as `MANAGER+` unless client explicitly asks keeper to see cash report.
- [ ] Keep material/unit CRUD as `MANAGER+`.
- [ ] Keep supplier create/edit as `KEEPER+`.
- [ ] Ensure `KEEPER` can access stock report and stock Excel export.
- [ ] Ensure selected `KEEPER` can approve assigned transfer.
- [ ] Update `docs/COLLAB-SOURCE-OF-TRUTH.md`.
- [ ] Do not add dynamic permissions.

### Verification

Manual checks with seeded users:

- `owner@vatlieu.vn` as `ADMIN`
- `manager@vatlieu.vn` as `MANAGER`
- `staff@vatlieu.vn` as `KEEPER`

Check:

- Menus are visible according to mapping.
- Server actions reject unauthorized users even if button is manually called.
- Selected keeper can approve assigned transfer.
- Non-selected keeper cannot approve assigned transfer.

### Done Criteria

- Current fixed role model remains intact.
- Behavior matches image 1 needs.
- Full image 2 RBAC remains deferred in docs.

---

## 10. Final Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Database sanity checks:

```sql
SELECT COUNT(*) FROM "Supplier" WHERE "code" IS NULL;
SELECT COUNT(*) FROM "Material" WHERE "unitId" IS NULL;
SELECT type, status, COUNT(*) FROM "Document" GROUP BY type, status ORDER BY type, status;
SELECT COUNT(*) FROM "EquipmentLog" WHERE "voidedAt" IS NULL;
```

Manual end-to-end checks:

- Supplier code create/edit/duplicate rejection.
- Unit catalog create/edit and material form select.
- Project cash summary UI and Excel export.
- Opening stock template download and all-or-nothing import.
- Admin transfer auto-post.
- Keeper transfer assigned to destination keeper.
- Selected keeper approval.
- Wrong keeper rejection.
- Import document with material lines.
- Import document with equipment lines.
- Void import document with equipment logs.
- Print import document with equipment lines.

Docs checks:

```bash
rg -n "Full RBAC|permission matrix|ma trận|ảnh 2" docs/COLLAB-SOURCE-OF-TRUTH.md docs/superpowers/plans/2026-06-08-client-bo-sung-anh-1.md
```

Expected:

- Full RBAC is clearly marked deferred.
- Image 1 implementation plan is specific enough to execute phase-by-phase.

---

## 11. Handoff Notes For Small Models

When implementing this plan:

- Do one phase at a time.
- Do not start Phase 5 or Phase 6 until Phases 1-4 pass `typecheck` and `lint`.
- If a field is added to schema, update this full chain:
  - schema
  - migration
  - validation
  - action write
  - query read
  - component props
  - UI render
  - print/export if relevant
- If a document line type is added, update detail page and print page.
- If a new user-facing field is added, verify it appears in actual rendered HTML, not just TypeScript.
- If uncertain about a permission, keep server action stricter and document the decision.
