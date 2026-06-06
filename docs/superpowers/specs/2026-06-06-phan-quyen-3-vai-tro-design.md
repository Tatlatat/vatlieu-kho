# Thiết kế — Phân quyền 3 vai trò (Admin / Quản lý cấp 1 / Thủ kho)

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm, chờ client review spec
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc` (tiếp theo, hoặc nhánh con nếu cần)
**Nguồn:** Client NÂNG CẤP #1 (ảnh IMG_0415).

---

## 1. Mục tiêu

Thay hệ 2 role (OWNER/STAFF, kiểm bằng so-bằng) bằng **3 vai trò phân cấp lồng
nhau**: Admin ⊃ Quản lý cấp 1 ⊃ Thủ kho. Mỗi vai trò có bộ quyền cố định đúng mô
tả client. Di trú data live an toàn (RENAME enum, không mất gì).

### Tiêu chí THÀNH CÔNG
- Enum Role = ADMIN/MANAGER/KEEPER; OWNER→ADMIN, STAFF→KEEPER tự đổi (rename),
  thêm MANAGER. Data live giữ nguyên user.
- `requireAtLeast(minRole)` thay `requireRole` (so cấp ≥, không so bằng).
- 22 guard hiện tại map lại đúng ma trận quyền.
- nav + user-manager hiển thị/chọn 3 vai trò.
- Chặn Admin tự khóa mình ra ngoài (luôn còn ≥1 Admin).
- Regression: chức năng cũ chạy đúng theo cấp.

## 2. Ma trận quyền (CHỐT)

| Chức năng | KEEPER (Thủ kho) | MANAGER (Quản lý c1) | ADMIN |
|---|:---:|:---:|:---:|
| Xem danh mục, tạo mã NCC | ✅ | ✅ | ✅ |
| Nhập phiếu Nhập/Xuất/Chuyển kho | ✅ | ✅ | ✅ |
| Xem báo cáo tồn, in phiếu, xuất Excel | ✅ | ✅ | ✅ |
| Kiểm kê | ✅ | ✅ | ✅ |
| Tạo/sửa mã VẬT TƯ | ❌ | ✅ | ✅ |
| Báo cáo QUỸ + lập/hủy phiếu quỹ | ❌ | ✅ | ✅ |
| Danh mục nền: Kho, Công trình, Xe/máy, Quỹ | ❌ | ✅ | ✅ |
| Quản lý người dùng + phân quyền | ❌ | ❌ | ✅ |

(Lưu ý: lập phiếu quỹ hiện cho STAFF+OWNER. Theo ma trận mới, quỹ thuộc MANAGER+
→ KEEPER KHÔNG còn lập phiếu quỹ. Đây là thay đổi có chủ đích theo phân vai.)

## 3. Kiến trúc

### 3.1 Enum + di trú (Cách A — RENAME VALUE, an toàn nhất)
```sql
-- Migration 1 (rename — rows tự đổi, không UPDATE, không drop type):
ALTER TYPE "Role" RENAME VALUE 'OWNER' TO 'ADMIN';
ALTER TYPE "Role" RENAME VALUE 'STAFF' TO 'KEEPER';
-- Migration 2 (ADD VALUE chạy RIÊNG — Postgres không cho ADD trong tx có dùng ngay):
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
```
- schema.prisma: `enum Role { ADMIN MANAGER KEEPER }`, `User.role @default(KEEPER)`.
- Thứ tự enum DB không quan trọng — cấp tính bằng map số trong code.

### 3.2 auth-helpers: so cấp ≥
```ts
export type Role = "ADMIN" | "MANAGER" | "KEEPER";
const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };

