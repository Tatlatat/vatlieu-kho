# Nguồn Sự Thật Cộng Tác (`vatlieu-kho`)

> Tài liệu này là **điểm vào số 1** cho người mới, AI mới, và mọi workflow multi-model.
> Mục tiêu: nếu tài liệu khác mâu thuẫn với file này, ưu tiên **code + schema + guard**
> rồi cập nhật lại docs.

## 1. Luật ưu tiên khi đọc dự án

Thứ tự ưu tiên nguồn sự thật:

1. **Code đang chạy**
   - `prisma/schema.prisma`
   - `lib/auth-helpers.ts`
   - `proxy.ts`
   - `lib/actions/*`
   - `lib/queries/*`
   - `app/(app)/*`
2. **Hạ tầng/vận hành**
   - `AGENTS.md`
3. **Tài liệu hiện hành**
   - `README.md`
   - `docs/huong-dan-khach-hang.md`
   - `docs/production-checklist.md`
   - `docs/AI-COLLAB-GUIDE.md`
4. **Tài liệu lịch sử**
   - `docs/superpowers/specs/*`
   - `docs/superpowers/plans/*`
   - `docs/bugs-log.md`

Nếu doc và code lệch nhau:

- **Không suy đoán.**
- Đọc lại file code nguồn sự thật.
- Sửa doc theo code, hoặc sửa code nếu xác nhận doc mới là ý định đúng.
- Ghi rõ file nào là snapshot lịch sử để model sau không đọc nhầm.

## 2. Hiện trạng sản phẩm

Hệ thống hiện tại **không còn là app kho tối giản**. Phạm vi đang chạy gồm:

- Kho vật liệu theo nhiều kho
- Phiếu chứng từ `IN / OUT / TRANSFER / STOCKTAKE`
- Chuyển kho có quy trình gửi duyệt / duyệt / từ chối
- Kiểm kê và ghi nhận chênh lệch qua sổ cái
- Báo cáo tồn và hao hụt
- Quỹ tiền mặt theo quỹ / công trình
- Công trình
- Nhà cung cấp
- Xe / máy và nhật ký giờ chạy
- Quản lý người dùng

Tham chiếu chính:

- `prisma/schema.prisma`
- `lib/actions/documents.ts`
- `lib/actions/transfer-approve.ts`
- `lib/actions/stocktake.ts`
- `lib/actions/cash.ts`
- `lib/actions/projects.ts`
- `lib/actions/equipment.ts`

## 3. Phân quyền thật theo code

Nguồn sự thật:

- `lib/auth-helpers.ts`
- `proxy.ts`
- `components/nav.tsx`
- từng page/action dùng `requireUser()` hoặc `requireAtLeast(...)`

Ba vai trò hiện tại:

| Role | Nhãn UI | Cấp |
|---|---|---|
| `ADMIN` | Quản trị | 3 |
| `MANAGER` | Quản lý | 2 |
| `KEEPER` | Thủ kho | 1 |

Phân cấp là **lồng nhau**: `ADMIN ⊃ MANAGER ⊃ KEEPER`.

Quyền đang có đáng chú ý:

- `ADMIN`:
  - quản lý người dùng
  - có thể tự duyệt / từ chối phiếu chuyển do chính mình tạo
- `MANAGER+`:
  - quỹ
  - công trình
  - vật tư / kho
  - xe/máy CRUD
  - tồn đầu kỳ
  - void giao dịch quỹ / duyệt kiểm kê / nhiều thao tác quản trị nghiệp vụ
- `KEEPER+`:
  - trang chính
  - kiểm kê
  - chuyển kho
  - lịch sử
  - báo cáo
  - menu danh mục, nhưng chỉ thấy tab Nhà cung cấp
  - CRUD nhà cung cấp theo action hiện tại

Lưu ý quan trọng:

- `components/nav.tsx` là **menu đang hiển thị**, không phải toàn bộ quyền nền.
- Có quyền nền không đồng nghĩa luôn có link hiện trên nav.
- Ví dụ: `KEEPER` vào được `app/(app)/danh-muc/page.tsx` để dùng tab `Nhà cung cấp`; các tab vật tư / đơn vị / quỹ / xe máy vẫn yêu cầu `MANAGER+`.

