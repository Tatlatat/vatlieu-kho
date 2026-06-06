# Thiết kế — Hoàn tất lộ trình (xe/máy gắn CT + 2 việc nhỏ)

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm, chờ client review spec
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc` (tiếp). Sau đợt này → DEPLOY gộp.

---

## 1. Mục tiêu
Gộp 3 việc còn lại trước khi deploy: (A) gắn xe/máy vào Công trình qua nhật ký
giờ; (B) bỏ bắt buộc định mức tồn tối thiểu; (C) NCC thêm mã số thuế + địa chỉ.

### Tiêu chí THÀNH CÔNG
- EquipmentLog có projectId (nullable); ghi giờ chọn được Công trình.
- Trang /cong-trinh/[id] có khối "Xe/máy (giờ)" — đơn vị giờ, không quy tiền.
- minStock không còn bắt buộc (optional, default 0).
- NCC tạo/sửa được với mã số thuế + địa chỉ (nhập tay).
- Migration nullable an toàn data live; regression sổ/Project/RBAC không vỡ.

## 2. Việc A — Xe/máy gắn Công trình (qua nhật ký giờ)

### Mô hình
- `EquipmentLog.projectId String?` + `project Project? @relation(... onDelete: SetNull)`.
  Project thêm back-relation `equipmentLogs EquipmentLog[]`. Index projectId.
- KHÔNG gắn Equipment.projectId (xe luân chuyển giữa CT; giờ ghi theo từng log).
- Migration ADD COLUMN nullable + FK SetNull (idempotent).

### Logic + báo cáo
- action ghi giờ (lib/actions/equipment.ts logEquipmentHours): nhận + lưu projectId
  (rỗng → null). Giữ requireUser (KEEPER ghi được).
- equipmentLogSchema (validation.ts): thêm projectId optional nullable.
- getProjectSummary (lib/queries/projects.ts): thêm khối `equipment`:
  group EquipmentLog theo xe (qua projectId của log), tổng giờ. Trả
  `equipment: { equipmentName: string; plateNo: string|null; totalHours: number }[]`.
  totalCostVnd GIỮ NGUYÊN = cash.totalOut (giờ xe CHỪA CỬA quy tiền sau).

### UI
- Form ghi giờ (components/equipment-manager.tsx): thêm ô native select Công
  trình (options Project active + "— Không thuộc CT —"). Page truyền projects.
- Trang /cong-trinh/[id]: thêm khối "Xe/máy (giờ)" — bảng xe | biển số | tổng giờ
  (đơn vị giờ). Nếu rỗng: "Chưa có giờ xe".

## 3. Việc B — Bỏ bắt buộc minStock
- validation.ts: materialSchema `minStock` → `z.coerce.number().min(0).optional().default(0)`.
- components/material-manager.tsx: bỏ dấu `*` 2 ô (tạo+sửa), label "Định mức tồn
  kho tối thiểu (không bắt buộc)". Bỏ `required` nếu có.
- KHÔNG migration (DB đã có @default(0)).

## 4. Việc C — NCC thêm Mã số thuế + Địa chỉ
### Schema
- `Supplier.taxCode String?` + `Supplier.address String?`. Migration ADD COLUMN
  nullable (an toàn, không phá data cũ).
### Logic + UI
- validation.ts: supplierSchema thêm taxCode + address optional.
- lib/actions/suppliers.ts: create/update lưu thêm 2 field (đã đổi guard KEEPER ở RBAC).
- Supplier manager (component danh mục NCC): form thêm 2 ô (Mã số thuế, Địa chỉ) +
  bảng hiển thị. KHÔNG tra MST online (để spec riêng sau).

## 5. Phân vai & an toàn (giữ kỹ càng)
- Claude: schema 2 migration (EquipmentLog.projectId, Supplier 2 cột) + queries
  equipment trong getProjectSummary + verify (tsc/lint/build/psql/render thật).
- agy: UI form (chọn CT khi ghi giờ, 2 ô NCC, bỏ * minStock) — chỗ agy mạnh, có mẫu.
- Migration áp local trước + verify; chạy production khi deploy.
- Regression: /vat-lieu, /nhap, /quy, /cong-trinh, /nguoi-dung, 3-role vẫn đúng.

## 6. Phạm vi (YAGNI)
✅ EquipmentLog.projectId + khối giờ xe ở CT + minStock optional + NCC taxCode/address.
❌ Quy giờ xe ra tiền (chừa cửa cộng-dồn-nguồn).
❌ Tra MST online (spec sau).
❌ Equipment.projectId (xe chủ quản — không cần).

## 7. Câu hỏi nghiệp vụ — ĐÃ CHỐT
- Xe gắn CT ở EquipmentLog (nhật ký giờ), không ở Equipment.
- Khối giờ xe ở trang CT, đơn vị giờ, không quy tiền.
- minStock optional default 0.
- NCC: taxCode + address nhập tay, không tra online.

## 8. Sau đợt này
DEPLOY gộp toàn bộ (Project + RBAC + xe + 2 việc nhỏ): migrate deploy áp 4
migration (project, role_rename, role_add_manager, + 2 migration đợt này), chạy
script di trú Project trên production, verify live 3-role + báo cáo CT.
