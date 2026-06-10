# Project Norm Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 5 by warning users when an export document would push project/work-item material usage over the configured norm, while keeping the existing project norm report accurate after create, edit, and void flows.

**Architecture:** Add a focused norm-warning domain helper that compares planned export-line quantities against existing posted export usage and `MaterialNorm`. Call that helper from export create/edit server actions before mutating data; if over-norm rows exist and the user has not explicitly confirmed, return a typed warning result instead of posting. The export form renders those warning rows in a confirmation dialog and resubmits with an `allowOverNorm` flag when the user chooses to continue.

**Tech Stack:** Next.js 16 App Router, React 19 client component form, TypeScript, Prisma 6, PostgreSQL, existing server actions, existing Base UI dialog primitives, `tsx` behavior tests.

---

## Scope

Included:
- A pure helper for grouping planned export quantities by `(workItemId, materialId)`.
- A Prisma-backed warning query for create and edit export flows.
- Server-action warning responses for `createExport` and `updateInventoryDocument`.
- A confirmation dialog in `ExportForm`.
- Report revalidation after export changes so `/cong-trinh` reflects new usage.

Deferred:
- Hard blocking over-norm exports. Client asked for flexible demo flow; this phase warns but allows confirmed posting.
- Approval workflow for over-norm exports.
- Excel export and print layouts.
- Dynamic permissions; this phase keeps current role behavior.

## Data Decisions

- Only export lines with both `projectId` and `workItemId` participate in norm warnings.
- Missing norms are not blocked in this phase; the existing report still labels them as `Chưa có định mức`.
- Existing posted usage is read from `InventoryDocumentLine` joined to `InventoryDocument` where `kind = EXPORT` and `status = POSTED`.
- During edit, the current document is excluded from existing usage before checking the revised lines, so users are warned only on the new effective total.
- Multiple lines for the same work item/material are aggregated before comparison.

## File Structure

- Create `lib/projects/norm-warnings.ts`: pure aggregation plus `getProjectNormWarnings(...)`.
- Create `tests/project-norm-warnings.test.ts`: TDD coverage for aggregation and warning math.
- Modify `lib/actions/movements.ts`: extend `ActionResult`, call `getProjectNormWarnings` before creating export docs, revalidate `/cong-trinh`.
- Modify `lib/actions/documents.ts`: call `getProjectNormWarnings` before editing export docs, excluding the current document, revalidate `/cong-trinh`.
- Modify `components/export-form.tsx`: show confirmation dialog when server action returns over-norm warnings, then resubmit with `allowOverNorm=true`.
- Optionally modify `components/project-norm-report.tsx`: add concise empty/help state or visual polish only if needed by type/UI changes.

## Task 1: Norm Warning Helper

- [ ] Add `tests/project-norm-warnings.test.ts` with tests for:
  - Aggregating duplicate planned lines for the same work item/material.
  - Returning no warnings when usage stays within norm.
  - Returning a warning when existing usage plus planned usage exceeds norm.
- [ ] Run `npx tsx tests/project-norm-warnings.test.ts` and verify it fails because `lib/projects/norm-warnings.ts` does not exist.
- [ ] Create `lib/projects/norm-warnings.ts` with exported types:
  - `NormWarningLine`
  - `NormWarningUsageSnapshot`
  - `ProjectNormWarning`
  - `aggregatePlannedNormUsage(lines)`
  - `calculateProjectNormWarnings(planned, snapshots)`
- [ ] Run `npx tsx tests/project-norm-warnings.test.ts` and verify it passes.
- [ ] Commit `test: cover project norm warnings`.

## Task 2: Server-Side Warning Query

- [ ] Extend `lib/projects/norm-warnings.ts` with `getProjectNormWarnings({ lines, excludeDocumentId })`.
- [ ] Query `MaterialNorm` for planned `(workItemId, materialId)` pairs.
- [ ] Query posted export `InventoryDocumentLine` groups for those same pairs, excluding `excludeDocumentId` when provided.
- [ ] Join project/work-item/material labels for warning display.
- [ ] Return warnings from `calculateProjectNormWarnings`.
- [ ] Run `npx tsx tests/project-norm-warnings.test.ts` and `npm run typecheck`.
- [ ] Commit `feat: add project norm warning query`.

## Task 3: Export Server Actions

- [ ] Modify `ActionResult` in `lib/actions/movements.ts` to include optional `code: "OVER_NORM_WARNING"` and `normWarnings`.
- [ ] Add helper `isOverNormConfirmed(formData)` using `allowOverNorm === "true"`.
- [ ] In `createExport`, after `resolveProjectLineAssignments(lines)` and before the transaction, call `getProjectNormWarnings({ lines })`.
- [ ] If warnings exist and not confirmed, return `{ ok: false, code: "OVER_NORM_WARNING", error: "Phiếu xuất vượt định mức", normWarnings }`.
- [ ] In `updateInventoryDocument`, when existing kind is `EXPORT`, call `getProjectNormWarnings({ lines, excludeDocumentId: documentId })` before the revision transaction.
- [ ] Revalidate `/cong-trinh` after create/edit export changes.
- [ ] Run behavior tests for document form, revision, posting, and norm warnings.
- [ ] Commit `feat: warn on export over project norms`.

## Task 4: Export Form Confirmation UI

- [ ] Import dialog primitives and define a local `ProjectNormWarning` display type from the action result.
- [ ] Store `pendingWarnings` and `pendingConfirmedSubmit` state in `ExportForm`.
- [ ] Extract submit logic into `submitExport(formData, confirmed)` so both normal submit and confirm button can reuse it.
- [ ] On `OVER_NORM_WARNING`, show a dialog with project, work item, material, norm, used, planned, and overage.
- [ ] On confirm, resubmit the same document payload with `allowOverNorm=true`.
- [ ] Keep existing success/error toast behavior unchanged for non-warning results.
- [ ] Run `npm run lint` and `npm run typecheck`.
- [ ] Commit `feat: confirm export over project norms`.

## Task 5: Verification

- [ ] Run:
  - `npx tsx tests/project-norm-warnings.test.ts`
  - `npx tsx tests/project-norm-report.test.ts`
  - `npx tsx tests/project-line-defaults.test.ts`
  - `npx tsx tests/document-form.test.ts`
  - `npx tsx tests/inventory-posting.test.ts`
  - `npx tsx tests/inventory-revision.test.ts`
  - `npx tsx tests/material-catalog.test.ts`
  - `npx tsx tests/role-normalization.test.ts`
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev` and HTTP-smoke `/xuat/moi` and `/cong-trinh`.
- [ ] Commit final fixes if any.

## Self-Review

- Spec coverage: This plan completes the missing Phase 5 warning flow and keeps the existing norm report updated through revalidation.
- Placeholder scan: No `TBD`, `TODO`, or open implementation placeholders remain.
- Type consistency: The plan consistently uses `projectId`, `workItemId`, `materialId`, `allowOverNorm`, and `OVER_NORM_WARNING`.
