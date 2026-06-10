# Foundation Catalogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 4: foundation catalogs for units, suppliers, and material tracking type, then attach suppliers to import documents.

**Architecture:** Add `Unit` and `Supplier` as first-class catalogs and add material classification fields without changing stock posting math. Keep the legacy `Material.unit` string synchronized from the selected `Unit` so existing SQL views and reports continue to work. Store `supplierId` on import documents only; supplier metadata is shown on document detail and list screens but does not affect inventory movements.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL, Zod, `tsx` behavior tests, existing UI primitives, lucide-react icons.

---

## Scope

Included:
- `Unit` catalog with create/update actions and list UI.
- `Supplier` catalog with create/update actions and list UI.
- `MaterialKind` and `TrackingMode` enums on `Material`.
- Material create/edit uses selected unit, optional min stock, kind, and tracking mode.
- Import create/edit can select an optional supplier.
- Import document list/detail shows supplier when present.

Deferred:
- Tax-code API lookup for suppliers.
- Multi-unit conversion between kg/cay/md.
- Dedicated vehicle/machine hour-entry documents.
- Dynamic permissions; this phase keeps existing `OWNER` checks for catalog management.
- Fund receipt/payment documents.

## Data Decisions

- `Material.unit` remains required for compatibility with `current_stock`, `stock_by_material`, and existing report queries.
- `Material.unitId` is nullable during migration, then new create/edit actions require it and copy `Unit.name` into `Material.unit`.
- Default material values are `kind = MATERIAL` and `trackingMode = QUANTITY`.
- Vehicle and machine records are materials with `kind = VEHICLE` or `MACHINE`; this phase only classifies them and prepares tracking mode.
- `InventoryDocument.supplierId` is nullable and only meaningful for `IMPORT`.

## File Structure

- Modify `prisma/schema.prisma`: add `Unit`, `Supplier`, `MaterialKind`, `TrackingMode`; add `Material.unitId`, `Material.kind`, `Material.trackingMode`; add `InventoryDocument.supplierId`.
- Create `prisma/migrations/20260610170000_foundation_catalogs/migration.sql`: defensive migration that creates units from existing `Material.unit`, links materials, creates suppliers, and adds supplier FK to documents.
- Create `lib/catalogs/material-catalog.ts`: pure helpers for form normalization and labels.
- Create `tests/material-catalog.test.ts`: TDD coverage for min-stock defaults and allowed enum values.
- Modify `lib/validation.ts`: material schema accepts `unitId`, optional `minStock`, `kind`, and `trackingMode`; add unit/supplier schemas.
- Modify `lib/actions/materials.ts`: material create/update loads selected unit and stores both `unitId` and `unit`.
- Create `lib/actions/catalogs.ts`: create/update unit and supplier server actions.
- Create `lib/queries/catalogs.ts`: get units and suppliers for forms.
- Modify `lib/actions/movements.ts` and `lib/actions/documents.ts`: persist `supplierId` on import create/edit; clear it for export/transfer.
- Modify `lib/queries/documents.ts`: include supplier on list/detail.
- Modify `components/material-manager.tsx`: add unit/kind/tracking mode selectors, make min stock optional, show catalog count.
- Create `components/unit-manager.tsx` and `components/supplier-manager.tsx`.
- Modify `components/import-form.tsx`: add supplier selector and include it in edit mode.
- Modify `components/inventory-document-list.tsx` and `components/inventory-document-detail.tsx`: show supplier for import documents.
- Modify `app/(app)/vat-lieu/page.tsx`: load units/suppliers and render catalog sections.
- Modify `app/(app)/nhap/moi/page.tsx` and `app/(app)/phieu/[id]/sua/page.tsx`: pass suppliers into `ImportForm`.

## Task 1: Catalog Helper Test

- [ ] Add `tests/material-catalog.test.ts` with:

