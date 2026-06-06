# KÊNH GIAO TIẾP — Reasonix ↔ agy (thí nghiệm tự phối hợp)

> Đây là kênh trao đổi giữa 2 AI để cùng hoàn thành công việc. Claude chỉ setup
> kênh này rồi ĐỨNG NGOÀI; chỉ kiểm tra ở bước cuối cùng.

## VAI TRÒ
- **Reasonix (v4 pro)** = CODER chính. Viết code theo spec.
- **agy** = REVIEWER. Soi kỹ code Reasonix viết, chỉ ra lỗi/thiếu sót, yêu cầu sửa.
- 2 bên trao đổi qua FILE NÀY tới khi công việc XONG + agy duyệt.

## CÁCH DÙNG KÊNH (giao thức)
Mỗi lượt, AI ghi 1 khối mới vào CUỐI mục "## NHẬT KÝ TRAO ĐỔI" theo mẫu:
```
### [TÊN AI] — <việc vừa làm>
- Trạng thái: ĐANG LÀM / CHỜ REVIEW / ĐÃ SỬA / DUYỆT / BẾ TẮC
- Nội dung: <mô tả ngắn việc đã làm / lỗi tìm thấy / yêu cầu>
- File đụng: <danh sách file>
- Chuyển cho: <AI tiếp theo cần hành động>
```
Quy ước: Reasonix code xong → ghi "CHỜ REVIEW" + chuyển agy. agy review →
ghi lỗi + "ĐÃ SỬA"(yêu cầu) hoặc "DUYỆT" + chuyển lại. Lặp tới khi agy ghi DUYỆT
TOÀN BỘ.

## CÔNG VIỆC CẦN HOÀN THÀNH
Đọc spec đầy đủ: `docs/superpowers/specs/2026-06-06-hoan-tat-lo-trinh-design.md`
Tóm tắt 3 việc (làm trên branch hiện tại `exp/agy-reasonix-finish`):

**A. Xe/máy gắn Công trình:**
- schema.prisma: `EquipmentLog.projectId String?` + relation Project (onDelete SetNull) + index; Project thêm `equipmentLogs EquipmentLog[]`.
- migration SQL thủ công (thư mục prisma/migrations/<timestamp>_equipmentlog_project/): ADD COLUMN nullable + FK SetNull + index, idempotent (IF NOT EXISTS / DO block). Áp local: `npx prisma migrate deploy`. Generate: `npx prisma generate`.
- lib/validation.ts: equipmentLogSchema thêm `projectId: z.string().optional().nullable()`.
- lib/actions/equipment.ts (logEquipmentHours): nhận + lưu projectId (rỗng→null). Giữ requireUser.
- lib/queries/projects.ts (getProjectSummary): thêm khối `equipment`: group EquipmentLog theo xe QUA projectId của log, tổng giờ. Trả thêm `equipment: {equipmentName, plateNo, totalHours}[]`. totalCostVnd GIỮ NGUYÊN = cash.totalOut (giờ xe KHÔNG quy tiền).
- components/equipment-manager.tsx: form ghi giờ thêm ô native <select> Công trình (Project active + option "— Không thuộc CT —"). Page truyền projects (getAllProjects).
- app/(app)/cong-trinh/[id]/page.tsx: thêm khối "Xe/máy (giờ)": bảng tên xe | biển số | tổng giờ (đơn vị GIỜ). Rỗng: "Chưa có giờ xe".

**B. Bỏ bắt buộc minStock:**
- lib/validation.ts: materialSchema `minStock` → `z.coerce.number().min(0,"Mức tối thiểu không được âm").optional().default(0)`.
- components/material-manager.tsx: bỏ dấu `*` 2 ô minStock (tạo+sửa), label "Định mức tồn kho tối thiểu (không bắt buộc)", bỏ required nếu có. KHÔNG migration.

**C. NCC thêm Mã số thuế + Địa chỉ:**
- schema.prisma: `Supplier.taxCode String?` + `Supplier.address String?`.
- migration SQL thủ công (<timestamp>_supplier_tax_address/): ADD COLUMN nullable idempotent.
- lib/validation.ts: supplierSchema thêm `taxCode` + `address` optional.
- lib/actions/suppliers.ts: create/update lưu thêm 2 field.
- components/supplier-manager.tsx: form thêm 2 ô (Mã số thuế, Địa chỉ) + bảng hiển thị.

## RÀNG BUỘC (BẮT BUỘC)
- KHÔNG có test framework → tự verify bằng: `npx tsc --noEmit` (PHẢI 0 lỗi) + `npm run lint` + `npm run build`.
- Migration nullable + idempotent (an toàn data live). Áp local trước.
- Mọi trang data: `export const dynamic = "force-dynamic"`.
- UI dùng native <select> (tránh bug base-ui).
- KHÔNG đụng phần Project/RBAC đã làm (chỉ THÊM theo spec).
- Commit từng việc (A/B/C) với message rõ. KHÔNG push (Claude kiểm rồi mới push).
- KHÔNG quy giờ xe ra tiền (chừa cửa). KHÔNG tra MST online.

## TIÊU CHÍ XONG (agy duyệt khi đủ)
1. tsc 0 lỗi, lint sạch, build pass.
2. 2 migration mới áp local OK (psql thấy cột EquipmentLog.projectId + Supplier.taxCode/address).
3. getProjectSummary trả thêm equipment[]; trang CT có khối giờ xe.
4. minStock không còn required; NCC form có 2 ô mới.
5. Không phá Project/RBAC (regression: tsc/build vẫn xanh).

---

## NHẬT KÝ TRAO ĐỔI

### [CLAUDE-SETUP] — dựng kênh + giao việc
- Trạng thái: BÀN GIAO
- Nội dung: Đã tạo branch exp/agy-reasonix-finish + kênh này. Giao toàn bộ 3 việc (A/B/C) cho 2 AI tự phối hợp. Claude đứng ngoài, chỉ kiểm tra bước cuối.
- File đụng: (chưa) — branch sạch, sẵn sàng.
- Chuyển cho: **Reasonix** (bắt đầu code việc A → B → C, ghi CHỜ REVIEW sau mỗi việc).
