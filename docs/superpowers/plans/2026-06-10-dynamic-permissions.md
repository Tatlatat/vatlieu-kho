# Dynamic Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 6 so business access is controlled by tickable permissions instead of hard-coded `OWNER` / `STAFF` checks.

**Architecture:** Keep `OWNER` as the system safety role with implicit full access, then add explicit permission rows for non-owner users. Permission checks are centralized in `lib/permissions/*` and surfaced through `requirePermission(...)`; pages and navigation read a permission snapshot, while server actions remain the final enforcement point.

**Tech Stack:** Next.js App Router server actions, Prisma/PostgreSQL, TypeScript, Node `assert` tests, existing shadcn-style UI components.

---

## File Structure

- `prisma/schema.prisma`: add `Permission`, `UserPosition`, `PositionPermission`, `UserPositionAssignment`, `UserPermissionOverride`, and user relations.
- `prisma/migrations/20260610190000_dynamic_permissions/migration.sql`: create permission tables and seed baseline permissions/positions.
- `prisma/seed.ts`: reset and seed demo permissions safely.
- `lib/permissions/catalog.ts`: canonical permission definitions and default position presets.
- `lib/permissions/effective.ts`: pure functions for merging position permissions and per-user overrides.
- `lib/permissions/service.ts`: database helpers for seeding, reading snapshots, checking permissions, and updating assignments.
- `lib/auth-helpers.ts`: add `requirePermission(...)`, `can(...)`, and permission-aware `SessionUser`.
- `lib/actions/permissions.ts`: admin server actions to create users, assign position, and update ticked permissions.
- Existing action files in `lib/actions/*`: replace role-only checks with `requirePermission(...)`.
- Existing page files in `app/(app)/*`: replace page-level `requireRole(...)` with permission checks.
- `components/nav.tsx`: filter links by permissions instead of roles.
- `components/permission-manager.tsx`: UI for admin to tick permissions by user.
- `app/(app)/nguoi-dung/page.tsx`: page for user and permission management.
- `tests/permissions.test.ts`: pure tests for effective permission rules.
- `tests/permission-service.test.ts`: DB integration tests for seeding, snapshot reads, updates, and safety invariant.

## Permission Codes

Use these codes in Phase 6:

- `inventory.import.view`, `inventory.import.create`, `inventory.import.edit_posted`, `inventory.import.void`
- `inventory.export.view`, `inventory.export.create`, `inventory.export.edit_posted`, `inventory.export.void`
- `inventory.transfer.view`, `inventory.transfer.create`, `inventory.transfer.edit_posted`, `inventory.transfer.void`
- `inventory.stocktake.view`, `inventory.stocktake.create`, `inventory.stocktake.edit`, `inventory.stocktake.approve`, `inventory.stocktake.void`
- `inventory.history.view`
- `inventory.report.view`
- `catalog.view`, `catalog.manage`
- `project.view`, `project.manage`
- `norm.manage`
- `fund.view`, `fund.create`, `fund.edit_posted`, `fund.void`
- `user.manage`, `permission.manage`

Default positions:

- `ADMIN`: all permissions.
- `QUAN_LY`: import/export/transfer view-create-edit-void, reports, projects, norms, catalog view/manage, fund permissions, stocktake view-create-edit-approve-void, history.
- `THU_KHO`: import/export/transfer view-create-edit, stocktake view-create-edit, catalog view, reports/history view.

## Tasks

### Task 1: Permission Catalog And Pure Tests

**Files:**
- Create: `lib/permissions/catalog.ts`
- Create: `lib/permissions/effective.ts`
- Test: `tests/permissions.test.ts`

- [ ] **Step 1: Write failing pure tests**

