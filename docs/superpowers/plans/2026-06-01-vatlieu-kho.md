# Kế hoạch triển khai `vatlieu-kho`

> **Cho người thực thi:** Mỗi Task = một prompt chi tiết giao cho agy (Antigravity) viết code, sau đó Claude verify từ artifact (git diff, build, lint, chạy thật). Không tin agy tự báo cáo. Bug do harness/môi trường ghi vào `docs/bugs-log.md`.

**Goal:** Web app quản lý & phát hiện hao hụt vật liệu xây dựng, Postgres-centric, chạy qua Docker, UI tiếng Việt đơn giản — không lỗi, qua nhiều vòng kiểm tra.

**Architecture:** Next.js 15 App Router + TypeScript, logic lõi đẩy xuống PostgreSQL (views/triggers/RLS/constraints), Prisma làm lớp truy cập mỏng, Docker Compose cho môi trường dev trọn gói.

**Tech Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL 16, Auth.js v5, shadcn/ui, Tailwind, TanStack Table, Recharts, Zod, React Hook Form.

**Build path:** `/tmp/vatlieu-kho` (không dấu cách).

---

## Task 1: Scaffold + Docker Compose

**Files tạo:** `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `docker-compose.yml`, `db/init/01-schema.sql` (placeholder), `.env.example`, `.env`, `README.md`, `prisma/schema.prisma`, app skeleton (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`).

**Prompt cho agy:** Tạo dự án Next.js 15 (App Router, TypeScript, Tailwind, ESLint, `src/`-less, import alias `@/*`). Thêm Prisma + `@prisma/client`. Tạo `docker-compose.yml` gồm: service `db` (postgres:16-alpine, port 5432, env POSTGRES_USER/PASSWORD/DB, volume bền `pgdata`, mount `./db/init` vào `/docker-entrypoint-initdb.d`, healthcheck `pg_isready`), service `adminer` (port 8080, depends_on db healthy). `.env`: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. README hướng dẫn `docker compose up -d` rồi `npm run dev`.

**Verify (Claude):**
- [ ] `npm install` thành công
- [ ] `npm run build` sạch (chấp nhận app skeleton)
- [ ] `docker compose config` hợp lệ
- [ ] `docker compose up -d db` → `pg_isready` OK
- [ ] Commit `chore: scaffold + docker compose`

---

## Task 2: Schema DB Postgres-centric

**Files:** `prisma/schema.prisma` (models), `db/init/01-schema.sql` (views/triggers/RLS/constraints viết tay), `prisma/seed.ts`.

**Prompt cho agy:** Định nghĩa Prisma models đúng spec mục 5: `User(role enum OWNER/STAFF)`, `Material`, `StockMovement(type enum IN/OUT, reason enum PURCHASE/PROJECT/DAMAGED/EXPIRED/NATURAL_LOSS/STOCKTAKE_ADJUST)`, `Stocktake(status DRAFT/APPROVED)`, `StocktakeItem`. Viết `db/init/01-schema.sql` chứa SQL thuần (chạy SAU `prisma migrate`): (a) view `current_stock` tính on_hand = SUM(CASE type WHEN IN +qty WHEN OUT −qty) group by material, kèm cột status OK/LOW/OUT; (b) function `approve_stocktake(stocktake_id)` + trigger AFTER UPDATE khi status→APPROVED: với mỗi item diff≠0 insert StockMovement điều chỉnh, idempotent; (c) CHECK `quantity > 0`; (d) view `loss_by_month` window function. Viết `prisma/seed.ts` nạp 2 user (owner/staff, mật khẩu hash bcrypt), ~8 vật liệu, ~30 giao dịch, 1 phiếu kiểm kê có chênh lệch.

**Verify (Claude):**
- [ ] `npx prisma migrate dev` chạy được, bảng tạo đúng
- [ ] Apply `01-schema.sql`, query `SELECT * FROM current_stock` trả số đúng
- [ ] `npx prisma db seed` chạy, data có trong DB (query qua psql)
- [ ] Test trigger: UPDATE stocktake → APPROVED, kiểm tra movement điều chỉnh sinh ra
- [ ] Commit `feat(db): schema sổ cái + views + trigger hao hụt + seed`

---

## Task 3: Auth.js v5 + layout + phân quyền

**Files:** `auth.ts`, `middleware.ts`, `app/login/page.tsx`, `app/(app)/layout.tsx`, components nav, `lib/auth-helpers.ts`.

**Prompt cho agy:** Cấu hình Auth.js v5 Credentials provider (email+password, verify bcrypt với User trong DB qua Prisma). Session JWT chứa `role`. `middleware.ts` chặn route chưa đăng nhập về `/login`; chặn STAFF vào `/bao-cao`, `/vat-lieu`. Trang `/login` form đơn giản tiếng Việt (shadcn). Layout app có thanh điều hướng hiển thị menu theo role. Helper `requireRole`.

**Verify (Claude):**
- [ ] `npm run build` sạch
- [ ] Chạy app, login bằng owner/staff seed → vào đúng
- [ ] STAFF truy cập `/bao-cao` → bị chặn
- [ ] Commit `feat(auth): đăng nhập 2 vai trò + phân quyền`

---

## Task 4: Nghiệp vụ nhập/xuất + màn hình STAFF

**Files:** `app/(app)/page.tsx` (trang chính), `app/(app)/nhap/page.tsx`, `app/(app)/xuat/page.tsx`, `lib/actions/movements.ts` (Server Actions), `lib/validation.ts` (Zod), components form.

