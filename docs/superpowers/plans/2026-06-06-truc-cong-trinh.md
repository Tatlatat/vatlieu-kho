# Trục Công trình (Project) — Implementation Plan

> **For agentic workers:** Workflow = **agy code nghiệp vụ, Claude giữ DevOps/config + di trú + verify từ artifact**. Steps dùng checkbox `- [ ]`. KHÔNG có test framework trong repo → verify bằng `npx tsc --noEmit` + `npm run lint` + `npm run build` + psql trên DB.

**Goal:** Thêm trục Công trình (Project) gom Kho + Quỹ, báo cáo "theo công trình" (giao thoa các sổ giữ riêng đơn vị), di trú data thật không mất gì.

**Architecture:** Model `Project` mới; `Warehouse.projectId?` + `Fund.projectId?` nullable. Logic xuất-nhập-tồn + Quỹ GIỮ NGUYÊN. Báo cáo đọc từ sổ gốc qua projectId. Tổng chi phí dùng nguyên tắc cộng-dồn-nguồn (hôm nay = chi quỹ).

**Tech Stack:** Next 16.2.6 App Router, Prisma 6 + PostgreSQL (Supabase), NextAuth v5. Mọi trang data: `export const dynamic = "force-dynamic"`.

**Phân vai (QUAN TRỌNG — theo quirks agy):**
- **agy code:** Prisma schema (thêm model + field), queries, server actions, React components/pages nghiệp vụ. agy MẠNH ở sinh code có cấu trúc khi prompt kèm code mẫu.
- **Claude giữ + verify:** file migration SQL thủ công, script di trú data, .env/config, chạy migrate, và VERIFY mọi output agy từ artifact (git diff / tsc / psql) — KHÔNG tin self-report agy. agy hay clobber config + báo xong sớm.

**Branch:** `feat/project-truc` (đã tạo). Spec: `docs/superpowers/specs/2026-06-06-truc-cong-trinh-design.md`.

**Quy ước verify mỗi task code:**
```
cd /tmp/vatlieu-kho
npx tsc --noEmit && npm run lint && npm run build
```
Mọi task phải pass cả 3 trước khi commit. Push sau mỗi phase.

---

## File Structure

| File | Ai | Trách nhiệm |
|---|---|---|
| `prisma/schema.prisma` | agy | thêm model Project + Warehouse.projectId + Fund.projectId |
| `prisma/migrations/<ts>_project/migration.sql` | **Claude** | SQL thủ công idempotent (CREATE Project, ALTER nullable, FK SET NULL, index) |
| `prisma/migrate-project-data.ts` | **Claude** | script di trú 1 lần (kho/quỹ → Project) |
| `lib/validation.ts` | agy | projectSchema (code, name, note) |
| `lib/actions/projects.ts` | agy | createProject/updateProject/deleteProject (OWNER, chặn xóa nếu còn kho/quỹ) |
| `lib/actions/warehouses.ts` | agy | thêm projectId vào create/update |
| `lib/actions/funds.ts` | agy | thêm projectId vào create/update |
| `lib/queries/projects.ts` | agy | getAllProjects (+_count), getProjectSummary(id), getAllProjectsSummary |
| `components/project-manager.tsx` | agy | CRUD UI (mẫu fund-manager.tsx, native select) |
| `components/warehouse-manager.tsx` | agy | thêm ô chọn Công trình |
| `components/fund-manager.tsx` | agy | thêm ô chọn Công trình |
| `app/(app)/cong-trinh/page.tsx` | agy | list + tổng hợp đa-CT (force-dynamic) |
| `app/(app)/cong-trinh/[id]/page.tsx` | agy | chi tiết CT (force-dynamic) |
| `components/nav.tsx` | agy | thêm link "Công trình" |

**Hợp đồng kiểu (dùng xuyên suốt):**
```ts
// getProjectSummary(id) trả:
{ project: {id,name,code,isActive,note},
  stock: { materialName, unit, totalIn, totalOut, balance }[],   // qua warehouse.projectId
  cash: { totalIn:number, totalOut:number, balance:number },     // qua fund.projectId
  totalCostVnd: number }   // = cash.totalOut (cộng-dồn-nguồn, hôm nay chỉ quỹ)
```