export async function requireAtLeast(minRole: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) redirect("/");
  return user;
}
// Giữ requireRole? KHÔNG — thay hết bằng requireAtLeast để nhất quán.
```

### 3.3 Map guard theo ma trận (đã đối chiếu code thật)
- `requireAtLeast("KEEPER")`: suppliers (tạo NCC), documents/phiếu nhập-xuất-chuyển,
  stocktake (kiểm kê).
- `requireAtLeast("MANAGER")`: materials (tạo vật tư), warehouses, projects,
  equipment, funds (CRUD quỹ), **opening (tồn đầu kỳ — thiết lập quan trọng, không
  để KEEPER)**, **cash.ts lập/hủy phiếu quỹ** (HIỆN dùng requireUser → ĐỔI sang
  requireAtLeast MANAGER), void.ts (hủy phiếu — sửa sai, không để KEEPER).
- `requireAtLeast("ADMIN")`: users (quản lý người dùng).

**ĐIỂM ĐỔI GUARD QUAN TRỌNG (đối chiếu code thật):**
- cash.ts (createCashEntry, voidCashEntry): `requireUser` → `requireAtLeast("MANAGER")`.
- /quy/page.tsx, /quy/moi/page.tsx: `requireUser` → `requireAtLeast("MANAGER")`.
- opening.ts: `requireRole("OWNER")` → `requireAtLeast("MANAGER")` (không hạ xuống KEEPER).
- 22 chỗ `requireRole("OWNER")` cũ → map theo phân loại trên (đa số MANAGER, riêng users = ADMIN).

### 3.4 UI
- nav.tsx: đổi `roles: Role[]` → `minRole: Role`; link hiện nếu user.level ≥
  link.minRole. Map: Quỹ/Công trình/Danh-mục-vật-tư/Xe-máy/NCC → MANAGER; Người
  dùng → ADMIN; phiếu/báo cáo tồn/kiểm kê/lịch sử → KEEPER.
- user-manager.tsx: chọn 1 trong 3 vai trò (native select), nhãn VN: ADMIN=
  "Quản trị", MANAGER="Quản lý", KEEPER="Thủ kho". Bỏ toggle 2-trạng-thái cũ.
- lib/queries hiển thị role: map enum → nhãn VN ở 1 chỗ (helper roleLabel).

### 3.5 Trang (page guard)
Mỗi page server-component đổi guard theo ma trận:
- ADMIN: /nguoi-dung.
- MANAGER: /cong-trinh, /vat-lieu (danh mục+kho), /quy, /quy/danh-muc, /quy/moi,
  /xe-may, /nha-cung-cap, /ton-dau-ky.
- KEEPER: /nhap, /xuat, /chuyen-kho, /kiem-ke, /bao-cao, /lich-su.
(báo cáo TỒN cho KEEPER; báo cáo QUỸ nằm trong /quy = MANAGER.)

## 4. Xử lý lỗi & an toàn

| Tình huống | Cách |
|---|---|
| Admin tự hạ cấp mình | CHẶN nếu hạ chính mình xuống < ADMIN (giữ guard hiện có ở users.ts) |
| Hạ Admin cuối cùng | CHẶN nếu sau thao tác còn 0 ADMIN (đếm) |
| ADD VALUE trong tx | tách migration riêng cho MANAGER (Postgres yêu cầu) |
| Session cũ giữ role cũ | sau deploy, user đăng nhập lại lấy role mới (JWT) — chấp nhận |
| KEEPER gọi action MANAGER+ | requireAtLeast redirect "/" + action trả lỗi nếu gọi trực tiếp |

## 5. Phạm vi (YAGNI)

✅ Enum 3 role + requireAtLeast + map 22 guard + nav + user-manager + di trú +
guard trang.
❌ Quyền tùy biến từng người (đã chốt: 3 vai trò cố định).
❌ Quyền theo từng công trình.
❌ Audit log thao tác.
❌ 2 việc nhỏ (minStock, MST/NCC) — vẫn gác.

## 6. Câu hỏi nghiệp vụ — ĐÃ CHỐT
- Map: OWNER→ADMIN, STAFF→KEEPER, thêm MANAGER.
- Phân cấp lồng nhau (so cấp ≥).
- KEEPER vs MANAGER khác: MANAGER có tạo vật tư + báo cáo quỹ + danh mục nền.
- Danh mục nền: Admin + Manager.
- Đổi enum: Cách A (RENAME VALUE).

## 7. CÂN NHẮC — treo lại (client sẽ lôi ra khi cần)
- **Thủ kho (KEEPER) lập phiếu quỹ:** spec hiện CHẶN (quỹ = MANAGER+, đổi từ
  requireUser). Client chốt: ĐỂ TREO ở mục cân nhắc, KHI NÀO CẦN sẽ lôi lại. Hiện
  tại làm theo spec (KEEPER không lập phiếu quỹ). Nếu sau client muốn, chỉ cần hạ
  guard cash.ts lập-phiếu xuống KEEPER (báo cáo quỹ vẫn MANAGER+) — sửa 1 chỗ.

## 8. Giai đoạn sau
Gắn xe/máy vào Công trình; 2 việc nhỏ minStock+NCC; rồi deploy gộp.
