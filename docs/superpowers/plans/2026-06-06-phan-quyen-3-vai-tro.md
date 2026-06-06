# Phân quyền 3 vai trò — Implementation Plan

> **For agentic workers:** Workflow = **agy code phần lặp (UI, map guard có hướng dẫn rõ), Claude giữ migration enum + auth core + verify từ artifact**. KHÔNG có test framework → verify bằng `npx tsc --noEmit` + `npm run lint` + `npm run build` + psql + render thật. Steps dùng checkbox `- [ ]`.

**Goal:** Thay 2 role (OWNER/STAFF) bằng 3 vai trò phân cấp ADMIN ⊃ MANAGER ⊃ KEEPER, kiểm quyền bằng so cấp ≥, di trú enum an toàn (RENAME).

**Architecture:** Đổi enum bằng RENAME VALUE (rows tự đổi). `requireAtLeast(minRole)` so cấp số thay `requireRole` so bằng. Map từng guard theo ma trận (một số NỚI XUỐNG: NCC + báo cáo tồn cho KEEPER; một số NÂNG: quỹ lên MANAGER). nav + user-manager 3 vai trò.

**Tech Stack:** Next 16.2.6, Prisma 6 + PostgreSQL, NextAuth v5 JWT. Role vào JWT qua auth.config.ts.

**Phân vai:** Claude tự làm Phase 1 (enum migration — chính xác cao) + Phase 2 (auth-helpers core). agy làm Phase 3-4 (map guard hàng loạt + UI) có hướng dẫn từng file. Claude verify mọi thứ.

**Branch:** `feat/project-truc` (tiếp). Spec: `docs/superpowers/specs/2026-06-06-phan-quyen-3-vai-tro-design.md`.

**MA TRẬN (tham chiếu khi map):**
- KEEPER (cấp 1): NCC, phiếu nhập/xuất/chuyển, báo cáo tồn, in/Excel, kiểm kê, nhật ký giờ xe.
- MANAGER (cấp 2): + tạo vật tư, quỹ (CRUD+phiếu+báo cáo), danh mục nền (kho/CT/xe), tồn đầu kỳ, hủy phiếu.
- ADMIN (cấp 3): + quản lý người dùng.

---

## PHASE 1 (Claude): Enum + migration RENAME

### Task 1.1: schema.prisma đổi enum Role
**File:** `prisma/schema.prisma`
- [ ] **Bước 1:** Đổi `enum Role { OWNER STAFF }` → `enum Role { ADMIN MANAGER KEEPER }`.
- [ ] **Bước 2:** `User.role @default(STAFF)` → `@default(KEEPER)`.
- [ ] **Bước 3:** `npx prisma format && npx prisma validate` — valid.
- [ ] **Bước 4:** Commit: `git commit -am "feat(rbac): enum Role ADMIN/MANAGER/KEEPER + default KEEPER"`

### Task 1.2: Migration RENAME (2 file riêng — ADD VALUE tách)
**Files:** `prisma/migrations/<ts1>_role_rename/migration.sql`, `<ts2>_role_add_manager/migration.sql`
- [ ] **Bước 1:** Tạo migration rename `20260606130000_role_rename/migration.sql`:
```sql
ALTER TYPE "Role" RENAME VALUE 'OWNER' TO 'ADMIN';
ALTER TYPE "Role" RENAME VALUE 'STAFF' TO 'KEEPER';
```
- [ ] **Bước 2:** Tạo migration add `20260606130100_role_add_manager/migration.sql` (RIÊNG vì Postgres không cho ADD VALUE rồi dùng ngay trong cùng tx):
```sql
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
```
- [ ] **Bước 3:** Áp local: `npx prisma migrate deploy`. Expected: 2 migration applied.
- [ ] **Bước 4:** Verify psql:
```sql
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='Role' ORDER BY enumsortorder;
SELECT email, role FROM "User";
```
Expected: enum có ADMIN/KEEPER/MANAGER; user cũ role = ADMIN (owner) / KEEPER (staff) — TỰ đổi nhờ rename.
- [ ] **Bước 5:** `npx prisma generate`. Commit: `git add prisma/migrations && git commit -m "feat(rbac): migration RENAME enum Role + ADD MANAGER (di trú live an toàn)"`

---

## PHASE 2 (Claude): auth-helpers core