---

## PHASE 1 — Schema + Migration + Di trú (NỀN TẢNG)

### Task 1.1 (agy): Thêm model Project + field vào schema

**File:** `prisma/schema.prisma`

- [ ] **Bước 1 (agy):** Thêm model Project (đặt sau model Fund). Prompt agy kèm code mẫu CHÍNH XÁC:
```prisma
model Project {
  id         String      @id @default(cuid())
  code       String      @unique
  name       String
  isActive   Boolean     @default(true)
  note       String?
  createdAt  DateTime    @default(now())
  warehouses Warehouse[]
  funds      Fund[]
}
```
- [ ] **Bước 2 (agy):** Trong model `Warehouse`, thêm 2 dòng:
```prisma
  projectId  String?
  project    Project?        @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
và thêm `@@index([projectId])` trong model Warehouse.
- [ ] **Bước 3 (agy):** Trong model `Fund`, thêm 2 dòng tương tự:
```prisma
  projectId  String?
  project    Project?        @relation(fields: [projectId], references: [id], onDelete: SetNull)
```
và `@@index([projectId])` trong model Fund.
- [ ] **Bước 4 (Claude VERIFY):** `git diff prisma/schema.prisma` — xác nhận đúng 3 thay đổi, KHÔNG đụng model khác. Chạy `npx prisma format && npx prisma validate`. Expected: valid.
- [ ] **Bước 5 (Claude):** Commit:
```bash
git add prisma/schema.prisma
git commit -m "feat(project): schema model Project + Warehouse/Fund.projectId (nullable)"
```

### Task 1.2 (Claude): Migration SQL thủ công + di trú

**File:** `prisma/migrations/<timestamp>_project/migration.sql` (Claude tự viết, KHÔNG để agy)

- [ ] **Bước 1 (Claude):** Tạo thư mục migration với timestamp đúng định dạng Prisma, viết SQL idempotent:
```sql
-- CreateTable Project
CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON "Project"("code");

-- AlterTable Warehouse + Fund (nullable, an toàn data cũ)
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Fund" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "Warehouse_projectId_idx" ON "Warehouse"("projectId");
CREATE INDEX IF NOT EXISTS "Fund_projectId_idx" ON "Fund"("projectId");

-- FK ON DELETE SET NULL (DO block idempotent)
DO $$ BEGIN
  ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Fund" ADD CONSTRAINT "Fund_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```
- [ ] **Bước 2 (Claude):** Áp migration vào DB local trước:
Run: `npx prisma migrate deploy` (hoặc `prisma db push` nếu local dùng push). Expected: áp thành công.
- [ ] **Bước 3 (Claude):** Verify bảng + cột tồn tại qua psql:
```sql
\d "Project"
SELECT column_name FROM information_schema.columns WHERE table_name='Warehouse' AND column_name='projectId';
SELECT column_name FROM information_schema.columns WHERE table_name='Fund' AND column_name='projectId';
```
Expected: Project có 6 cột; Warehouse + Fund đều có projectId.
- [ ] **Bước 4 (Claude):** Commit:
```bash
git add prisma/migrations/
git commit -m "feat(project): migration SQL thủ công — Project + projectId nullable + FK SetNull"
```

### Task 1.3 (Claude): Script di trú data hiện có

**File:** `prisma/migrate-project-data.ts`

- [ ] **Bước 1 (Claude) KIỂM DB TRƯỚC:** Đếm + xem tên kho/quỹ hiện có (local + sẽ lặp lại trên production trước khi chạy thật):
```sql
SELECT id, code, name FROM "Warehouse";
SELECT id, code, name FROM "Fund";
```
Ghi lại để di trú khớp đúng, không gán bừa.
- [ ] **Bước 2 (Claude):** Viết script idempotent:
```ts
import { prisma } from "../lib/prisma";