```ts
import assert from "node:assert/strict";
import {
  MATERIAL_KIND_LABELS,
  TRACKING_MODE_LABELS,
  normalizeOptionalMinStock,
  requireCatalogChoice,
} from "../lib/catalogs/material-catalog";

assert.equal(normalizeOptionalMinStock(null), 0);
assert.equal(normalizeOptionalMinStock(""), 0);
assert.equal(normalizeOptionalMinStock("12.5"), 12.5);
assert.throws(() => normalizeOptionalMinStock("-1"), /không được âm/);
assert.throws(() => normalizeOptionalMinStock("abc"), /không hợp lệ/);
assert.equal(requireCatalogChoice("unit-1", "đơn vị tính"), "unit-1");
assert.throws(() => requireCatalogChoice("", "đơn vị tính"), /Vui lòng chọn đơn vị tính/);
assert.equal(MATERIAL_KIND_LABELS.MATERIAL, "Vật tư");
assert.equal(MATERIAL_KIND_LABELS.VEHICLE, "Xe");
assert.equal(MATERIAL_KIND_LABELS.MACHINE, "Máy");
assert.equal(TRACKING_MODE_LABELS.QUANTITY, "Theo số lượng");
assert.equal(TRACKING_MODE_LABELS.HOURS, "Theo giờ làm");

console.log("material-catalog tests passed");
```

- [ ] Run `npx tsx tests/material-catalog.test.ts`.
- [ ] Expected: fail because `lib/catalogs/material-catalog.ts` does not exist.

## Task 2: Catalog Helper Implementation

- [ ] Create `lib/catalogs/material-catalog.ts` with label maps and normalization:

```ts
export const MATERIAL_KIND_VALUES = ["MATERIAL", "VEHICLE", "MACHINE"] as const;
export const TRACKING_MODE_VALUES = ["QUANTITY", "HOURS"] as const;

export type MaterialKindValue = (typeof MATERIAL_KIND_VALUES)[number];
export type TrackingModeValue = (typeof TRACKING_MODE_VALUES)[number];

export const MATERIAL_KIND_LABELS: Record<MaterialKindValue, string> = {
  MATERIAL: "Vật tư",
  VEHICLE: "Xe",
  MACHINE: "Máy",
};

export const TRACKING_MODE_LABELS: Record<TrackingModeValue, string> = {
  QUANTITY: "Theo số lượng",
  HOURS: "Theo giờ làm",
};

export function normalizeOptionalMinStock(value: FormDataEntryValue | null): number {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Định mức tồn kho tối thiểu không hợp lệ");
  if (parsed < 0) throw new Error("Định mức tồn kho tối thiểu không được âm");
  return parsed;
}

export function requireCatalogChoice(value: FormDataEntryValue | null, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`Vui lòng chọn ${label}`);
  return text;
}
```

- [ ] Run `npx tsx tests/material-catalog.test.ts`.
- [ ] Expected: pass.
- [ ] Commit `test: cover foundation catalog helpers`.

## Task 3: Schema And Migration

- [ ] Update `prisma/schema.prisma` with the new enums/models/relations:

```prisma
enum MaterialKind {
  MATERIAL
  VEHICLE
  MACHINE
}

enum TrackingMode {
  QUANTITY
  HOURS
}

model Unit {
  id        String     @id @default(cuid())
  name      String     @unique
  note      String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  materials Material[]
}

model Supplier {
  id        String              @id @default(cuid())
  code      String              @unique
  taxCode   String?
  name      String
  address   String?
  note      String?
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt
  documents InventoryDocument[]
}
```

- [ ] Add these fields to `Material`:

```prisma
unitId       String?
unitRef      Unit?        @relation(fields: [unitId], references: [id], onDelete: SetNull)
kind         MaterialKind @default(MATERIAL)
trackingMode TrackingMode @default(QUANTITY)
```

- [ ] Add these fields to `InventoryDocument`:

```prisma
supplierId String?
supplier   Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
```

- [ ] Create `prisma/migrations/20260610170000_foundation_catalogs/migration.sql` that:
  - Creates `MaterialKind` and `TrackingMode` enum types if missing.
  - Creates `Unit` and `Supplier` tables if missing.
  - Adds material columns if missing.
  - Adds inventory document supplier columns if missing.
  - Inserts one unit per existing non-empty `Material.unit`.
  - Backfills `Material.unitId` by matching `Material.unit`.
  - Creates indexes and foreign keys conditionally.
- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma migrate deploy`.
- [ ] Run `npx prisma generate`.
- [ ] Commit `feat: add foundation catalog schema`.

## Task 4: Actions, Validation, Queries

- [ ] Modify `lib/validation.ts`:
  - `materialSchema` validates `unitId`, optional `minStock`, `kind`, and `trackingMode`.
  - Add `unitSchema`.
  - Add `supplierSchema`.
- [ ] Modify `lib/actions/materials.ts`:
  - `createMaterial` and `updateMaterial` call `requireRole("OWNER")`.
  - Fetch selected unit by `unitId`.
  - Store `unitId` and `unit: selectedUnit.name`.
  - Keep duplicate code checks.
- [ ] Create `lib/actions/catalogs.ts`:
  - `createUnit(formData)`, `updateUnit(id, formData)`.
  - `createSupplier(formData)`, `updateSupplier(id, formData)`.
  - Revalidate `/vat-lieu`, `/nhap`, `/phieu`.
- [ ] Create `lib/queries/catalogs.ts`:
  - `getUnits()` ordered by `name`.
  - `getSuppliers()` ordered by `name`.
  - `getSupplierOptions()` returning active fields needed by forms.
- [ ] Run `npm run typecheck`.
- [ ] Commit `feat: add foundation catalog actions`.

## Task 5: Supplier On Import Documents

- [ ] Modify `lib/actions/movements.ts`:
  - Read `supplierId` in `createImport`.
  - Verify supplier exists when provided.
  - Store it on `InventoryDocument`.
- [ ] Modify `lib/actions/documents.ts`:
  - When editing an `IMPORT`, read/verify/store `supplierId`.
  - When editing `EXPORT` or `TRANSFER`, set `supplierId` to null.
  - Include `supplierId` in document snapshots.
- [ ] Modify `lib/queries/documents.ts`:
  - Add `supplierName` and `supplierCode` to list/detail return types.
  - Include supplier in Prisma `findMany` and `findUnique`.
- [ ] Run `npm run typecheck`.
- [ ] Commit `feat: attach suppliers to import documents`.

## Task 6: UI For Foundation Catalogs

- [ ] Modify `components/material-manager.tsx`:
  - Accept `units` prop.
  - Add native selects for unit, kind, and tracking mode.
  - Make min stock input optional and default blank/0.
  - Show kind/tracking columns.
- [ ] Create `components/unit-manager.tsx`.
- [ ] Create `components/supplier-manager.tsx`.
- [ ] Modify `app/(app)/vat-lieu/page.tsx`:
  - Load `getUnits()` and `getSuppliers()`.
  - Render material, warehouse, unit, and supplier managers.
- [ ] Modify `components/import-form.tsx`:
  - Accept `suppliers` prop.
  - Add optional supplier select.
  - Preserve selected supplier in edit mode.
- [ ] Modify import create/edit pages to pass suppliers.
- [ ] Modify document list/detail components to show supplier when present.
- [ ] Run `npm run lint` and `npm run typecheck`.
- [ ] Commit `feat: add foundation catalog management UI`.

## Task 7: Verification

- [ ] Run behavior tests:

```bash
npx tsx tests/material-catalog.test.ts
npx tsx tests/document-form.test.ts
npx tsx tests/inventory-posting.test.ts
npx tsx tests/inventory-revision.test.ts
npx tsx tests/project-norm-report.test.ts
npx tsx tests/project-line-defaults.test.ts
```

- [ ] Run schema/build verification:

```bash
npx prisma validate
npm run lint
npm run typecheck
npm run build
```

- [ ] Start `npm run dev`.
- [ ] Smoke unauthenticated redirects with `curl -I`:
  - `/vat-lieu`
  - `/nhap/moi`
  - `/phieu/<existing-id>`
- [ ] Stop dev server.
- [ ] Run `git status --short`.

## Self-Review

- Spec coverage: This plan covers Phase 4 foundation catalogs from the approved spec: unit, supplier, project/fund placeholder continuity, and material type/tracking mode. It intentionally keeps full fund documents, dynamic permissions, tax-code lookup, conversion rules, Excel, and print for later phases.
- Placeholder scan: No placeholders remain.
- Type consistency: `MaterialKind`, `TrackingMode`, `unitId`, and `supplierId` are named consistently across schema, actions, queries, and UI.