### Task 2.1: requireAtLeast + Role type
**File:** `lib/auth-helpers.ts`
- [ ] **Bước 1:** Thay nội dung:
```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type Role = "ADMIN" | "MANAGER" | "KEEPER";

const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as unknown as SessionUser;
}

/** Yêu cầu cấp >= minRole (phân cấp lồng nhau). Thấp hơn -> về trang chính. */
export async function requireAtLeast(minRole: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) redirect("/");
  return user;
}

/** Nhãn vai trò tiếng Việt (dùng ở UI). */
export function roleLabel(role: Role): string {
  return role === "ADMIN" ? "Quản trị" : role === "MANAGER" ? "Quản lý" : "Thủ kho";
}
```
- [ ] **Bước 2:** `npx tsc --noEmit` — sẽ BÁO LỖI ở mọi file còn import requireRole (chưa map). Đó là dự kiến — Phase 3 sửa. Ghi nhận danh sách file lỗi.
- [ ] **Bước 3:** Commit: `git commit -am "feat(rbac): requireAtLeast so cấp + roleLabel (thay requireRole)"`

---

## PHASE 3 (agy): Map guard actions + pages theo ma trận

Giao agy với BẢNG MAP rõ. agy thay `requireRole("OWNER")` / `requireUser` theo bảng. Mỗi file đổi import + lời gọi.

### Task 3.1 (agy): map guard trong lib/actions/
**Files:** lib/actions/{suppliers,materials,warehouses,projects,equipment,funds,opening,void,users}.ts + cash.ts
Bảng map (agy theo ĐÚNG):
| File | Đổi thành |
|---|---|
| suppliers.ts (3 chỗ requireRole OWNER) | `requireAtLeast("KEEPER")` (NCC: KEEPER tạo được) |
| materials.ts (2) | `requireAtLeast("MANAGER")` (tạo vật tư) |
| warehouses.ts (2) | `requireAtLeast("MANAGER")` |
| projects.ts (3) | `requireAtLeast("MANAGER")` |
| equipment.ts (3 requireRole OWNER cho CRUD) | `requireAtLeast("MANAGER")`; giữ requireUser ở logEquipmentHours (nhật ký giờ — KEEPER ghi được) |
| funds.ts (3) | `requireAtLeast("MANAGER")` |
| opening.ts (1) | `requireAtLeast("MANAGER")` |
| void.ts (1) | `requireAtLeast("MANAGER")` |
| users.ts (3) | `requireAtLeast("ADMIN")` |
| cash.ts (2 requireUser → đổi) | `requireAtLeast("MANAGER")` (lập + hủy phiếu quỹ) |
- [ ] **Bước 1 (agy):** Mỗi file: đổi `import { requireRole }` → `import { requireAtLeast }` (giữ requireUser nếu file còn dùng), thay lời gọi theo bảng. KHÔNG đổi logic khác.
- [ ] **Bước 2 (Claude VERIFY):** `git diff` từng file khớp bảng; `git status` không clobber; `npx tsc --noEmit` (lỗi requireRole phải hết).
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(rbac): map guard actions theo ma trận (NCC=KEEPER, vật tư/quỹ/danh mục=MANAGER, user=ADMIN)"`