async function main() {
  const warehouses = await prisma.warehouse.findMany();
  for (const w of warehouses) {
    if (w.projectId) continue; // đã gán
    // 1 CT = 1 kho: tạo Project từ kho (tránh trùng code)
    const code = `CT-${w.code}`;
    const proj = await prisma.project.upsert({
      where: { code },
      update: {},
      create: { code, name: w.name },
    });
    await prisma.warehouse.update({ where: { id: w.id }, data: { projectId: proj.id } });
    console.log(`Warehouse ${w.name} -> Project ${proj.code}`);
  }
  const funds = await prisma.fund.findMany();
  for (const f of funds) {
    if (f.projectId) continue;
    // khớp Project theo tên kho; không có -> tạo theo quỹ
    const byName = await prisma.project.findFirst({ where: { name: f.name } });
    const proj = byName ?? await prisma.project.upsert({
      where: { code: `CT-${f.code}` },
      update: {},
      create: { code: `CT-${f.code}`, name: f.name },
    });
    await prisma.fund.update({ where: { id: f.id }, data: { projectId: proj.id } });
    console.log(`Fund ${f.name} -> Project ${proj.code}`);
  }
  const nProj = await prisma.project.count();
  console.log(`Tổng Project sau di trú: ${nProj}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```
- [ ] **Bước 3 (Claude):** Chạy trên local + verify:
Run: `npx tsx prisma/migrate-project-data.ts`
Verify psql: `SELECT COUNT(*) FROM "Warehouse" WHERE "projectId" IS NULL;` (chỉ còn kho ảo cố ý null), `SELECT COUNT(*) FROM "Project";`. Expected: mọi kho/quỹ thật đều có projectId; số Project hợp lý.
- [ ] **Bước 4 (Claude):** Commit (script lưu lại để chạy production sau):
```bash
git add prisma/migrate-project-data.ts
git commit -m "feat(project): script di trú data kho/quỹ -> Project (chạy 1 lần)"
```

> **GHI CHÚ PRODUCTION (Claude làm khi deploy):** migration tự áp qua `vercel-build` (prisma migrate deploy). Script di trú KHÔNG tự chạy — Claude chạy tay trên production SAU khi migrate, sau khi KIỂM tên kho/quỹ thật để khớp. Push phase này rồi mới sang Phase 2.

---

## PHASE 2 — Actions + Queries (agy code, Claude verify)

### Task 2.1 (agy): validation + actions projects.ts

**Files:** `lib/validation.ts`, `lib/actions/projects.ts`

- [ ] **Bước 1 (agy):** Trong `lib/validation.ts` thêm:
```ts
export const projectSchema = z.object({
  name: z.string().min(1, "Tên công trình bắt buộc"),
  code: z.string().min(1, "Mã công trình bắt buộc"),
  note: z.string().optional(),
});
```
- [ ] **Bước 2 (agy):** Tạo `lib/actions/projects.ts` theo mẫu `lib/actions/funds.ts` (OWNER-only, P2002 catch, revalidatePath). Hàm: `createProject`, `updateProject`, `deleteProject`. deleteProject CHẶN nếu còn kho/quỹ:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { projectSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createProject(input: { name: string; code: string; note?: string }): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.project.create({ data: parsed.data });
    revalidatePath("/cong-trinh");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã công trình "${parsed.data.code}" đã tồn tại.` };
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateProject(id: string, input: { name: string; code: string; note?: string }): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.project.update({ where: { id }, data: parsed.data });
    revalidatePath("/cong-trinh");
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã công trình "${parsed.data.code}" đã tồn tại.` };
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireRole("OWNER");
  const [nWh, nFund] = await Promise.all([
    prisma.warehouse.count({ where: { projectId: id } }),
    prisma.fund.count({ where: { projectId: id } }),
  ]);
  if (nWh + nFund > 0) return { ok: false, error: "Không thể xóa: công trình đang có kho hoặc quỹ. Gỡ liên kết trước." };
  try {
    await prisma.project.delete({ where: { id } });
    revalidatePath("/cong-trinh");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```
- [ ] **Bước 3 (Claude VERIFY):** `git diff` 2 file. `npx tsc --noEmit && npm run lint`. Expected: pass, không đụng file khác (agy hay clobber — kiểm `git status`).
- [ ] **Bước 4 (Claude):** Commit: `git add lib/validation.ts lib/actions/projects.ts && git commit -m "feat(project): projectSchema + actions CRUD (OWNER, chặn xóa khi còn kho/quỹ)"`

### Task 2.2 (agy): projectId vào warehouses + funds actions

**Files:** `lib/actions/warehouses.ts`, `lib/actions/funds.ts`, `lib/validation.ts`

- [ ] **Bước 1 (agy):** Trong validation.ts, warehouseSchema + fundSchema thêm `projectId: z.string().optional().nullable()`.
- [ ] **Bước 2 (agy):** warehouses.ts create/update: nhận + lưu `projectId` (rỗng → null). funds.ts tương tự. Giữ nguyên phần còn lại.
- [ ] **Bước 3 (Claude VERIFY):** `git diff`, `npx tsc --noEmit && npm run lint`, kiểm `git status` không clobber. Commit: `git commit -am "feat(project): gắn projectId khi tạo/sửa kho + quỹ"`

### Task 2.3 (agy): queries projects.ts

**File:** `lib/queries/projects.ts`

- [ ] **Bước 1 (agy):** Tạo file với 3 query. Đọc sổ gốc QUA projectId. `getProjectSummary` trả đúng hợp đồng kiểu (xem đầu plan). Prompt agy kèm mẫu:
```ts
import { prisma } from "@/lib/prisma";

export async function getAllProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, code: true, name: true, isActive: true, note: true,
      _count: { select: { warehouses: true, funds: true } },
    },
  });
}

