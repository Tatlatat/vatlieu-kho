# Inventory Document Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 2 document operations: list documents, view document detail and audit, edit posted documents by revision, and void documents from the document screen instead of the ledger history.

**Architecture:** Keep `InventoryDocument` as the user-facing source of truth and `StockMovement` as the ledger. Edits supersede active movements and generate a new document revision; voids mark the document `VOIDED`, mark active movements voided, and create excluded `VOID` movements for traceability. UI routes move create forms to `/nhap/moi`, `/xuat/moi`, and `/chuyen-kho/moi`, while `/nhap`, `/xuat`, and `/chuyen-kho` become document lists.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL views, Zod, `tsx` behavior tests, existing shadcn/Base UI components, lucide-react icons.

---

## Scope

This phase implements inventory document operations only.

Included:
- List pages for import/export/transfer documents.
- New document detail route at `/phieu/[id]`.
- Edit route at `/phieu/[id]/sua` for posted inventory documents.
- Document-level void action with audit log.
- Date field on import/export/transfer forms.
- Removal of the void button from the ledger history UI.

Deferred:
- Dynamic permission ticking.
- Project/work item/norm data model and reports.
- Fund documents.
- Draft save workflow.
- Transfer approval workflow, which client explicitly deferred for demo.

## File Structure

- Create `lib/inventory/revision.ts`: pure stock-delta helper for posted document edit/void checks.
- Create `tests/inventory-revision.test.ts`: behavior tests for stock-delta helper.
- Create `lib/actions/documents.ts`: server actions for `updateInventoryDocument` and `voidInventoryDocument`.
- Create `lib/queries/documents.ts`: document list/detail queries and display labels.
- Modify `lib/actions/movements.ts`: honor submitted `documentDate`.
- Modify `lib/actions/transfer.ts`: honor submitted `documentDate`.
- Modify `lib/queries/balance.ts`: exclude superseded movements from report math.
- Modify `components/import-form.tsx`, `components/export-form.tsx`, `components/transfer-form.tsx`: support date, edit mode, and redirect to list/detail pages.
- Create `components/inventory-document-list.tsx`: shared list table for import/export/transfer pages.
- Create `components/inventory-document-detail.tsx`: detail view with lines, audit log, and edit/void actions.
- Create `components/document-void-button.tsx`: client dialog for void reason.
- Modify `components/history-table.tsx`: remove movement-level void UI.
- Modify `app/(app)/nhap/page.tsx`, `app/(app)/xuat/page.tsx`, `app/(app)/chuyen-kho/page.tsx`: render document lists.
- Create `app/(app)/nhap/moi/page.tsx`, `app/(app)/xuat/moi/page.tsx`, `app/(app)/chuyen-kho/moi/page.tsx`: render create forms.
- Create `app/(app)/phieu/[id]/page.tsx`: render document detail.
- Create `app/(app)/phieu/[id]/sua/page.tsx`: render edit form.

## Task 1: Stock Delta Helper

- [ ] Write `tests/inventory-revision.test.ts` with these behaviors:
  - Removing an import movement requires stock to remain non-negative.
  - Increasing an export movement requires stock to remain non-negative.
  - Editing a transfer checks the destination decrease and source decrease separately.
- [ ] Run `npx tsx tests/inventory-revision.test.ts` and verify it fails because `lib/inventory/revision.ts` does not exist.
- [ ] Create `lib/inventory/revision.ts` with:
  - `movementSignedQuantity(movement)`.
  - `buildRevisionSlotDeltas(currentMovements, nextMovements)`.
  - `stockChecksForNegativeDeltas(deltas)`.
- [ ] Run `npx tsx tests/inventory-revision.test.ts` and verify it passes.
- [ ] Commit with `test: cover inventory document revision deltas`.

## Task 2: Document Actions

- [ ] Write the action implementation in `lib/actions/documents.ts`.
- [ ] `voidInventoryDocument(formData)` must:
  - Require `OWNER` for now because dynamic permissions are deferred.
  - Accept `documentId` and `reason`.
  - Reject missing, non-POSTED, and already VOIDED documents.
  - Lock every affected `(materialId, warehouseId)` slot.
  - Use `buildRevisionSlotDeltas(activeMovements, [])` to reject voids that would make stock negative.
  - Mark active document movements `voidedAt`/`voidedById`.
  - Create `VOID` reversal rows linked to the same document and line.
  - Mark the document `VOIDED`, store `voidReason`, and create `DocumentAuditLog(action: "VOID")`.
- [ ] `updateInventoryDocument(formData)` must:
  - Require `OWNER` for posted edits until dynamic permissions exist.
  - Parse submitted date, warehouses, reason, note, and multi-line payload.
  - Reject VOIDED documents.
  - Build next movement plan from submitted lines.
  - Use revision deltas to reject edits that would make stock negative.
  - Supersede active movements with `supersededAt` and `supersededByRevisionNo`.
  - Replace current document lines, increment `revisionNo`, create new movements, and write `DocumentAuditLog(action: "EDIT_POSTED")`.
- [ ] Revalidate `/`, `/nhap`, `/xuat`, `/chuyen-kho`, `/lich-su`, `/phieu/[id]`, and `/bao-cao` after edits/voids.

## Task 3: Document Queries

- [ ] Create `lib/queries/documents.ts`.
- [ ] `getInventoryDocuments(kind)` must return sorted document rows with code, status, document date, warehouse labels, creator, line count, total quantity, revision, and note.
- [ ] `getInventoryDocumentDetail(id)` must return one document with lines, material unit/code, warehouse labels, creator/poster/voider, active and void movements, and audit logs.
- [ ] Export label maps for kind, status, reason display.

## Task 4: UI Routes and Forms

- [ ] Move current create pages to `/nhap/moi`, `/xuat/moi`, and `/chuyen-kho/moi`.
- [ ] Convert `/nhap`, `/xuat`, and `/chuyen-kho` into list pages using `InventoryDocumentList`.
- [ ] Add `/phieu/[id]` detail page with document lines, status badge, audit log, and action buttons.
- [ ] Add `/phieu/[id]/sua` edit page that reuses the correct create form in edit mode.
- [ ] Add `documentDate` input to all inventory forms.
- [ ] In edit mode, call `updateInventoryDocument`; in create mode, call existing create action.
- [ ] After create, redirect to the relevant list page. After edit, redirect back to the detail page.

## Task 5: Ledger History Cleanup

- [ ] Remove `voidMovement` import, action column, dialog state, and `isOwner` prop from `components/history-table.tsx`.
- [ ] Update `app/(app)/lich-su/page.tsx` to render history without movement-level void controls.
- [ ] Keep ledger rows read-only so history remains an audit surface.

## Task 6: Verification

- [ ] Run `npx tsx tests/inventory-posting.test.ts`.
- [ ] Run `npx tsx tests/document-form.test.ts`.
- [ ] Run `npx tsx tests/inventory-revision.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev`, verify `/nhap`, `/xuat`, `/chuyen-kho`, and at least one `/phieu/[id]` route respond without crashing, then stop the dev server.
- [ ] Commit with `feat: add inventory document operations`.

## Self-Review

- Spec coverage: This plan covers Phase 2 document operations and intentionally defers project norms, funds, dynamic permissions, draft workflow, and transfer approval.
- Placeholder scan: No placeholder steps remain.
- Type consistency: Action names, query names, route names, and helper names are consistent across tasks.