```ts
import assert from "node:assert/strict";
import { PERMISSION_DEFINITIONS, POSITION_PRESETS } from "../lib/permissions/catalog";
import { calculateEffectivePermissionCodes, canAccessPermission } from "../lib/permissions/effective";

assert.ok(PERMISSION_DEFINITIONS.some((permission) => permission.code === "permission.manage"));
assert.ok(POSITION_PRESETS.THU_KHO.permissionCodes.includes("inventory.import.create"));
assert.equal(POSITION_PRESETS.THU_KHO.permissionCodes.includes("permission.manage"), false);

assert.deepEqual(
  calculateEffectivePermissionCodes({
    isOwner: false,
    positionPermissionCodes: ["inventory.import.create", "inventory.export.create"],
    allowOverrideCodes: ["fund.view"],
    denyOverrideCodes: ["inventory.export.create"],
  }),
  ["fund.view", "inventory.import.create"]
);

assert.equal(canAccessPermission({ isOwner: true, effectivePermissionCodes: [] }, "permission.manage"), true);
assert.equal(canAccessPermission({ isOwner: false, effectivePermissionCodes: ["catalog.view"] }, "catalog.view"), true);
assert.equal(canAccessPermission({ isOwner: false, effectivePermissionCodes: ["catalog.view"] }, "catalog.manage"), false);

console.log("permissions tests passed");
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx tests/permissions.test.ts`

Expected: FAIL because `lib/permissions/catalog.ts` does not exist.

- [ ] **Step 3: Implement catalog and pure merge helpers**

Implement `PERMISSION_DEFINITIONS`, `POSITION_PRESETS`, `calculateEffectivePermissionCodes(...)`, and `canAccessPermission(...)`. Owners return true for any known permission; staff use merged permission codes.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx tsx tests/permissions.test.ts`

Expected: PASS with `permissions tests passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/permissions/catalog.ts lib/permissions/effective.ts tests/permissions.test.ts
git commit -m "test: cover dynamic permission rules"
```

### Task 2: Prisma Permission Schema And Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260610190000_dynamic_permissions/migration.sql`
- Modify: `prisma/seed.ts`
- Test: `tests/permission-service.test.ts`

- [ ] **Step 1: Write failing DB service test**

The test should create temporary users, call `ensurePermissionSeeded()`, assign `THU_KHO`, override `fund.view`, deny one warehouse permission, and verify owner implicit access.

Run: `npx tsx tests/permission-service.test.ts`

Expected: FAIL because the service and Prisma models do not exist.

- [ ] **Step 2: Add Prisma models**

Add:

- `Permission(code, name, category, description, createdAt, updatedAt)`
- `UserPosition(code, name, description, createdAt, updatedAt)`
- `PositionPermission(positionId, permissionId)`
- `UserPositionAssignment(userId, positionId)`
- `UserPermissionOverride(userId, permissionId, effect)`

Use unique constraints on permission code, position code, `(positionId, permissionId)`, `(userId, positionId)`, and `(userId, permissionId)`.

- [ ] **Step 3: Add SQL migration**

Create the tables, `UserPermissionEffect` enum with `ALLOW` / `DENY`, indexes, and seed rows from the catalog presets through TypeScript seed/service rather than large hand-written SQL inserts.

- [ ] **Step 4: Implement `lib/permissions/service.ts`**

Functions:

- `ensurePermissionSeeded(txOrPrisma?)`
- `getUserPermissionSnapshot(userId)`
- `userHasPermission(userId, code)`
- `getPermissionManagementData()`
- `updateUserPermissions({ targetUserId, positionCodes, allowCodes, denyCodes, actorUserId })`

Safety rule: updates that affect permissions must run in one transaction and reject a change that would leave no owner and no non-owner with `permission.manage`.

- [ ] **Step 5: Update seed**

Call `ensurePermissionSeeded()` after users are created, assign `ADMIN` to owner and `THU_KHO` to staff.

- [ ] **Step 6: Run Prisma and service tests**

Run:

```bash
npx prisma generate
npx tsx tests/permission-service.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/20260610190000_dynamic_permissions/migration.sql prisma/seed.ts lib/permissions/service.ts tests/permission-service.test.ts
git commit -m "feat: add dynamic permission storage"
```

### Task 3: Auth Helpers And Backend Guards

**Files:**
- Modify: `lib/auth-helpers.ts`
- Modify: `lib/actions/movements.ts`
- Modify: `lib/actions/transfer.ts`
- Modify: `lib/actions/documents.ts`
- Modify: `lib/actions/stocktake.ts`
- Modify: `lib/actions/void.ts`
- Modify: `lib/actions/materials.ts`
- Modify: `lib/actions/warehouses.ts`
- Modify: `lib/actions/catalogs.ts`
- Modify: `lib/actions/projects.ts`
- Modify: `app/api/ledger/route.ts`