## 4. Nguyên tắc đọc nghiệp vụ

### 4.1 Chứng từ và tồn kho

- Sổ kho là **append-only** ở `StockMovement`.
- Phiếu `DRAFT` chưa động tồn.
- `POSTED` mới sinh movement.
- Hủy phiếu kho dùng **bút toán đảo**, không xóa lịch sử.

Nguồn sự thật:

- `lib/actions/documents.ts`
- `lib/actions/transfer-approve.ts`
- `lib/actions/void.ts`

### 4.2 Kiểm kê

- Phiếu kiểm kê là `Stocktake`.
- Duyệt kiểm kê thuộc `MANAGER+`.
- Chênh lệch được ghi nhận qua movement điều chỉnh.

Nguồn sự thật:

- `lib/actions/stocktake.ts`
- migration + view/trigger trong `prisma/migrations/`

### 4.3 Quỹ

- Quỹ **đã chạy thật**, không còn là “giai đoạn sau”.
- Thu/chi ghi sổ ngay vào `CashEntry`.
- Hủy phiếu quỹ là đánh dấu `void`, không tạo bút toán đảo.

Nguồn sự thật:

- `lib/actions/cash.ts`
- `lib/actions/funds.ts`
- `app/(app)/quy/page.tsx`

## 5. Hạ tầng thật

Nguồn sự thật hạ tầng nằm ở `AGENTS.md`.

Tóm tắt:

- Production DB: **Supabase Singapore**
- Runtime app đọc `DATABASE_URL`
- Migration dùng `DIRECT_URL`
- Dev local dùng Docker Postgres trên host port `5433`
- Không dùng Neon cho runtime hiện tại

## 6. Phân loại tài liệu

### Tài liệu hiện hành

- `README.md`
- `docs/huong-dan-khach-hang.md`
- `docs/production-checklist.md`
- `docs/AI-COLLAB-GUIDE.md`
- `docs/COLLAB-SOURCE-OF-TRUTH.md`

Các file này phải khớp code hiện tại.

### Tài liệu lịch sử

- `docs/superpowers/specs/*`
- `docs/superpowers/plans/*`
- `docs/bugs-log.md`

Các file này có thể ghi lại quyết định ở thời điểm cũ như `OWNER/STAFF`, “Quỹ để giai đoạn sau”, hoặc route cũ. Nếu còn giữ, phải có ghi chú rõ là **snapshot lịch sử**, không phải hiện trạng.

## 7. Checklist bắt buộc cho mọi model trước khi sửa

1. Đọc `docs/COLLAB-SOURCE-OF-TRUTH.md`.
2. Đọc `AGENTS.md` nếu task chạm DB, env, deploy, production.
3. Nếu task chạm quyền:
   - đọc `lib/auth-helpers.ts`
   - đọc `proxy.ts`
   - grep `requireAtLeast(` và `requireUser(`
4. Nếu task thêm field mới:
   - kiểm `schema -> migration -> validation -> action ghi -> query đọc -> UI`
5. Nếu docs mâu thuẫn:
   - sửa docs hoặc mở issue kỹ thuật, không để trạng thái mập mờ.

## 8. Backlog kiến trúc đã chốt là để sau

### Full RBAC theo ma trận quyền giống ảnh client 2026-06-08

Không làm trong đợt bổ sung ảnh 1. Đây là một dự án kiến trúc riêng ở cuối:

- Vai trò động có mã, tên, mô tả.
- Ma trận quyền theo module và hành động.
- Gán người dùng vào vai trò.
- Guard theo permission thay cho `requireAtLeast(...)`.
- Menu, nút, Server Action, API export đều phải đọc permission.
- Permission phải bám nghiệp vụ thật như `transfer.approve`, `document.void`, `stocktake.approve`, `opening.create`, `cash.export`, không chỉ CRUD chung.

Khi bắt đầu hạng mục này, đọc kế hoạch nền ở:

- `docs/superpowers/plans/2026-06-08-client-bo-sung-anh-1.md`
