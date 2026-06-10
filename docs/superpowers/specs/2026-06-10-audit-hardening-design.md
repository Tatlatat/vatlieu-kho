# Thiết kế: Kiểm soát nghiệp vụ, audit trail và khóa kỳ

**Ngày:** 2026-06-10
**Trạng thái:** Đã được duyệt qua yêu cầu triển khai các mục 2, 3, 4 và 6 trong đề xuất hardening.

## Bối cảnh

Hệ thống đã mở rộng từ kho vật tư đơn giản sang phiếu kho nhiều dòng, quỹ công trình, công trình/hạng mục, định mức và phân quyền động. Vì dữ liệu này dùng để đối chiếu kế toán/kho, rủi ro lớn không chỉ là lỗi kỹ thuật mà là sửa/xóa chứng từ không có truy vết, báo cáo không có test đối chiếu, hoặc chứng từ kỳ cũ vẫn bị thay đổi sau khi đã chốt.

## Mục tiêu

- Bổ sung test nghiệp vụ cho các quy tắc kế toán/kho cốt lõi.
- Mở rộng audit trail cho phiếu quỹ, tương tự phiếu kho.
- Thêm khóa kỳ để chặn tạo/sửa/hủy phiếu kho, phiếu quỹ, import tồn đầu kỳ và duyệt kiểm kê trong kỳ đã chốt.
- Cập nhật checklist production cho kiến trúc mới sau phase phiếu nhiều dòng, quỹ, định mức và phân quyền động.

## Không làm trong phase này

- Không xây hệ thống kế toán tổng hợp thay thế phần mềm kế toán.
- Không thêm quy trình duyệt chứng từ vì client đang tạm bỏ duyệt để demo.
- Không khóa danh mục vật tư/kho/công trình theo kỳ; khóa kỳ chỉ áp dụng cho phát sinh chứng từ.

## Nguyên tắc nghiệp vụ

1. Báo cáo tồn kho phải có thể đối chiếu theo công thức: tồn cuối = tồn đầu + nhập - xuất +/- chuyển kho.
2. Báo cáo quỹ phải có thể đối chiếu theo công thức: tồn cuối = tồn đầu + thu - chi.
3. Mọi thay đổi với phiếu đã ghi sổ phải để lại audit log có người thao tác, thời điểm, revision và snapshot trước/sau khi phù hợp.
4. Phiếu thuộc kỳ đã khóa không được tạo mới, sửa, hủy hoặc duyệt nếu thao tác làm thay đổi sổ kho/quỹ.
5. Khóa kỳ phải kiểm tra ở server action; UI chỉ là lớp hỗ trợ.

## Mô hình khóa kỳ

Thêm `AccountingPeriodLock`:

- `scope`: `INVENTORY`, `FUND`, `ALL`.
- `fromDate`, `toDate`: khoảng ngày chứng từ bị khóa.
- `reason`: lý do khóa.
- `createdById`, `createdAt`: người và thời điểm khóa.

Quy tắc:

- `ALL` chặn cả kho và quỹ.
- `INVENTORY` chặn phiếu kho, tồn đầu kỳ và duyệt kiểm kê.
- `FUND` chặn phiếu quỹ.
- Một chứng từ bị chặn nếu `documentDate` nằm trong khoảng `fromDate <= documentDate <= toDate`.
- Xóa khóa kỳ được xem là mở khóa và chỉ người có quyền quản lý khóa kỳ mới làm được.

## Audit phiếu quỹ

Thêm `FundDocumentAuditLog`:

- `documentId`
- `action`: dùng chung enum `DocumentAuditAction`.
- `fromRevisionNo`, `toRevisionNo`
- `reason`
- `snapshotBefore`, `snapshotAfter`
- `changedById`, `changedAt`

Tạo log khi:

- Tạo phiếu quỹ đã ghi sổ: `POST`.
- Sửa phiếu quỹ đã ghi sổ: `EDIT_POSTED`, có snapshot trước/sau.
- Hủy phiếu quỹ: `VOID`, có snapshot trước và lý do hủy.

## Kiểm thử

Thêm test thuần TypeScript cho:

- Đối chiếu tồn kho từ bút toán hiệu lực, bỏ qua bút toán đã supersede/void.
- Đối chiếu quỹ theo kỳ.
- Khóa kỳ: overlap theo scope và ngày chứng từ.
- Snapshot/audit phiếu quỹ.
- Permission catalog có quyền quản lý khóa kỳ và preset Admin/Quản lý phù hợp.

## Checklist production

Checklist production phải phản ánh hệ thống hiện tại:

- Không còn mô tả cũ chỉ có OWNER/STAFF cứng.
- Nêu rõ việc cần kiểm tra khóa kỳ, audit log, backup/restore, tài khoản demo, phân quyền động.
- Tách trạng thái demo và production thật.
