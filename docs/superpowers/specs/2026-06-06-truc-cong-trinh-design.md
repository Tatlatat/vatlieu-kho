# Thiết kế — Trục "Công trình" (Project) cho vatlieu-kho

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm (3 phần), chờ client review spec
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc`
**Nền tảng:** Đánh giá kiến trúc `docs/superpowers/specs/2026-06-06-danh-gia-kien-truc-drift.md`

---

## 0. Bối cảnh & triết lý

App drift từ "quản lý kho" → "quản lý công trình". Tầng sâu (client nêu): app
tích tụ nhiều PHONG CÁCH quản lý — kho theo **số lượng**, quỹ theo **dòng tiền**,
xe/máy theo **giờ làm**. Cần sắp xếp thông tin TINH TẾ: vừa nhỏ gọn vừa chính
xác, để các sổ GIAO THOA mà không xung đột, và MỞ cho bổ sung tương lai.

**Insight:** 3 sổ (StockMovement, CashEntry, EquipmentLog) cùng bộ xương = "1
biến động có dấu, gắn 1 đối tượng, tại 1 thời điểm, thuộc 1 công trình".

**Giải pháp:** "chung trục, giữ riêng bản chất" — KHÔNG gộp 3 sổ làm 1 (mất chính
xác, trộn đơn vị). Cho chung 2 khóa giao thoa **projectId + date** → chiếu chung
lên 1 công trình, mỗi sổ vẫn đúng đơn vị riêng (m³ / đồng / giờ).

## 1. Mục tiêu

1. Thêm thực thể **Project (Công trình)** làm trục gom.
2. Link Warehouse + Fund vào Project (nullable, không phá data live).
3. Báo cáo "theo công trình": từng sổ đúng đơn vị + 1 trang tổng hợp đa-CT.
4. Thiết kế MỞ: "tổng chi phí tiền/CT" cộng-dồn-nguồn → thêm nguồn tiền (đơn giá
   vật tư, giờ xe) sau mà KHÔNG sửa kiến trúc.
5. Di trú data thật trên production, không mất gì.

### Tiêu chí THÀNH CÔNG
- Migration chạy được trên production (Supabase) không mất/khóa data cũ.
- Mỗi Warehouse/Fund hiện có được gán đúng 1 Project sau di trú.
- Trang Danh mục Công trình (CRUD, OWNER) + chọn CT ở form Kho/Quỹ.
- Trang chi tiết CT hiển thị khối vật tư/quỹ đúng đơn vị + tổng chi phí (hôm nay
  = chi quỹ).
- Trang danh sách CT = bảng tổng hợp đa-CT.
- Logic xuất-nhập-tồn + Quỹ GIỮ NGUYÊN (regression: vẫn chạy đúng).

> **Nguyên tắc kế toán:** không sửa sổ cái đang đúng. Project là tầng GOM bên
> trên, đọc từ sổ gốc. projectId nullable → không dòng nào "mồ côi bắt buộc".

## 2. PHẦN 1 — Mô hình dữ liệu

### Model mới `Project`
| Field | Kiểu | Ghi chú |
|---|---|---|
| id | String @id cuid | |
| code | String @unique | mã CT |
| name | String | tên công trình |
| isActive | Boolean @default(true) | ngừng theo dõi CT đã xong |
| note | String? | |
| createdAt | DateTime @default(now()) | |
| warehouses | Warehouse[] | back-relation |
| funds | Fund[] | back-relation |

### Thêm cột (nullable) vào model có sẵn
- `Warehouse.projectId String?` + `project Project? @relation(...)`.
  Quan hệ 1 Project–nhiều Warehouse Ở SCHEMA, nhưng nghiệp vụ 1 CT=1 kho (không
  ép unique để linh hoạt + an toàn di trú).
- `Fund.projectId String?` + `project Project? @relation(...)`. 1 CT nhiều quỹ.

### KHÔNG đụng
StockMovement, CashEntry, EquipmentLog, Document, logic xuất-nhập-tồn, Quỹ
Thu-Chi-Tồn — giữ nguyên 100%. Sổ biết CT QUA warehouse.projectId / fund.projectId
(1 nguồn sự thật, không nhân bản projectId xuống từng dòng sổ).

## 3. PHẦN 2 — Báo cáo giao thoa

### Trang chi tiết 1 công trình `/cong-trinh/[id]`
Các khối, mỗi khối đọc sổ gốc, ĐÚNG ĐƠN VỊ:
| Khối | Nguồn | Đơn vị | Hôm nay |
|---|---|---|---|
| Vật tư (nhập/xuất/tồn) | StockMovement qua warehouse.projectId | m³, viên… | ✅ |
| Quỹ (Thu/Chi/Tồn) | CashEntry qua fund.projectId | VND | ✅ |
| Xe/máy (giờ) | EquipmentLog (khi gắn CT) | giờ | ⏳ sau |
| **Tổng chi phí (VND)** | cộng-dồn-nguồn-có-tiền | VND | = chi quỹ |

### Nguyên tắc CỘNG-DỒN-NGUỒN (điểm "mở cho tương lai")
```
Tổng chi phí CT = Σ nguồn_có_giá_trị_tiền
  hôm nay  = tổng CHI quỹ của CT
  tương lai = + giá trị vật tư xuất (khi có đơn giá)
             + chi phí giờ xe (khi có đơn giá giờ)