**Prompt cho agy:** Trang chính `/` (STAFF): 4 nút lớn (Nhập/Xuất/Kiểm kê/Tìm) + bảng `current_stock` với badge màu OK/LOW/OUT (như mockup đã duyệt). Server Action `createMovement` validate Zod (material_id, quantity>0, type, reason), chặn xuất quá tồn (đọc current_stock, nếu OUT.qty > on_hand → trả lỗi tiếng Việt "Không đủ tồn kho, chỉ còn X"). Form Nhập (`/nhap`) và Xuất (`/xuat`) dùng React Hook Form + Zod, dropdown vật liệu, nhập số lượng, lý do. Toast thành công, redirect về `/`.

**Verify (Claude):**
- [ ] `npm run build` + `tsc --noEmit` sạch
- [ ] Chạy app: nhập 1 giao dịch → tồn tăng; xuất → tồn giảm
- [ ] Test case xuất quá tồn → hiện lỗi tiếng Việt, không tạo dòng
- [ ] Commit `feat: nhập/xuất kho + trang chính kho`

---

## Task 5: Kiểm kê + duyệt (phát hiện hao hụt)

**Files:** `app/(app)/kiem-ke/page.tsx`, `app/(app)/kiem-ke/[id]/page.tsx`, `lib/actions/stocktake.ts`.

**Prompt cho agy:** `/kiem-ke`: danh sách phiếu + nút tạo phiếu mới (chốt system_qty từ current_stock cho mọi vật liệu). Trang chi tiết `[id]`: bảng từng vật liệu, ô nhập counted_qty, hiển thị diff realtime (đỏ nếu âm = hao hụt). STAFF lưu nháp. OWNER thấy nút "Duyệt" → Server Action `approveStocktake` set status=APPROVED (trigger DB tự ghi nhận hao hụt). Sau duyệt phiếu khóa, hiển thị tổng hao hụt.

**Verify (Claude):**
- [ ] Build sạch
- [ ] Tạo phiếu, nhập số lệch, duyệt → movement STOCKTAKE_ADJUST sinh ra, current_stock khớp số đếm
- [ ] Duyệt lại lần 2 không sinh thêm dòng (idempotent)
- [ ] Commit `feat: kiểm kê định kỳ + phát hiện hao hụt`

---

## Task 6: Dashboard hao hụt + lịch sử + quản lý vật liệu

**Files:** `app/(app)/bao-cao/page.tsx` (Recharts), `app/(app)/lich-su/page.tsx` (TanStack Table), `app/(app)/vat-lieu/page.tsx`, `lib/actions/materials.ts`, `lib/queries/reports.ts`.

**Prompt cho agy:** `/bao-cao` (OWNER): cards tổng quan (tổng vật liệu, số sắp hết, hao hụt tháng này), BarChart hao hụt theo tháng (từ `loss_by_month`), PieChart hao hụt theo nguyên nhân, bảng top vật liệu hao hụt. `/lich-su`: TanStack Table toàn bộ stock_movements, cột (ngày, vật liệu, loại, lý do, số lượng, người tạo), filter theo loại/vật liệu, sort, phân trang. `/vat-lieu` (OWNER): CRUD vật liệu + đặt min_stock (Server Actions + Zod).

**Verify (Claude):**
- [ ] Build sạch
- [ ] Dashboard render chart đúng từ seed data
- [ ] Lịch sử filter/sort hoạt động
- [ ] Thêm/sửa vật liệu hoạt động, đổi min_stock → badge LOW cập nhật
- [ ] Commit `feat: dashboard hao hụt + lịch sử + quản lý vật liệu`

---

## Task 7: Nhiều vòng kiểm thử + làm sạch

**Files:** `docs/bugs-log.md`, sửa lỗi rải rác.

**Quy trình (Claude tự chạy, lặp đến sạch):**
- [ ] Vòng 1: `npm run build`, `tsc --noEmit`, `npm run lint` — sửa mọi lỗi
- [ ] Vòng 2: khởi động `docker compose up -d` + `npm run dev`, kiểm tra E2E từng luồng (login 2 role, nhập, xuất, xuất-quá-tồn, kiểm kê+duyệt, dashboard, lịch sử, CRUD vật liệu)
- [ ] Vòng 3: clone-and-run test — xóa node_modules + DB volume, chạy lại từ đầu theo README, đảm bảo `docker compose up` + seed + `npm run dev` ra app chạy được
- [ ] Ghi mọi bug từ harness (HS) vào `docs/bugs-log.md`
- [ ] Commit `test: làm sạch, qua nhiều vòng kiểm thử`

---

## Self-review coverage

- Spec mục 3 (stack) → Task 1,2,3,6 ✓
- Spec mục 5 (mô hình dữ liệu + logic Postgres) → Task 2 ✓
- Spec mục 6 (4 luồng) → Task 4 (nhập/xuất), Task 5 (kiểm kê), Task 6 (dashboard) ✓
- Spec mục 7 (7 màn hình) → login(T3), `/`(T4), nhap/xuat(T4), kiem-ke(T5), vat-lieu(T6), bao-cao(T6), lich-su(T6) ✓
- Spec mục 8 (validation + bug log) → Task 4,5,6 (Zod) + Task 7 (bugs-log) ✓
- Spec mục 9 (kiểm thử) → Task 7 ✓
