# Import Export Print Utilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 8: Excel import of opening balances, Excel exports for inventory and norm reports, and print-ready views for inventory and fund slips.

**Architecture:** Keep all stock writes flowing through `InventoryDocument` and `StockMovement`. Excel parsing/formatting lives in small pure helpers, API routes handle file download/upload boundaries, and print pages reuse existing detail query data with a print stylesheet instead of changing operational screens.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/PostgreSQL, `xlsx`, existing permission service, `tsx` behavior tests.

---

## Scope

Included:
- Import tồn đầu kỳ từ Excel thành phiếu `OPENING` đã ghi sổ.
- Export Excel cho báo cáo nhập - xuất - tồn.
- Export Excel cho báo cáo chênh lệch định mức.
- View/in phiếu nhập, xuất, chuyển và quỹ bằng routes chuyên dụng.

Deferred:
- Import định mức hàng loạt.
- Export Excel báo cáo quỹ.
- Mẫu in kế toán phức tạp có chữ ký nhiều cấp.

## File Structure

- Create `lib/excel/workbook.ts`: worksheet/workbook helpers.
- Create `lib/opening/import.ts`: parse and validate opening-balance rows from Excel.
- Create `lib/actions/opening.ts`: server action that creates posted `OPENING` documents.
- Create `app/(app)/ton-dau-ky/page.tsx`: upload page for opening balances.
- Create `components/opening-import-form.tsx`: client upload form.
- Create `app/api/reports/balance/export/route.ts`: inventory report workbook download.
- Create `app/api/reports/norms/export/route.ts`: norm report workbook download.
- Modify `components/balance-report.tsx`: add export and opening import buttons.
- Modify `components/project-norm-report.tsx`: add export button.
- Create `app/(app)/phieu/[id]/in/page.tsx`: print view for inventory documents.
- Create `app/(app)/quy/[id]/in/page.tsx`: print view for fund documents.
- Create `components/print/inventory-document-print.tsx`: print layout for inventory documents.
- Create `components/print/fund-document-print.tsx`: print layout for fund documents.
- Modify `components/inventory-document-detail.tsx` and `components/fund-document-detail.tsx`: add print buttons.
- Modify `lib/permissions/catalog.ts` and `lib/permissions/inventory-permissions.ts`: add `inventory.opening.import`.
- Test `tests/opening-import.test.ts` and `tests/excel-export.test.ts`.

## Task 1: Excel Helpers And Opening Parser

- [ ] Write failing tests in `tests/opening-import.test.ts` for parsing rows with `warehouseCode`, `materialCode`, `quantity`, optional `note`, rejecting missing codes and non-positive quantities.
- [ ] Write failing tests in `tests/excel-export.test.ts` for workbook buffers containing expected headers for balance and norm report sheets.
- [ ] Run both tests and verify they fail because helpers do not exist.
- [ ] Add `xlsx` dependency.
- [ ] Implement `lib/excel/workbook.ts` with `buildWorkbookBuffer`, `balanceRowsToSheet`, and `normRowsToSheet`.
- [ ] Implement `lib/opening/import.ts` with `parseOpeningBalanceRows`.
- [ ] Run both tests and verify they pass.
- [ ] Commit as `test: cover phase 8 excel helpers`.

## Task 2: Opening Balance Import Flow

- [ ] Add permission `inventory.opening.import` under Báo cáo and include it in Admin/Quản lý presets.
- [ ] Implement `createOpeningBalanceDocument(formData)` in `lib/actions/opening.ts`; it requires `inventory.opening.import`, parses uploaded `.xlsx`, resolves warehouse/material codes, creates one `OPENING` document per warehouse, and posts `IN/PURCHASE` movements through `buildStockMovementInputs`.
- [ ] Add `/ton-dau-ky` page and `OpeningImportForm` with file upload, expected columns, and submit feedback.
- [ ] Add entry button from `BalanceReport` when the user has the import permission.
- [ ] Run typecheck and targeted tests.
- [ ] Commit as `feat: add opening balance import`.

## Task 3: Report Excel Export

- [ ] Implement `GET /api/reports/balance/export` guarded by `inventory.report.view`; it reads `from`, `to`, `wh`, calls `getBalanceReport`, and returns `.xlsx`.
- [ ] Implement `GET /api/reports/norms/export` guarded by `inventory.report.view`; it reads `projectId`, calls `getProjectNormReport`, and returns `.xlsx`.
- [ ] Add export buttons to balance and norm report components using the current filters.
- [ ] Run typecheck, targeted tests, and curl route smoke under dev server.
- [ ] Commit as `feat: export inventory reports to excel`.

## Task 4: Print Views

- [ ] Create print components for inventory and fund documents with compact metadata, line tables, totals, status/revision, and signature placeholders.
- [ ] Add `/phieu/[id]/in` guarded by the relevant document view permission.
- [ ] Add `/quy/[id]/in` guarded by `fund.view`.
- [ ] Add print buttons to existing detail pages.
- [ ] Add print CSS in `app/globals.css` so buttons/nav are hidden on paper and layouts print cleanly.
- [ ] Run typecheck and browser smoke for both print pages.
- [ ] Commit as `feat: add document print views`.

## Task 5: Final Verification

- [ ] Run all `tests/*.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Start dev server, browser-smoke `/bao-cao`, `/ton-dau-ky`, one inventory print URL, one fund print URL, and unauth redirect where practical.
- [ ] Stop dev server and confirm `git status --short`.

## Self-Review

- Spec coverage: Covers all Phase 8 bullets from the approved design: opening Excel import, balance export, norm export, and print/view slip pages.
- Placeholder scan: No `TBD` or placeholder tasks remain.
- Type consistency: Helper names, route paths, permission code, and component names are consistent across tasks.
