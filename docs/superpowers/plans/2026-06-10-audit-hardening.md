# Audit Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add business-rule tests, fund audit trail, accounting period locks, and updated production checklist.

**Architecture:** Keep ledger integrity at the server-action boundary. Add small pure helpers for period-lock and audit snapshots, then call those helpers from inventory/fund/stocktake/opening actions before database writes.

**Tech Stack:** Next.js server actions, Prisma/PostgreSQL, TypeScript, Node `assert` tests, existing shadcn/base UI components.

---

## File Structure

- Create `lib/period-locks.ts`: pure lock helpers plus DB guard for actions.
- Create `lib/funds/audit.ts`: fund document snapshots and audit label helpers.
- Create `lib/audit/reconciliation.ts`: pure reconciliation helpers for tests and future diagnostics.
- Create `lib/actions/period-locks.ts`: create/delete period lock actions.
- Create `lib/queries/period-locks.ts`: list period locks for UI.
- Create `components/period-lock-manager.tsx`: Admin/manager period-lock page.
- Create `app/(app)/khoa-ky/page.tsx`: route guarded by `period.lock.manage`.
- Modify `prisma/schema.prisma` and add migration: period locks and fund audit logs.
- Modify inventory/fund/opening/transfer/stocktake actions: call lock guard.
- Modify fund query/detail UI: expose and display audit logs.
- Modify permissions/nav/tests/docs.

## Tasks

### Task 1: RED tests for audit hardening helpers

- [ ] Create `tests/period-locks.test.ts` with cases for inclusive lock ranges and scope matching.
- [ ] Create `tests/audit-reconciliation.test.ts` with cases for inventory balances ignoring voided/superseded movements and fund balance arithmetic.
- [ ] Create `tests/fund-audit.test.ts` with cases for fund snapshots and action labels.
- [ ] Update `tests/permissions.test.ts` to expect `period.lock.manage`.
- [ ] Run the new tests and confirm they fail because helpers/permission are missing.

### Task 2: GREEN pure helper implementation

- [ ] Implement `lib/period-locks.ts` with `dateOnlyInVietnam`, `isPeriodLocked`, `findMatchingPeriodLock`, `assertAccountingPeriodUnlocked`.
- [ ] Implement `lib/audit/reconciliation.ts` with `calculateInventoryBalances` and `calculateSignedFundBalance`.
- [ ] Implement `lib/funds/audit.ts` with `snapshotFundDocument` and `fundAuditActionLabel`.
- [ ] Add `period.lock.manage` to permission catalog and presets.
- [ ] Run the helper tests and permissions test until they pass.

### Task 3: Database schema and Prisma migration

- [ ] Add `PeriodLockScope`, `AccountingPeriodLock`, and `FundDocumentAuditLog` to `prisma/schema.prisma`.
- [ ] Add SQL migration `prisma/migrations/20260610230000_audit_hardening/migration.sql`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma generate`.

### Task 4: Period lock UI and actions

- [ ] Add `lib/actions/period-locks.ts` for create/delete lock.
- [ ] Add `lib/queries/period-locks.ts`.
- [ ] Add `components/period-lock-manager.tsx`.
- [ ] Add `app/(app)/khoa-ky/page.tsx`.
- [ ] Add nav link with lock icon guarded by `period.lock.manage`.

### Task 5: Enforce locks in server actions

- [ ] Inventory create import/export, transfer, opening import: assert `INVENTORY` unlocked for requested document date.
- [ ] Inventory update/void: assert old document date and new document date are unlocked.
- [ ] Stocktake approve: assert `INVENTORY` unlocked for the approval/document date.
- [ ] Fund create/update/void: assert `FUND` unlocked for old and new document dates.
- [ ] Return user-facing Vietnamese errors when a lock blocks the operation.

### Task 6: Fund audit trail

- [ ] Create `FundDocumentAuditLog` rows on fund create/update/void.
- [ ] Include fund audit logs in `getFundDocumentDetail`.
- [ ] Display fund audit logs in `components/fund-document-detail.tsx`.
- [ ] Ensure fund update snapshots are taken before deleting/recreating lines.

### Task 7: Production checklist update

- [ ] Rewrite `docs/production-checklist.md` to reflect current architecture: dynamic permissions, vouchers, audit logs, period locks, backup/restore, demo account cleanup.

### Task 8: Full verification and commits

- [ ] Run all `tests/*.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Commit the completed phase.