// Tổng hợp 1 CT: tồn vật tư (qua kho của CT) + dòng tiền quỹ (qua quỹ của CT)
export async function getProjectSummary(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  // các kho + quỹ thuộc CT
  const whs = await prisma.warehouse.findMany({ where: { projectId }, select: { id: true } });
  const funds = await prisma.fund.findMany({ where: { projectId }, select: { id: true } });
  const whIds = whs.map((w) => w.id);
  const fundIds = funds.map((f) => f.id);

  // Tồn vật tư: group StockMovement của các kho CT (loại voided), IN cộng / OUT trừ
  const stock = whIds.length ? await prisma.$queryRaw<
    { materialName: string; unit: string; totalIn: number; totalOut: number; balance: number }[]
  >`
    SELECT m.name AS "materialName", m.unit AS unit,
      COALESCE(SUM(CASE WHEN sm.type='IN' THEN sm.quantity ELSE 0 END),0)::float8 AS "totalIn",
      COALESCE(SUM(CASE WHEN sm.type='OUT' THEN sm.quantity ELSE 0 END),0)::float8 AS "totalOut",
      COALESCE(SUM(CASE WHEN sm.type='IN' THEN sm.quantity ELSE -sm.quantity END),0)::float8 AS balance
    FROM "StockMovement" sm JOIN "Material" m ON m.id = sm."materialId"
    WHERE sm."warehouseId" = ANY(${whIds}) AND sm."voidedAt" IS NULL
    GROUP BY m.name, m.unit ORDER BY m.name` : [];

  // Dòng tiền quỹ: tổng Thu/Chi (loại voided) của các quỹ CT
  const cashRows = fundIds.length ? await prisma.$queryRaw<{ totalIn: number; totalOut: number }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN type='THU' THEN amount ELSE 0 END),0)::float8 AS "totalIn",
      COALESCE(SUM(CASE WHEN type='CHI' THEN amount ELSE 0 END),0)::float8 AS "totalOut"
    FROM "CashEntry" WHERE "fundId" = ANY(${fundIds}) AND "voidedAt" IS NULL` : [{ totalIn: 0, totalOut: 0 }];
  const cash = { totalIn: Number(cashRows[0].totalIn), totalOut: Number(cashRows[0].totalOut),
                 balance: Number(cashRows[0].totalIn) - Number(cashRows[0].totalOut) };

  // Tổng chi phí: cộng-dồn-nguồn — hôm nay chỉ quỹ có tiền
  const totalCostVnd = cash.totalOut;

  return { project, stock, cash, totalCostVnd };
}

// Bảng tổng hợp đa-CT: mỗi CT + tồn quỹ + tổng thu/chi
export async function getAllProjectsSummary() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
  const out = [];
  for (const p of projects) {
    const s = await getProjectSummary(p.id);
    out.push({ id: p.id, name: p.name, code: p.code, isActive: p.isActive,
               cashBalance: s?.cash.balance ?? 0, totalIn: s?.cash.totalIn ?? 0,
               totalOut: s?.cash.totalOut ?? 0, totalCostVnd: s?.totalCostVnd ?? 0 });
  }
  return out;
}
```
- [ ] **Bước 2 (Claude VERIFY):** `npx tsc --noEmit && npm run lint`. KIỂM raw SQL: tên cột "StockMovement".type/quantity/warehouseId/voidedAt, "CashEntry".type/amount/fundId/voidedAt khớp schema thật (Claude đối chiếu prisma/schema.prisma — agy hay nhầm tên cột raw). Sửa nếu lệch.
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(project): queries getAllProjects/getProjectSummary/getAllProjectsSummary"`

