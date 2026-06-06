# Thiết kế — Gộp "Trường Danh mục" (tab) + thu gọn nav

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm, chờ viết plan
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc`
**Nguồn:** Client BỔ SUNG #1b/1c/1d (gộp Quỹ/NCC/Xe-máy vào "Trường Danh mục") +
ảnh 2 (nav 12 link tràn 2 hàng trên mobile, cần thu gọn).

---

## 1. Mục tiêu
Gom 6 danh mục rời (Vật tư, Kho, Công trình, Quỹ, NCC, Xe/máy) vào 1 trang
`/danh-muc` nhiều tab; thu gọn thanh nav (12 link → nav chính + menu "Thêm").
KHÔNG đổi logic danh mục — chỉ di chuyển UI.

### Tiêu chí THÀNH CÔNG
- `/danh-muc` có tab: Vật tư | Kho | Công trình | Quỹ | NCC | Xe/máy.
- Tab hiện THEO QUYỀN: KEEPER chỉ thấy NCC; MANAGER+ thấy đủ 6.
- 6 trang cũ redirect về /danh-muc?tab=... (link cũ không vỡ).
- Nav: thao tác chính luôn hiện + menu "Thêm" gom quản trị. Lọc theo minRole.
- Render thật 3 vai trò đúng; mọi CRUD danh mục giữ nguyên hoạt động.

## 2. Trang /danh-muc (tab theo quyền)

### Cấu trúc
- `app/(app)/danh-muc/page.tsx` (server, force-dynamic): xác định userRole, render
  thanh tab + nội dung tab active theo `?tab=` (mặc định tab đầu user có quyền).
- Mỗi tab render component manager SẴN CÓ (không viết lại):

**4 TAB CHỐT** (Công trình ra ngoài vì là trang báo cáo):

| Tab (?tab=) | Component | Query data | minRole |
|---|---|---|---|
| vat-tu | MaterialManager + WarehouseManager | getMaterials, getWarehouses, getAllProjects | MANAGER |
| quy | FundManager | getAllFunds, getFundBalances, getAllProjects | MANAGER |
| ncc | SupplierManager | getSuppliers | KEEPER |
| xe-may | EquipmentManager | getEquipment(+logs), getAllProjects | MANAGER |

GHI CHÚ: /vat-lieu hiện đã gộp Material + Warehouse trong 1 trang → tab "Vật tư &
Kho" giữ y nguyên (MaterialManager + WarehouseManager). KEEPER chỉ thấy tab NCC;
MANAGER+ thấy cả 4 tab.

### Tab theo quyền
- Server tính `userRole` (requireAtLeast nhẹ nhất = KEEPER cho trang, vì NCC tab
  là KEEPER). Danh sách tab lọc theo `ROLE_LEVEL[userRole] >= tab.minRole`.
- KEEPER → chỉ tab NCC. MANAGER/ADMIN → cả 5 tab.
- Tab active từ `?tab=`; nếu tab yêu cầu cao hơn quyền user → fallback tab đầu hợp lệ.
- Component tab = client; data fetch ở server page rồi truyền xuống (như các trang
  hiện tại). Để tránh fetch thừa: page chỉ fetch data cho tab ĐANG active.

### Redirect trang cũ (không vỡ link)
- `/vat-lieu` → `/danh-muc?tab=vat-tu`
- `/nha-cung-cap` → `/danh-muc?tab=ncc`
- `/xe-may` → `/danh-muc?tab=xe-may`
- `/quy/danh-muc` → `/danh-muc?tab=quy`
- `/cong-trinh` GIỮ NGUYÊN (trang công trình có cả báo cáo đa-CT + chi tiết, không
  chỉ là danh mục) — NHƯNG thêm tab "Công trình" trong /danh-muc cho phần CRUD.
  Để tránh trùng: tab Công trình trong /danh-muc = link sang /cong-trinh (CRUD +
  báo cáo ở đó). HOẶC đơn giản: KHÔNG đưa Công trình vào tab, giữ menu riêng.
  → QUYẾT: tab gồm **Vật tư & Kho | Quỹ | NCC | Xe/máy** (4 tab). Công trình giữ
  menu riêng (vì nó là trang báo cáo, không thuần danh mục).

## 3. Thu gọn nav

### Nav chính (luôn hiện, theo minRole)
Trang chính, Nhập, Xuất, Chuyển kho, Kiểm kê (thao tác hằng ngày — KEEPER+).

### Menu "Thêm" (dropdown, gom quản trị)
Danh mục (/danh-muc), Công trình (/cong-trinh), Báo cáo, Quỹ (/quy), Lịch sử,
Người dùng. Lọc theo minRole (vd Người dùng chỉ ADMIN thấy).
- Dropdown: nút "≡ Thêm" → panel xổ xuống danh sách link (lọc quyền). Mobile bấm
  được (không phải hover).

### Kết quả
Nav chính ~6 mục + 1 nút Thêm. Trên mobile hết tràn 2 hàng.

## 4. An toàn & phạm vi
- KHÔNG viết lại logic manager/action/query — chỉ DI CHUYỂN component vào tab +
  tạo trang gom + redirect + sửa nav.
- Giữ mọi guard quyền hiện có (actions vẫn requireAtLeast riêng).
- Verify render thật 3 vai trò + redirect + CRUD 1 danh mục.

## 5. Phạm vi (YAGNI)
✅ Trang /danh-muc 4 tab + nav menu "Thêm" + redirect 4 trang cũ.
❌ Đổi logic danh mục. ❌ Gộp xe/máy thành "mã vật tư" (data model lớn — spec sau).
❌ Đưa Công trình vào tab (giữ trang riêng vì có báo cáo).

## 6. Câu hỏi nghiệp vụ — ĐÃ CHỐT
- Gộp = 1 trang nhiều tab (không dropdown menu con).
- Tab hiện theo quyền (KEEPER chỉ NCC).
- Nav: thao tác chính + menu "Thêm" gom quản trị.
- Công trình giữ trang riêng (không vào tab).
