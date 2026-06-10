# Fund Documents And Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 7: multi-line project fund receipt/payment slips and fund reports by project plus all-project totals.

**Architecture:** Keep fund accounting separate from inventory accounting. `FundDocument` and `FundDocumentLine` are the source of truth for cash slips; fund balances are computed from posted, non-voided receipt/payment lines. Server actions enforce `fund.*` permissions, and client UI only calls those guarded actions.

**Tech Stack:** Next.js 16 App Router, React Server/Client Components, Prisma/PostgreSQL, TypeScript, node `assert` tests via `tsx`.

---

### Task 1: Fund Domain Parsing And Report Math

**Files:**
- Create: `lib/funds/document-form.ts`
- Create: `lib/funds/report.ts`
- Test: `tests/fund-document-form.test.ts`
- Test: `tests/fund-report.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `tests/fund-document-form.test.ts` covering:
- JSON `lines` with two rows is parsed into amount/category/description/note.
- Empty amount, zero amount, negative amount, empty category, and empty description fail with Vietnamese messages.
- `parseFundDocumentDate` accepts `YYYY-MM-DD` and stores the same `+07:00` local-day convention as inventory forms.

Run: `npx tsx tests/fund-document-form.test.ts`
Expected: FAIL because `lib/funds/document-form.ts` does not exist.

- [ ] **Step 2: Implement `lib/funds/document-form.ts`**

Export:
- `ParsedFundDocumentLine`
- `parseFundDocumentLines(formData: FormData)`
- `parseFundDocumentDate(formData: FormData, fallback = new Date())`

Use zod like `lib/inventory/document-form.ts`. Line schema:
- `amount`: positive number
- `category`: trimmed non-empty string, max 120
- `description`: trimmed non-empty string, max 500
- `note`: optional trimmed string, max 500

Run: `npx tsx tests/fund-document-form.test.ts`
Expected: PASS.

- [ ] **Step 3: Write failing report math tests**

Create `tests/fund-report.test.ts` for a pure helper in `lib/funds/report.ts`:
- Receipt increases balance.
- Payment increases expense and decreases balance.
- Opening balance ignores in-period receipt/payment and includes posted rows before `from`.
- Voided/draft rows are excluded by the caller, so helper only receives already-filtered signed rows.

Run: `npx tsx tests/fund-report.test.ts`
Expected: FAIL because `lib/funds/report.ts` does not exist.

- [ ] **Step 4: Implement `lib/funds/report.ts`**

Export:
- `FundSignedEntry`
- `calculateFundPeriodSummary(entries, from, to)`

The helper returns:
- `openingBalance`
- `receiptAmount`
- `paymentAmount`
- `closingBalance`

Run: `npx tsx tests/fund-report.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add lib/funds tests/fund-document-form.test.ts tests/fund-report.test.ts
git commit -m "test: cover fund document parsing and reports"
```

### Task 2: Fund Persistence And Server Actions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260610200000_fund_documents/migration.sql`
- Create: `lib/actions/funds.ts`
- Create: `lib/queries/funds.ts`
- Modify: `prisma/seed.ts`
- Test: `tests/fund-report.test.ts`

- [ ] **Step 1: Write failing query/action-facing tests**

Extend `tests/fund-report.test.ts` to cover row labeling helpers:
- `fundKindLabel("RECEIPT") === "Phiếu thu"`
- `fundKindLabel("PAYMENT") === "Phiếu chi"`
- `fundStatusLabel("POSTED") === "Đã ghi sổ"`

Run: `npx tsx tests/fund-report.test.ts`
Expected: FAIL because labels are not exported yet.

- [ ] **Step 2: Add Prisma schema and migration**

Add:
- `enum FundDocumentKind { RECEIPT PAYMENT }`
- `enum FundDocumentStatus { DRAFT POSTED VOIDED }`
- `model FundDocument`
- `model FundDocumentLine`

Relations:
- `Fund.documents`
- `User.fundDocumentsCreated`
- `User.fundDocumentsPosted`
- `User.fundDocumentsVoided`

Indexes:
- `FundDocument`: `[fundId, documentDate]`, `[kind, status]`, `[createdById]`
- `FundDocumentLine`: unique `[documentId, lineNo]`, index `[category]`

Run:
```bash
npx prisma validate
npx prisma generate
```
Expected: PASS.

- [ ] **Step 3: Implement fund queries**

Create `lib/queries/funds.ts` with:
- labels: `FUND_KIND_LABELS`, `FUND_STATUS_LABELS`, `fundKindLabel`, `fundStatusLabel`
- `getFundOptions()`
- `getFundDocuments()`
- `getFundDocumentDetail(id)`
- `getFundReport({ from, to, projectId })`