---

## PHASE 3 — UI (agy code, Claude verify render thật)

### Task 3.1 (agy): project-manager + trang /cong-trinh

**Files:** `components/project-manager.tsx`, `app/(app)/cong-trinh/page.tsx`

- [ ] **Bước 1 (agy):** `components/project-manager.tsx` theo mẫu `fund-manager.tsx` (CRUD Dialog, native input, toast, router.refresh). Cột bảng: Mã | Tên CT | Số kho | Số quỹ | Thao tác (Sửa/Xóa). Nút Xóa disable nếu `_count.warehouses + _count.funds > 0`.
- [ ] **Bước 2 (agy):** `app/(app)/cong-trinh/page.tsx`:
```tsx
export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth-helpers";
import { getAllProjects, getAllProjectsSummary } from "@/lib/queries/projects";
import { ProjectManager } from "@/components/project-manager";
// ... render: bảng tổng hợp đa-CT (getAllProjectsSummary, mỗi dòng link /cong-trinh/[id])
//     + ProjectManager (getAllProjects) cho CRUD. requireRole("OWNER") ở đầu.
```
Bảng tổng hợp: Công trình | Tồn quỹ | Tổng thu | Tổng chi | Tổng chi phí. formatVnd cho cột tiền. Mỗi dòng `<Link href={/cong-trinh/${id}}>`.
- [ ] **Bước 3 (Claude VERIFY):** `npx tsc --noEmit && npm run lint && npm run build`. Verify render thật (authed) — KHÔNG chỉ build pass (theo [[verify-ui-renders-not-just-build]]): chạy dev, đăng nhập OWNER, mở /cong-trinh, xác nhận bảng + form hiện. Kiểm `git status` agy không clobber.
- [ ] **Bước 4 (Claude):** Commit: `git commit -am "feat(project): trang /cong-trinh + project-manager CRUD + bảng tổng hợp đa-CT"`

### Task 3.2 (agy): trang chi tiết /cong-trinh/[id]

**File:** `app/(app)/cong-trinh/[id]/page.tsx`

- [ ] **Bước 1 (agy):**
```tsx
export const dynamic = "force-dynamic";
// params: Promise<{ id: string }> (Next 16). getProjectSummary(id); nếu null -> notFound().
// Render 3 khối:
//  - Khối Quỹ: Tổng thu / Tổng chi / Tồn (formatVnd) — đơn vị VND.
//  - Khối Vật tư: bảng materialName | đơn vị | nhập | xuất | tồn — đơn vị gốc (KHÔNG quy tiền).
//  - Khối Tổng chi phí (VND): totalCostVnd + ghi chú "hiện tính theo chi quỹ; vật tư/xe quy tiền bổ sung sau".
```
- [ ] **Bước 2 (Claude VERIFY):** build + render thật: mở /cong-trinh/[id] của 1 CT có data, xác nhận 3 khối hiện đúng số (đối chiếu psql tổng thu/chi của quỹ CT đó). Vật tư hiện đơn vị gốc, KHÔNG trộn tiền.
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(project): trang chi tiết công trình — vật tư/quỹ đúng đơn vị + tổng chi phí cộng-dồn-nguồn"`

### Task 3.3 (agy): chọn Công trình ở form Kho + Quỹ + nav

**Files:** `components/warehouse-manager.tsx`, `components/fund-manager.tsx`, `components/nav.tsx`