### Task 3.2 (agy): map guard pages
**Files:** app/(app)/*/page.tsx có requireRole("OWNER")
Bảng map:
| Page | Đổi thành |
|---|---|
| nguoi-dung | `requireAtLeast("ADMIN")` |
| vat-lieu, cong-trinh, cong-trinh/[id], quy/danh-muc, xe-may, nha-cung-cap, ton-dau-ky | `requireAtLeast("MANAGER")` |
| bao-cao | `requireAtLeast("KEEPER")` (báo cáo tồn — KEEPER xem được) |
| quy/page.tsx, quy/moi/page.tsx (đang requireUser) | `requireAtLeast("MANAGER")` |
- [ ] **Bước 1 (agy):** Sửa từng page theo bảng.
- [ ] **Bước 2 (Claude VERIFY):** `npx tsc --noEmit && npm run lint`; git status sạch.
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(rbac): map guard pages — báo cáo tồn=KEEPER, quỹ/danh mục=MANAGER, user=ADMIN"`

---

## PHASE 4 (agy): UI nav + user-manager

### Task 4.1 (agy): nav.tsx theo minRole
**File:** components/nav.tsx
- [ ] **Bước 1 (agy):** Đổi mảng links: thay `roles: Role[]` → `minRole: Role`. Lọc hiển thị: `ROLE_LEVEL[userRole] >= ROLE_LEVEL[l.minRole]`. Map minRole mỗi link:
  - KEEPER: Trang chính, Kiểm kê, Chuyển kho, Lịch sử, Báo cáo, Nhập, Xuất (nếu có trong nav).
  - MANAGER: Quỹ, Công trình, Danh mục (vat-lieu), Nhà cung cấp, Xe/máy.
  - ADMIN: Người dùng.
  (nav nhận role qua prop sẵn có; dùng ROLE_LEVEL map cục bộ trong nav hoặc import từ auth-helpers — auth-helpers là server file, nav là client → ĐỊNH NGHĨA ROLE_LEVEL cục bộ trong nav.tsx, KHÔNG import server helper.)
- [ ] **Bước 2 (Claude VERIFY):** tsc + render thật 3 role (login lần lượt admin/manager/keeper, kiểm link hiện đúng).
- [ ] **Bước 3 (Claude):** Commit.

### Task 4.2 (agy): user-manager.tsx 3 vai trò
**File:** components/user-manager.tsx + app/(app)/nguoi-dung/page.tsx
- [ ] **Bước 1 (agy):** Thay toggle OWNER/STAFF bằng native `<select>` 3 option (ADMIN="Quản trị", MANAGER="Quản lý", KEEPER="Thủ kho") ở cả tạo + sửa. Hiển thị nhãn VN trong bảng. Truyền role mới vào createUser/updateUserRole.
- [ ] **Bước 2 (agy):** lib/actions/users.ts: updateUserRole nhận role mới (1 trong 3). GIỮ guard: chặn tự hạ cấp mình < ADMIN + chặn hạ ADMIN cuối cùng (đếm ADMIN; nếu đang sửa ADMIN duy nhất xuống thấp hơn → chặn).
- [ ] **Bước 3 (Claude VERIFY):** tsc + lint + render thật: trang /nguoi-dung hiện 3 vai trò, đổi role chạy; thử hạ admin cuối → bị chặn (psql đếm role).
- [ ] **Bước 4 (Claude):** Commit.

---

## PHASE 5 (Claude): Regression + verify toàn diện

### Task 5.1: build + 3-role render
- [ ] **Bước 1:** `npx tsc --noEmit && npm run lint && npm run build` — pass.
- [ ] **Bước 2:** Seed/đặt 1 user mỗi vai trò (psql UPDATE role hoặc tạo). Render thật:
  - KEEPER: vào /nhap OK, /quy redirect "/" (không quyền), /nguoi-dung redirect.
  - MANAGER: /quy OK, /vat-lieu OK, /nguoi-dung redirect.
  - ADMIN: tất cả OK.
- [ ] **Bước 3:** psql: `SELECT role, COUNT(*) FROM "User" GROUP BY role;` hợp lý.
- [ ] **Bước 4:** Commit nếu có chỉnh. Push branch.

---

## Self-Review (đã chạy)

**1. Spec coverage:**
- Spec §3.1 enum RENAME + default: Task 1.1/1.2. ✓
- §3.2 requireAtLeast + ROLE_LEVEL + roleLabel: Task 2.1. ✓
- §3.3 map guard actions (gồm cash/opening/void đổi): Task 3.1. ✓
- §3.4 nav minRole + user-manager 3 role + roleLabel: Task 4.1/4.2. ✓
- §3.5 page guard: Task 3.2. ✓
- §4 an toàn (tự hạ cấp, admin cuối, ADD VALUE tách, session): Task 1.2(ADD tách)/4.2(guard)/5.1(render). ✓
- §2 ma trận: bảng map Task 3.1/3.2/4.1 khớp ma trận. ✓
- §5 YAGNI (không tùy biến/theo CT/audit): không task nào làm. ✓
- §7 treo "KEEPER lập phiếu quỹ": cash.ts=MANAGER (theo spec hiện tại). ✓

**2. Placeholder scan:** Không TBD. Bảng map cụ thể từng file. Code mẫu đầy đủ Phase 1-2. agy task có bảng rõ. ✓

**3. Type consistency:**
- Role = "ADMIN"|"MANAGER"|"KEEPER" nhất quán auth-helpers + nav + user-manager.
- requireAtLeast(minRole) chữ ký dùng đồng nhất Phase 3.
- ROLE_LEVEL định nghĩa 2 nơi (auth-helpers server + nav client) — CHỦ Ý vì client không import server helper; giá trị giống nhau {ADMIN:3,MANAGER:2,KEEPER:1}. ✓
- roleLabel map 3 role → nhãn VN, dùng user-manager. ✓