Report query loads posted, non-voided documents for all projects needed to compute opening and in-period amounts, then uses `calculateFundPeriodSummary`.

Run: `npx tsx tests/fund-report.test.ts`
Expected: PASS.

- [ ] **Step 4: Implement fund server actions**

Create `lib/actions/funds.ts`:
- `createFundDocument(formData)` guarded by `fund.create`
- `updateFundDocument(formData)` guarded by `fund.edit_posted`
- `voidFundDocument(formData)` guarded by `fund.void`

Rules:
- Create posts immediately (`status = POSTED`) for demo parity with inventory documents.
- Every slip needs `fundId`, `kind`, date, and at least one line.
- Editing only supports `POSTED`; it replaces lines and increments `revisionNo`.
- Voiding only supports `POSTED`; it sets `VOIDED`, `voidedAt`, `voidedById`, `voidReason`.
- Revalidate `/quy`, `/bao-cao`, `/cong-trinh`, and detail/edit routes.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Seed demo fund documents**

Update `prisma/seed.ts` so project seed data includes at least one project fund with one receipt and one payment. Delete fund document lines/documents before deleting projects/funds/users.

Run:
```bash
npx prisma validate
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add prisma/schema.prisma prisma/migrations/20260610200000_fund_documents/migration.sql lib/actions/funds.ts lib/queries/funds.ts prisma/seed.ts tests/fund-report.test.ts
git commit -m "feat: add fund document storage and actions"
```

### Task 3: Fund UI And Navigation

**Files:**
- Create: `components/fund-document-form.tsx`
- Create: `components/fund-document-list.tsx`
- Create: `components/fund-document-detail.tsx`
- Create: `components/fund-void-button.tsx`
- Create: `components/fund-report.tsx`
- Create: `app/(app)/quy/page.tsx`
- Create: `app/(app)/quy/moi/page.tsx`
- Create: `app/(app)/quy/[id]/page.tsx`
- Create: `app/(app)/quy/[id]/sua/page.tsx`
- Modify: `components/nav.tsx`
- Modify: `app/(app)/page.tsx`
- Modify: `app/(app)/bao-cao/page.tsx`

- [ ] **Step 1: Add fund list/detail/form components**

Follow the existing inventory document UI:
- List shows code, kind, date, fund/project, status, line count, total amount, creator, view button.
- Form supports receipt/payment kind, fund selector, document date, multi-line amount/category/description/note, add/remove line, submit create/edit.
- Detail shows slip metadata, lines, revision, creator/poster/voider, and edit/void buttons based on props.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Add fund routes**

Routes:
- `/quy`: guarded by `fund.view`, shows list, report summary, and create button when user has `fund.create`.
- `/quy/moi`: guarded by `fund.create`, shows create form.
- `/quy/[id]`: guarded by `fund.view`, shows detail and permission-based edit/void controls.
- `/quy/[id]/sua`: guarded by `fund.edit_posted`, only opens POSTED slips.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Add navigation and report integration**

Update:
- `components/nav.tsx`: add Quỹ link gated by `fund.view`.
- `app/(app)/page.tsx`: add Quỹ quick action if allowed.
- `app/(app)/bao-cao/page.tsx`: show compact fund report if user has `fund.view`.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add components/fund-*.tsx app/'(app)'/quy components/nav.tsx app/'(app)'/page.tsx app/'(app)'/bao-cao/page.tsx
git commit -m "feat: add fund document UI"
```

### Task 4: Final Verification

**Files:**
- All touched files

- [ ] **Step 1: Run full automated checks**

Run:
```bash
for f in tests/*.test.ts; do npx tsx "$f" || exit 1; done
npm run lint
npm run typecheck
npx prisma validate
npm run build
```
Expected: all PASS.

- [ ] **Step 2: Apply migration locally**

Run:
```bash
npx prisma migrate deploy
```
Expected: migration `20260610200000_fund_documents` is applied or already applied.

- [ ] **Step 3: Browser smoke**

Start dev server and verify:
- Unauthenticated `/quy` redirects to `/login`.
- Owner can open `/quy`.
- Owner sees list, report summary, create button, and detail route renders.

- [ ] **Step 4: Commit fixes if any**

Commit only verification-driven fixes with a focused message.

---

## Self-Review

- Spec coverage: covers Phase 7 fund slips, project fund report, and all-project totals. It intentionally defers Excel export and print/view templates to Phase 8.
- Placeholder scan: no TBD/TODO steps.
- Type consistency: `FundDocumentKind`, `FundDocumentStatus`, `FundDocument`, and `FundDocumentLine` names match the approved spec.