- [ ] **Bước 1 (agy):** warehouse-manager + fund-manager: thêm ô **native select** "Công trình (không bắt buộc)" (options từ danh sách Project active, có option "— Không thuộc CT —" = null). Truyền projectId vào create/update action. Page tương ứng truyền danh sách projects xuống.
- [ ] **Bước 2 (agy):** nav.tsx: thêm link "Công trình" (icon phù hợp, vd Building2 từ lucide) — hiển thị cho OWNER (giống các link quản trị khác).
- [ ] **Bước 3 (Claude VERIFY):** build + render thật: tạo/sửa 1 kho gán CT → verify psql warehouse.projectId set đúng; bỏ chọn → null. nav hiện link. Kiểm git status.
- [ ] **Bước 4 (Claude):** Commit: `git commit -am "feat(project): chọn Công trình ở form kho/quỹ + link nav Công trình"`

---

## PHASE 4 — Verify tổng + di trú production

### Task 4.1 (Claude): Regression — không phá thứ đang chạy
- [ ] **Bước 1:** `npx tsc --noEmit && npm run lint && npm run build` toàn bộ — pass.
- [ ] **Bước 2:** Render thật các trang CŨ còn chạy đúng: /vat-lieu, /nhap, /xuat, /chuyen-kho, /quy, /bao-cao — không vỡ do thêm projectId.
- [ ] **Bước 3:** psql sanity: tồn kho (current_stock) + tồn quỹ (fund_balance) KHÔNG đổi so với trước (Project chỉ gom, không sửa sổ). Đối chiếu vài dòng.

### Task 4.2 (Claude): Di trú production + deploy
- [ ] **Bước 1:** Push branch, tạo PR / merge theo quy trình. `vercel-build` tự `prisma migrate deploy` → áp migration Project lên Supabase.
- [ ] **Bước 2:** KIỂM DB production TRƯỚC di trú: `SELECT id,code,name FROM "Warehouse"; SELECT id,code,name FROM "Fund";` (đối chiếu tên để khớp đúng).
- [ ] **Bước 3:** Chạy script di trú trên production (DATABASE_URL production): `npx tsx prisma/migrate-project-data.ts`. Verify: mọi kho/quỹ thật có projectId; số Project khớp số CT thật.
- [ ] **Bước 4:** Smoke production: mở /cong-trinh trên domain live, xác nhận CT hiện + tổng hợp đúng. Cập nhật memory + README.

---

## Self-Review (đã chạy)

**1. Spec coverage:**
- Spec §2 model Project + projectId: Task 1.1. ✓
- §3 báo cáo giao thoa (chi tiết CT + đa-CT + cộng-dồn-nguồn): Task 2.3 (queries) + 3.1/3.2 (UI). ✓
- §4a migration an toàn: Task 1.2 (Claude). ✓
- §4b di trú: Task 1.3 (local) + 4.2 (production). ✓
- §4c chừa cửa tiền: totalCostVnd=cash.totalOut + ghi chú UI (Task 2.3/3.2) — không thêm cột StockMovement. ✓
- §4d UI (cong-trinh CRUD, chọn CT ở form, nav): Task 3.1/3.3. ✓
- §5 xử lý lỗi (chặn xóa, nullable, idempotent, P2002): Task 2.1/1.2. ✓
- §1 regression giữ nguyên sổ: Task 4.1. ✓
- §6 YAGNI: không đơn giá vật tư/xe/phân quyền/việc nhỏ — không task nào làm. ✓

**2. Placeholder scan:** Không TBD. Mọi task code có mẫu code + lệnh verify cụ thể. Phân vai agy/Claude rõ từng bước. ✓

**3. Type consistency:**
- `getProjectSummary` trả {project, stock[], cash{totalIn,totalOut,balance}, totalCostVnd} — khớp hợp đồng kiểu đầu plan + dùng ở 3.2. ✓
- `getAllProjectsSummary` trả {id,name,code,isActive,cashBalance,totalIn,totalOut,totalCostVnd} — dùng ở 3.1. ✓
- projectSchema (name,code,note?) khớp actions 2.1. ✓
- Raw SQL cột (StockMovement.type/quantity/warehouseId/voidedAt; CashEntry.type/amount/fundId/voidedAt) — Claude verify khớp schema ở 2.3 bước 2. ✓
