# Thiết kế — Thêm Mã cho Xe/máy (hoàn thiện mục 1c)

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm, chờ viết plan
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc`
**Nguồn:** Client BỔ SUNG #1c ("xe/máy cũng là 1 loại MÃ vật tư").

---

## 0. Bối cảnh & làm rõ ý client
Client nói "xe/máy là 1 loại mã vật tư". Khi hỏi rõ: client CHỈ muốn **quản lý
chung 1 chỗ (UI)**, KHÔNG muốn trộn cách đếm (vật tư đếm số lượng, xe đếm giờ).
→ Phần lớn ĐÃ XONG: xe/máy đã ở tab "Xe/máy" trong /danh-muc (chung Trường Danh
mục), đã theo dõi giờ (EquipmentLog.hours), đã gắn công trình (projectId).
→ CÒN THIẾU duy nhất: xe chưa có trường **Mã** (như vật tư có code). Đây là việc
cuối để xe "giống mã vật tư". KHÔNG trộn data model.

## 1. Mục tiêu
Thêm trường **Mã** cho Xe/máy (Equipment.code), duy nhất nhưng cho phép trống.
Form + bảng hiển thị mã. KHÔNG đổi cách quản lý xe (vẫn theo giờ, không số lượng).

### Tiêu chí THÀNH CÔNG
- Equipment có cột `code` (nullable, unique). Migration an toàn data live.
- Form tạo/sửa xe có ô "Mã"; bảng danh sách hiện cột Mã.
- Mã trùng → báo lỗi (P2002). Mã trống → vẫn lưu được (xe cũ không có mã).
- KHÔNG đụng EquipmentLog (giờ) / cách đếm.

## 2. Thay đổi

### 2.1 Schema (Claude)
- `Equipment.code String? @unique`. Nullable: xe cũ chưa có mã vẫn hợp lệ.
  Postgres unique index BỎ QUA giá trị NULL → nhiều xe chưa-có-mã vẫn OK.
- Migration ADD COLUMN nullable + unique index idempotent (IF NOT EXISTS).

### 2.2 Validation (agy)
- `equipmentSchema` thêm `code: z.string().optional()`.

### 2.3 Action (agy)
- `lib/actions/equipment.ts` create/update: nhận + lưu `code` (rỗng → null/undefined).
  Catch P2002 → báo "Mã xe đã tồn tại".

### 2.4 UI (agy)
- `equipment-manager.tsx`: form Thêm + Sửa thêm ô "Mã" (id, name="code"). Bảng
  thêm cột "Mã" (trống → "—"). Đặt ô Mã trước ô Tên (giống vật tư: mã rồi tên).

## 3. Xử lý lỗi
| Tình huống | Xử lý |
|---|---|
| Mã trùng | action catch P2002 → "Mã xe/máy đã tồn tại" |
| Mã trống | lưu null — hợp lệ (xe cũ) |
| Migration | nullable + unique index idempotent → an toàn data live |

## 4. Phân vai
- Claude: schema + migration (chính xác cao) + verify (psql cột + unique) + deploy.
- agy: validation + action + form/bảng UI.

## 5. Phạm vi (YAGNI)
✅ Equipment.code (nullable unique) + form + bảng.
❌ KHÔNG trộn Equipment vào Material.
❌ KHÔNG đổi đếm giờ→số lượng (giữ EquipmentLog.hours).
❌ KHÔNG bắt buộc mã (cho trống).

## 6. Câu hỏi nghiệp vụ — ĐÃ CHỐT
- Client chỉ muốn quản lý chung 1 chỗ (UI) — đã xong, chỉ thêm Mã.
- Mã duy nhất (unique) nhưng nullable (cho trống).