- [ ] **Step 1: Write failing auth-helper test**

Extend `tests/permissions.test.ts` or add a focused test for `permissionRedirectPath`, `canAccessPermission`, and known/unknown code behavior. Unknown permission codes must return false for staff and true for owner only if the code is listed in the catalog.

- [ ] **Step 2: Implement `requirePermission(...)`**

`requirePermission(code)` must call `requireUser()`, then `userHasPermission(user.id, code)`, and redirect to `/` when denied. Add `can(userId, code)` for pages that need booleans.

- [ ] **Step 3: Replace server action guards**

Map existing operations:

- create import: `inventory.import.create`
- create export: `inventory.export.create`
- create transfer: `inventory.transfer.create`
- update document: kind-specific `inventory.<kind>.edit_posted`
- void document/movement: kind-specific `inventory.<kind>.void`
- stocktake create/edit/approve/void: stocktake permission codes
- catalog/material/warehouse/supplier/unit actions: `catalog.manage`
- project create/update/work-item: `project.manage`
- norm upsert: `norm.manage`
- ledger API: `inventory.history.view`

- [ ] **Step 4: Run behavior tests**

Run:

```bash
npx tsx tests/permissions.test.ts
npx tsx tests/permission-service.test.ts
npm run typecheck
```

Expected: all pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/auth-helpers.ts lib/actions app/api/ledger/route.ts tests/permissions.test.ts
git commit -m "feat: enforce dynamic permissions in actions"
```

### Task 4: Permission Management UI

**Files:**
- Create: `lib/actions/permissions.ts`
- Create: `components/permission-manager.tsx`
- Create: `app/(app)/nguoi-dung/page.tsx`
- Modify: `components/nav.tsx`
- Modify: `app/(app)/layout.tsx`
- Modify: `app/(app)/page.tsx`
- Modify: guarded pages under `app/(app)/*/page.tsx`

- [ ] **Step 1: Write server action shape test where practical**

Add pure tests for form parsing helpers in `lib/actions/permissions.ts` if those helpers are exported. Verify arrays are deduped and invalid codes are rejected.

- [ ] **Step 2: Implement admin actions**

Actions:

- `createUserAction(formData)` requiring `user.manage`
- `updateUserPermissionAction(formData)` requiring `permission.manage`

Both should revalidate `/nguoi-dung` and `/`.

- [ ] **Step 3: Add `PermissionManager`**

Render users, current position, preset buttons, and permission checkboxes grouped by category. OWNER rows should show full access and disable permission removal.

- [ ] **Step 4: Add page and nav**

`/nguoi-dung` requires `permission.manage`. `Nav` receives permission codes and filters links by required permission. Home quick actions should also hide links the user cannot access.

- [ ] **Step 5: Run lint/typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/actions/permissions.ts components/permission-manager.tsx app/'(app)' components/nav.tsx
git commit -m "feat: add permission management UI"
```

### Task 5: Full Verification

**Files:**
- No new files unless verification exposes fixes.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx tsx tests/permissions.test.ts
npx tsx tests/permission-service.test.ts
npx tsx tests/project-norm-warnings.test.ts
npx tsx tests/inventory-posting.test.ts
npx tsx tests/inventory-revision.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run lint
npm run typecheck
npx prisma validate
npm run build
```

Expected: PASS, with only known Next/Prisma deprecation warnings.

- [ ] **Step 3: Browser smoke**

Run dev server, open `/nguoi-dung`, `/vat-lieu`, `/nhap`, `/xuat`, `/chuyen-kho`, and `/bao-cao` in Browser. Verify unauthenticated requests redirect to `/login`; after login as owner, nav shows “Người dùng” and permission page renders.

- [ ] **Step 4: Final commit if fixes were needed**

Commit only verified changes.

## Self-Review

- Spec coverage: Phase 6 requirements are covered by schema, permission helper, server guards, and UI to tick permissions.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps are left.
- Type consistency: permission code strings are centralized in `lib/permissions/catalog.ts`; action/page guards should import from that source or use literal known codes listed above.
