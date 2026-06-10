# Project Norms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 3: projects, work items, material norms, export-line project assignment, and a basic project norm variance report.

**Architecture:** Add `Project`, `ProjectWorkItem`, and `MaterialNorm` as first-class tables. Store `projectId` and `workItemId` on `InventoryDocumentLine`, then calculate actual usage from posted, non-voided export document lines. Keep fund documents and dynamic permissions deferred; create only a lightweight `Fund` relation so each project can have one fund placeholder.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL, Zod-style parsing, `tsx` behavior tests, existing UI primitives, lucide-react icons.

---

## Scope

Included:
- Data model and defensive migration for `Project`, `ProjectWorkItem`, `MaterialNorm`, and minimal `Fund`.
- Project management page with project create/edit, default work item creation, and norm editing.
- Export form line-level project/work-item selectors.
- Posted export create/edit stores `projectId` and `workItemId` on document lines.
- Detail page and list queries show project/work item when present.
- Basic norm report by project/work item/material with columns: norm, actual exported, variance, status.

Deferred:
- Full fund receipt/payment documents.
- Unit table and supplier table.
- Dynamic permissions; current owner/staff role checks remain.
- Warning modal on export over norm; Phase 3 report exposes variance first.
- Excel import/export and print layouts.

## Data Decisions

- `Project.status` uses enum `ACTIVE`/`CLOSED`; existing local demo DB has `Project.isActive`, so migration keeps the old column and adds `status`.
- Each project has one warehouse via `warehouseId`; creating a project can select an existing warehouse. Auto-create warehouse is deferred to avoid guessing naming rules.
- Each project has a default work item named `Chung`. Export lines selecting a project but no work item should be normalized to that default on the server.
- `MaterialNorm` is unique by `(workItemId, materialId)`.
- Actual usage for the report is calculated from current `InventoryDocumentLine` rows joined to `InventoryDocument` where `kind = EXPORT` and `status = POSTED`. This automatically respects document edit/void semantics because Phase 2 keeps only current lines on the document and marks voided documents.

## File Structure

- Modify `prisma/schema.prisma`: add project/norm models and relations; add `projectId`/`workItemId` to `InventoryDocumentLine`.
- Create `prisma/migrations/20260610150000_project_norms/migration.sql`: defensive schema migration compatible with local demo tables.
- Create `lib/projects/norm-report.ts`: pure helper for variance/status calculation.
- Create `tests/project-norm-report.test.ts`: TDD coverage for variance math and status labels.
- Modify `lib/inventory/document-form.ts`: parse optional `projectId` and `workItemId` per line.
- Modify `lib/actions/movements.ts` and `lib/actions/documents.ts`: persist export line project/work item fields and normalize default work item.
- Create `lib/actions/projects.ts`: create/update project, create work item, upsert material norm.
- Create `lib/queries/projects.ts`: project lists, project detail, work item options, norm report data.
- Modify `lib/queries/documents.ts`: include project/work item on detail lines.
- Create `components/project-select.tsx`: compact project/work item line selector for export form.
- Modify `components/export-form.tsx`: add project/work item controls per line.
- Create `components/project-manager.tsx`: project and norm management UI.
- Create `components/project-norm-report.tsx`: report UI.
- Create `app/(app)/cong-trinh/page.tsx`: project management/report page.
- Modify `components/nav.tsx`: add "Công trình".

## Task 1: Norm Report Helper

- [ ] Add `tests/project-norm-report.test.ts`.
- [ ] Verify it fails with `npx tsx tests/project-norm-report.test.ts` because `lib/projects/norm-report.ts` does not exist.
- [ ] Create `lib/projects/norm-report.ts` with `calculateNormVariance`.
- [ ] Verify test passes.
- [ ] Commit `test: cover project norm variance`.

## Task 2: Schema And Migration

- [ ] Update `prisma/schema.prisma` with:
  - `ProjectStatus` enum.
  - `Project`, `ProjectWorkItem`, `MaterialNorm`, minimal `Fund`.
  - `InventoryDocumentLine.projectId` and `InventoryDocumentLine.workItemId`.
- [ ] Add defensive SQL migration:
  - Create enum if missing.
  - Create/alter `Project` and `Fund` without dropping existing local columns.
  - Create `ProjectWorkItem` and `MaterialNorm`.
  - Add nullable project/work item columns to `InventoryDocumentLine`.
  - Add indexes and constraints idempotently.
  - Backfill default work item `Chung` for existing projects.
- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma migrate deploy`.
- [ ] Run `npx prisma generate`.
- [ ] Commit `feat: add project norm schema`.

## Task 3: Project Actions And Queries

- [ ] Create `lib/actions/projects.ts`.
  - `createProject(formData)` requires `OWNER`, creates project and default work item.
  - `updateProject(projectId, formData)` requires `OWNER`.
  - `createProjectWorkItem(formData)` requires `OWNER`.
  - `upsertMaterialNorm(formData)` requires `OWNER`.
- [ ] Create `lib/queries/projects.ts`.
  - `getProjects()`.
  - `getProjectOptions()`.
  - `getProjectManagerData()`.
  - `getProjectNormReport(projectId?)`.
- [ ] Run `npm run typecheck`.
- [ ] Commit `feat: add project norm actions`.

## Task 4: Export Line Project Assignment

- [ ] Extend `parseDocumentLines` to parse optional `projectId`/`workItemId`.
- [ ] Update `createExport` and `updateInventoryDocument` to:
  - Normalize missing work item to the selected project's default `Chung`.
  - Store project/work item on export lines.
  - Leave import/transfer behavior unchanged.
- [ ] Update `getInventoryDocumentDetail` to include project/work item labels.
- [ ] Add project/work item selectors to export create/edit form.
- [ ] Run `npx tsx tests/document-form.test.ts` and `npm run typecheck`.
- [ ] Commit `feat: assign export lines to project work items`.

## Task 5: Project UI And Report

- [ ] Add `/cong-trinh` route with `ProjectManager` and `ProjectNormReport`.
- [ ] Add "Công trình" nav link.
- [ ] Implement project create/edit dialog.
- [ ] Implement work item create dialog.
- [ ] Implement norm entry table with material selector and quantity input.
- [ ] Implement norm variance report table.
- [ ] Run `npm run lint` and `npm run typecheck`.
- [ ] Commit `feat: add project norm management UI`.

## Task 6: Verification

- [ ] Run all helper tests:
  - `npx tsx tests/inventory-posting.test.ts`
  - `npx tsx tests/document-form.test.ts`
  - `npx tsx tests/inventory-revision.test.ts`
  - `npx tsx tests/project-norm-report.test.ts`
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev` and smoke test `/cong-trinh`, `/xuat/moi`, `/phieu/[id]`.
- [ ] Commit any final fixes.

## Self-Review

- Spec coverage: Implements project/work item/norm foundation and basic variance report; defers full fund workflow, supplier/unit, dynamic permissions, warnings, Excel, and print.
- Placeholder scan: No placeholder steps remain.
- Type consistency: The plan consistently uses `projectId`, `workItemId`, `MaterialNorm`, and `calculateNormVariance`.