```
Mỗi nguồn tự khai "đóng góp X đồng vào CT này". Thêm nguồn = thêm 1 dòng cộng,
KHÔNG sửa khung báo cáo.

### Trang danh sách `/cong-trinh`
Bảng tổng hợp TẤT CẢ công trình: mỗi dòng = CT | tồn quỹ | tổng thu | tổng chi |
(sau: tổng chi phí). Đây chính là yêu cầu client NC-2 (báo cáo quỹ đa-CT), về
đúng trục. Click 1 dòng → trang chi tiết CT.

## 4. PHẦN 3 — Di trú + chừa cửa

### 4a. Migration (an toàn production)
- `CREATE TABLE "Project"` (idempotent, IF NOT EXISTS qua DO block như Quỹ).
- `ALTER TABLE "Warehouse" ADD COLUMN "projectId" TEXT` (nullable) + FK ON DELETE
  SET NULL.
- `ALTER TABLE "Fund" ADD COLUMN "projectId" TEXT` (nullable) + FK ON DELETE SET
  NULL.
- Index `Warehouse(projectId)`, `Fund(projectId)`.

### 4b. Script di trú (chạy 1 lần, sau khi KIỂM DB production)
```
KIỂM TRƯỚC: đếm Warehouse, Fund; xem tên (để khớp đúng, không gán bừa).
Mỗi Warehouse: tạo Project(name=tên kho, code=mã kho) -> warehouse.projectId.
Mỗi Fund: tìm Project trùng tên/khớp -> gán; không có -> tạo Project mới -> gán.
```
Chạy thử trên DB clone/local, verify (đếm trước/sau khớp, không null ngoài ý
muốn), RỒI mới production.

### 4c. Chừa cửa cho "giá trị tiền" (KHÔNG làm giờ)
- StockMovement không thêm gì. Khi cần: `ADD COLUMN unitPrice` nullable + sửa
  form nhập + 1 hàm giá vốn. Độc lập với trục.
- Báo cáo Tổng chi phí viết sẵn kiểu cộng-dồn-nguồn (mục 3) → thêm nguồn tự vào.

### 4d. UI mới
- `/cong-trinh` (list + tổng hợp đa-CT) + CRUD Project (OWNER). Component
  project-manager (theo mẫu fund-manager: dùng native select tránh bug base-ui).
- Form Kho (warehouse) + form Quỹ (fund): thêm ô chọn Công trình (để trống = ảo).
- `/cong-trinh/[id]` chi tiết (mục 3).
- nav: thêm link "Công trình".

## 5. Xử lý lỗi

| Tình huống | Cách |
|---|---|
| Di trú gán nhầm/ trùng | KIỂM DB trước + chạy thử clone + verify đếm trước/sau |
| Xóa Project còn kho/quỹ | CHẶN (đếm warehouse+fund>0), giống chặn xóa Fund có entry |
| Kho/quỹ "ảo" không CT | projectId nullable → hợp lệ, báo cáo gom vào "Không thuộc CT" |
| Migration lỗi giữa chừng | idempotent (IF NOT EXISTS) → chạy lại an toàn |
| Code trùng Project | catch P2002 → báo "mã CT đã tồn tại" |

## 6. Phạm vi (YAGNI)

✅ Project + link Kho/Quỹ + di trú + báo cáo đa-CT + trang chi tiết CT (tổng chi
phí = chi quỹ).
❌ Đơn giá vật tư / tiền hóa vật tư-xe (CHỪA CỬA, không xây).
❌ Gắn xe/máy vào CT (pattern sẵn, đợt sau).
❌ Phân quyền 3 vai trò (đợt riêng sau Project).
❌ 2 việc nhỏ (minStock, MST/NCC) — gác lại, làm sau Project.
❌ Gộp UI danh mục Quỹ/NCC vào "Trường Danh mục".

## 7. Câu hỏi nghiệp vụ — ĐÃ CHỐT

- 1 CT = 1 kho (Warehouse ~1-1, không ép unique để an toàn).
- 1 CT có thể nhiều quỹ (Fund 1-nhiều).
- projectId nullable (cho kho/quỹ ảo).
- Production CÓ data thật → di trú giữ nguyên.
- Đơn giá vật tư: chưa làm, chỉ thiết kế mở.

## 8. Giai đoạn sau (lộ trình)

Sau Project: (1) gắn Equipment.projectId + giờ xe vào báo cáo CT; (2) phân quyền
3 vai trò; (3) đơn giá vật tư → tổng chi phí đầy đủ; (4) 2 việc nhỏ minStock+NCC.
Mỗi cái: spec → plan → implement riêng.
