# Thiết kế: Phiếu nhiều dòng, công trình, định mức và phân quyền động

**Ngày:** 2026-06-10
**Trạng thái:** Dự thảo để review trước khi lập kế hoạch triển khai.

## Bối cảnh

Client đã chốt các nguyên tắc nghiệp vụ mới:

1. Mọi phát sinh nhập, xuất, chuyển kho đều phải lập phiếu.
2. Phiếu nhập, xuất, chuyển và quỹ đều có nhiều dòng chứng từ.
3. Phiếu đã lập nếu phát hiện sai thì cần sửa trực tiếp trên phiếu, không bắt người dùng lập chứng từ điều chỉnh mới.
4. Một công trình có đúng một kho, một quỹ và nhiều hạng mục.
5. Định mức vật tư tính theo từng hạng mục. Nếu công trình không chia hạng mục thì dùng một hạng mục mặc định cho toàn công trình.
6. Phân quyền do Admin tick từng chức năng cho từng vị trí/người dùng và có thể thay đổi theo thời điểm.

Hệ thống hiện tại đang ghi thẳng từng dòng nhập/xuất/chuyển vào `StockMovement`. Cách này không còn phù hợp vì thiếu phiếu nhiều dòng, thiếu trạng thái phiếu, thiếu lịch sử sửa phiếu, thiếu công trình/hạng mục/định mức và thiếu phân quyền động.

## Mục tiêu

Thiết kế lại lõi nghiệp vụ theo hướng:

- Phiếu là nguồn phát sinh chính thức.
- Mỗi phiếu có nhiều dòng.
- `StockMovement` tiếp tục là sổ cái tồn kho, chỉ được sinh ra từ phiếu đã ghi sổ.
- Sửa phiếu đã ghi sổ vẫn giữ audit đầy đủ, không sửa/xóa âm thầm dữ liệu sổ cái.
- Công trình, kho công trình, quỹ công trình và hạng mục trở thành dữ liệu lõi.
- Báo cáo định mức tính theo hạng mục và tách rõ "vượt định mức thi công" với "hao hụt tồn kho vật lý".
- Phân quyền chuyển từ role cứng sang quyền chức năng có thể tick.

## Nguyên tắc không được vi phạm

1. **Không ghi thẳng nhập/xuất/chuyển vào `StockMovement` từ UI.** Người dùng làm việc với phiếu; hệ thống tự sinh movement khi phiếu được ghi sổ.
2. **`StockMovement` là sổ cái audit.** Không dùng `UPDATE quantity` hoặc `DELETE` để sửa lịch sử tồn kho.
3. **Sửa phiếu đã ghi sổ = tạo phiên bản mới của phiếu và ghi sổ lại.** Movement cũ được đánh dấu bị thay thế/hủy hiệu lực, movement mới được sinh lại.
4. **Tồn kho vẫn tính từ movement còn hiệu lực.** Không lưu tồn kho cứng trong bảng riêng làm nguồn sự thật.
5. **Quyền phải kiểm tra ở server action.** UI ẩn nút chỉ là tiện ích, không phải bảo vệ bảo mật.
6. **Định mức là ngân sách/chuẩn sử dụng vật tư, không phải tồn kho.** Báo cáo phải dùng đúng ngôn ngữ để tránh hiểu sai.

## Quyết định tạm về câu hỏi còn mở

Câu hỏi còn chờ client trả lời: phiếu đã ghi sổ khi sửa có cần duyệt lại hay ghi sổ lại ngay?

Để spec không bị kẹt, thiết kế mặc định như sau:

- Người có quyền `inventory.document.edit_posted` được sửa phiếu đã ghi sổ.
- Khi lưu sửa, hệ thống ghi sổ lại ngay trong một transaction: vô hiệu movement phiên bản cũ, tạo phiên bản phiếu mới, sinh movement mới.
- Toàn bộ thay đổi được ghi vào lịch sử sửa phiếu.
- Schema vẫn chừa trạng thái `REVISION_PENDING` và quyền `inventory.document.approve_revision` để nếu client yêu cầu duyệt lại, ta bật luồng duyệt mà không phải đổi lại lõi dữ liệu.

## Phương án được chọn

Chọn phương án: **thêm lớp phiếu nhiều dòng phía trên sổ cái hiện tại**.

Không chọn vá tiếp các form hiện tại vì nhập/xuất/chuyển đang là giao dịch một dòng, sẽ khó xử lý sửa phiếu, nhiều dòng, duyệt chuyển kho và báo cáo định mức.

Không chọn viết lại toàn bộ một lần vì phạm vi quá rộng. Cần chuyển lõi theo từng giai đoạn để giữ hệ thống chạy được.

## Mô hình dữ liệu chính

### Phiếu kho

Thêm bảng `InventoryDocument`.

Các trường chính:

- `id`
- `code`: số phiếu duy nhất.
- `kind`: `IMPORT`, `EXPORT`, `TRANSFER`, `OPENING`, `ADJUSTMENT`.
- `status`: `DRAFT`, `POSTED`, `PENDING_APPROVAL`, `REVISION_PENDING`, `VOIDED`.
- `documentDate`: ngày chứng từ do người dùng nhập.
- `warehouseId`: kho chính của phiếu nhập/xuất.
- `fromWarehouseId`: kho nguồn cho phiếu chuyển.
- `toWarehouseId`: kho nhận cho phiếu chuyển.
- `supplierId`: nhà cung cấp, dùng cho phiếu nhập.
- `projectId`: công trình liên quan nếu có.
- `reason`: lý do nhập/xuất/chuyển.
- `note`
- `revisionNo`: số phiên bản hiện hành.
- `createdById`, `updatedById`, `postedById`, `approvedById`, `voidedById`
- `createdAt`, `updatedAt`, `postedAt`, `approvedAt`, `voidedAt`
- `voidReason`

Danh sách phiếu phải hiển thị tối thiểu:

- Số phiếu.
- Ngày chứng từ.
- Loại phiếu.
- Trạng thái bằng màu dễ phân biệt: nháp, chờ duyệt, đã ghi sổ, đã hủy.
- Người lập phiếu.
- Kho/công trình liên quan.

Thêm bảng `InventoryDocumentLine`.

Các trường chính:

- `id`
- `documentId`
- `lineNo`
- `materialId`
- `unitId`
- `quantity`
- `projectId`
- `workItemId`
- `machineHours`
- `note`

Quy tắc:

- Phiếu nhập có thể có nhiều dòng vật tư, cùng một kho nhập.
- Phiếu xuất có thể có nhiều dòng vật tư; từng dòng có thể gắn công trình/hạng mục.
- Phiếu chuyển có thể có nhiều dòng vật tư, cùng kho nguồn và kho nhận.
- `machineHours` chỉ dùng khi vật tư có loại xe/máy hoặc thiết bị cần theo dõi giờ làm.
- Phiếu đầu kỳ là một loại phiếu riêng `OPENING`, dùng để nhập tồn đầu kỳ hàng loạt và sinh movement đầu kỳ.

### Liên kết sổ cái

Mở rộng `StockMovement`:

- `documentId`
- `documentLineId`
- `documentRevisionNo`
- `supersededAt`
- `supersededByRevisionNo`

Movement còn hiệu lực khi:

- `voidedAt IS NULL`
- `supersededAt IS NULL`
- `reason <> 'VOID'`

Khi phiếu đã ghi sổ được sửa:

1. Khóa các ô tồn kho bị ảnh hưởng theo cặp `(materialId, warehouseId)`.
2. Đọc movement hiện hành của phiếu phiên bản cũ.
3. Kiểm tra việc vô hiệu movement cũ có làm âm tồn không.
4. Đánh `supersededAt` lên movement cũ.
5. Tăng `revisionNo`.
6. Lưu dòng phiếu mới.
7. Sinh movement mới từ dòng phiếu mới.
8. Ghi `DocumentAuditLog`.

Tất cả bước trên nằm trong một transaction.

### Lịch sử phiếu

Thêm bảng `DocumentAuditLog`.

Các trường chính:

- `id`
- `documentId`
- `action`: `CREATE`, `POST`, `EDIT_DRAFT`, `EDIT_POSTED`, `APPROVE`, `VOID`, `DELETE_DRAFT`.
- `fromRevisionNo`
- `toRevisionNo`
- `changedById`
- `changedAt`
- `reason`
- `snapshotBefore`
- `snapshotAfter`

Mục tiêu:

- Biết ai lập phiếu.
- Biết ai sửa phiếu.
- Biết phiếu đã thay đổi những gì.
- Báo cáo và kiểm tra sau này có nguồn truy vết.

### Công trình, hạng mục và định mức

Thêm bảng `Project`.

Các trường chính:

- `id`
- `code`
- `name`
- `warehouseId`
- `fundId`
- `status`: `ACTIVE`, `CLOSED`
- `createdAt`, `updatedAt`

Quy tắc:

- Một công trình có đúng một kho.
- Một công trình có đúng một quỹ.
- Khi tạo công trình, hệ thống có thể tạo kho và quỹ tương ứng.

Thêm bảng `ProjectWorkItem`.

Các trường chính:

- `id`
- `projectId`
- `code`
- `name`
- `isDefault`
- `createdAt`, `updatedAt`

Quy tắc:

- Một công trình có nhiều hạng mục.
- Nếu không chia hạng mục, hệ thống tạo một hạng mục mặc định tên `Chung`.
- Phiếu xuất cho công trình phải chọn hạng mục; nếu người dùng không chọn thì dùng hạng mục `Chung`.

Thêm bảng `MaterialNorm`.

Các trường chính:

- `id`
- `projectId`
- `workItemId`
- `materialId`
- `unitId`
- `normQty`
- `note`
- `createdById`
- `updatedById`
- `createdAt`, `updatedAt`

Ràng buộc:

- Unique theo `(workItemId, materialId)`.
- `normQty >= 0`.

Ví dụ:

- CT A / Móng / Sắt D18: 50 cây.
- CT A / Tường / Sắt D18: 40 cây.
- CT A / Mái / Sắt D18: 30 cây.

### Quỹ công trình

Thêm bảng `Fund`.

Các trường chính:

- `id`
- `code`
- `name`
- `projectId`
- `createdAt`, `updatedAt`

Thêm bảng `FundDocument`.

Các trường chính:

- `id`
- `code`
- `fundId`
- `kind`: `RECEIPT`, `PAYMENT`.
- `status`: `DRAFT`, `POSTED`, `VOIDED`.
- `documentDate`
- `note`
- `revisionNo`
- `createdById`, `postedById`, `voidedById`
- `createdAt`, `postedAt`, `voidedAt`

Thêm bảng `FundDocumentLine`.

Các trường chính:

- `id`
- `documentId`
- `lineNo`
- `amount`
- `category`
- `description`
- `note`

Quỹ không ảnh hưởng tồn kho. Báo cáo quỹ tính từ phiếu thu/chi còn hiệu lực.

### Danh mục nền

Thêm các danh mục:

- `Unit`: đơn vị tính cố định.
- `Supplier`: nhà cung cấp, gồm mã số thuế, tên công ty, địa chỉ.
- `MaterialType`: loại vật tư, xe, máy, thiết bị.

Sửa `Material`:

- `unitId`
- `materialType`
- `trackingMode`: `QUANTITY`, `HOURS`, `QUANTITY_AND_HOURS`
- `minStock` không bắt buộc nhập.

Sửa `Warehouse`:

- Bỏ ràng buộc định dạng mã kho ở validation.
- Cho phép kho gắn với công trình.

Sửa danh mục nhà cung cấp:

- Cho phép sửa mã nhà cung cấp.
- Lưu mã số thuế ở trường riêng.
- Lưu địa chỉ ở trường riêng.
- Tra cứu thông tin công ty theo mã số thuế là tích hợp bổ sung sau, không chặn lõi chứng từ.

## Luồng nghiệp vụ

### Nhập hàng

1. Người dùng vào danh sách phiếu nhập.
2. Chọn tạo phiếu nhập mới.
3. Nhập ngày, kho, nhà cung cấp, lý do nhập.
4. Thêm nhiều dòng vật tư.
5. Lưu nháp hoặc ghi sổ.
6. Khi ghi sổ, hệ thống sinh `StockMovement IN` cho từng dòng.

Nếu phiếu nhập gắn với công trình, kho mặc định là kho của công trình đó.

Các lý do nhập ban đầu:

- Mua mới.
- Tái sử dụng.
- Kiểm kê thừa.
- Nhập đầu kỳ.
- Khác.

### Xuất hàng

1. Người dùng vào danh sách phiếu xuất.
2. Chọn tạo phiếu xuất mới.
3. Nhập ngày, kho xuất, lý do xuất.
4. Mỗi dòng chọn vật tư, số lượng, công trình và hạng mục.
5. Khi ghi sổ, hệ thống kiểm tra tồn từng vật tư tại kho xuất.
6. Nếu đủ tồn, sinh `StockMovement OUT` cho từng dòng.

Nếu dòng xuất chọn công trình/hạng mục, kho xuất mặc định là kho của công trình. Trường hợp muốn đưa hàng từ kho khác về công trình thì dùng phiếu chuyển kho trước, không dùng phiếu xuất để thay thế chuyển kho.

Các lý do xuất ban đầu:

- Xuất cho công trình.
- Kiểm kê thiếu.
- Hỏng/vỡ.
- Hết hạn.
- Hao hụt tự nhiên.
- Khác.

### Chuyển kho

1. Người dùng lập phiếu chuyển nhiều dòng.
2. Chọn kho nguồn, kho nhận, ngày chuyển, lý do chuyển.
3. Admin hoặc người có quyền bypass có thể ghi sổ ngay.
4. Nếu người chuyển là thủ kho nguồn, phiếu vào trạng thái `PENDING_APPROVAL`.
5. Thủ kho nhận hoặc người có quyền duyệt xác nhận.
6. Khi duyệt, hệ thống sinh cặp movement:
   - `OUT / TRANSFER_OUT` ở kho nguồn.
   - `IN / TRANSFER_IN` ở kho nhận.

Các lý do chuyển ban đầu:

- Xuất mượn.
- Xuất thẳng cho công trình.
- Chuyển nội bộ.
- Khác.

### Sửa phiếu

Phiếu nháp:

- Sửa tự do nếu có quyền sửa phiếu.
- Không ảnh hưởng tồn kho vì chưa ghi sổ.

Phiếu đã ghi sổ:

- Chỉ người có quyền sửa phiếu đã ghi sổ mới được sửa.
- Hệ thống không sửa trực tiếp movement cũ.
- Hệ thống tạo revision mới và ghi sổ lại.
- Nếu sửa làm tồn âm thì chặn.
- Bắt buộc nhập lý do sửa.

### Xóa và hủy

Phiếu nháp:

- Có thể xóa nếu có quyền xóa phiếu nháp.
- Ghi audit `DELETE_DRAFT`.

Phiếu đã ghi sổ:

- Không xóa vật lý.
- Chỉ được hủy/void nếu có quyền.
- Hủy phiếu làm movement cũ mất hiệu lực và ghi audit.
- Lịch sử giao dịch không còn là nơi thao tác hủy chính; thao tác hủy nằm tại màn hình phiếu.

## Báo cáo

### Báo cáo nhập - xuất - tồn

Vẫn dựa trên `StockMovement` còn hiệu lực.

Bộ lọc:

- Từ ngày.
- Đến ngày.
- Kho.
- Công trình.
- Vật tư.

Cột chính:

- Đầu kỳ.
- Nhập trong kỳ.
- Xuất trong kỳ.
- Chuyển đến.
- Chuyển đi.
- Tồn cuối kỳ.

Click một mã vật tư mở nhật ký chi tiết:

- Ngày chứng từ.
- Số phiếu.
- Loại phiếu.
- Kho.
- Công trình/hạng mục nếu có.
- Số lượng.
- Người lập.

### Tồn đầu kỳ

Tồn đầu kỳ được nhập qua phiếu `OPENING`.

Yêu cầu:

- Có màn hình nhập hàng loạt theo kho.
- Hỗ trợ dán bảng hoặc import Excel ở giai đoạn xuất/nhập file.
- Mỗi dòng gồm vật tư, kho, số lượng, đơn vị, ghi chú.
- Khi ghi sổ, sinh movement `IN` lý do `OPENING`.
- Chỉ người có quyền tạo đầu kỳ được thao tác.

### Báo cáo định mức công trình

Báo cáo theo công trình, hạng mục và vật tư.

Cột chính:

- Công trình.
- Hạng mục.
- Mã vật tư.
- Tên vật tư.
- Đơn vị.
- Định mức.
- Đã xuất thực tế.
- Chênh lệch = Đã xuất thực tế - Định mức.
- Trạng thái: trong định mức, vượt định mức, chưa có định mức.

Ví dụ:

- Định mức sắt D18 cho móng: 50 cây.
- Thực xuất cho móng: 55 cây.
- Chênh lệch: +5 cây.
- Trạng thái: vượt định mức 5 cây.

Trường hợp client nói "nhập 60, xuất 55, định mức 50":

- 5 cây là vượt định mức thi công.
- 5 cây còn lại trong kho/công trình là tồn vật tư, không phải hao hụt.

### Báo cáo quỹ công trình

Báo cáo theo công trình/quỹ:

- Đầu kỳ.
- Thu trong kỳ.
- Chi trong kỳ.
- Tồn quỹ cuối kỳ.

Báo cáo tổng:

- Tổng quỹ tất cả công trình.
- Drill-down vào từng công trình.

## Phân quyền động

Không dùng role cứng để quyết định nghiệp vụ. Role chỉ còn là nhãn hoặc nhóm quyền.

Thêm bảng:

- `Permission`
- `UserPosition`
- `PositionPermission`
- `UserPositionAssignment`
- `UserPermissionOverride` nếu cần tick riêng cho một user.

Ví dụ mã quyền:

- `inventory.import.view`
- `inventory.import.create`
- `inventory.import.edit_draft`
- `inventory.import.edit_posted`
- `inventory.import.void`
- `inventory.export.view`
- `inventory.export.create`
- `inventory.export.edit_posted`
- `inventory.transfer.create`
- `inventory.transfer.approve`
- `inventory.report.view`
- `fund.view`
- `fund.create`
- `fund.edit_posted`
- `fund.void`
- `project.manage`
- `norm.manage`
- `user.manage`
- `permission.manage`

Admin có thể tick quyền cho vị trí:

- Thủ kho: nhập, xuất, chuyển kho, sửa phiếu.
- Quản lý: nhập, xuất, chuyển kho, sửa phiếu, quỹ, xóa/hủy phiếu.
- Thủ kho kiêm quỹ: thêm quyền quỹ vào cùng user hoặc vị trí.

Ràng buộc an toàn:

- Luôn phải còn ít nhất một user có quyền `permission.manage` hoặc quyền Admin hệ thống.
- Việc thay đổi quyền phải chạy trong transaction để tránh race condition.
- Server action nào cũng gọi `requirePermission(...)`.

## Migration dữ liệu hiện tại

Để không mất dữ liệu cũ:

1. Tạo các bảng mới.
2. Backfill mỗi movement nhập/xuất cũ thành một `InventoryDocument` một dòng.
3. Các cặp chuyển kho cũ có cùng `transferId` được gom thành một phiếu chuyển.
4. Gắn `documentId`, `documentLineId`, `documentRevisionNo = 1` vào movement cũ.
5. Các movement không đủ thông tin được gắn lý do và ghi chú "Dữ liệu chuyển đổi từ hệ thống cũ".
6. Giữ báo cáo hiện tại chạy từ `StockMovement`, sau đó nâng dần để drill-down về phiếu.

## Các màn hình cần có

### Danh mục

- Kho.
- Vật tư/mã hàng.
- Đơn vị tính.
- Nhà cung cấp.
- Công trình.
- Hạng mục.
- Quỹ.
- Vị trí/quyền người dùng.
- Đếm số lượng mã vật tư và hiển thị số thứ tự trong bảng danh mục.

### Nhập hàng

- Danh sách phiếu nhập.
- Tạo/sửa phiếu nhập.
- Lưu nháp.
- Ghi sổ.
- Hủy phiếu.
- In/xem phiếu.

### Xuất hàng

- Danh sách phiếu xuất.
- Tạo/sửa phiếu xuất.
- Chọn công trình/hạng mục theo từng dòng.
- Cảnh báo vượt định mức khi xuất.
- Lưu nháp.
- Ghi sổ.
- Hủy phiếu.
- In/xem phiếu.

### Chuyển kho

- Danh sách phiếu chuyển.
- Tạo/sửa phiếu chuyển.
- Duyệt phiếu chuyển.
- Ghi sổ sau duyệt.

### Quỹ

- Danh sách phiếu thu/chi.
- Phiếu thu/chi nhiều dòng.
- Báo cáo quỹ theo công trình.
- Tổng quỹ tất cả công trình.

### Báo cáo

- Nhập - xuất - tồn.
- Tồn theo mã trên tất cả kho.
- Nhật ký vật tư theo ngày.
- Báo cáo định mức theo công trình/hạng mục.
- Báo cáo quỹ.
- Xuất Excel.
- View/in phiếu.

## Giai đoạn triển khai đề xuất

### Giai đoạn 1: Lõi phiếu kho

- Thêm `InventoryDocument`, `InventoryDocumentLine`, audit log.
- Gắn document vào `StockMovement`.
- Migrate dữ liệu cũ.
- Chuyển nhập/xuất sang phiếu nhiều dòng.

### Giai đoạn 2: Sửa phiếu và hủy phiếu đúng audit

- Sửa phiếu nháp.
- Sửa phiếu đã ghi sổ bằng revision.
- Hủy phiếu từ màn hình phiếu.
- Bỏ thao tác hủy chính khỏi lịch sử giao dịch.

### Giai đoạn 3: Chuyển kho có duyệt

- Phiếu chuyển nhiều dòng.
- Admin/bypass ghi sổ ngay.
- Thủ kho nguồn tạo, thủ kho nhận hoặc Admin duyệt.

### Giai đoạn 4: Danh mục nền

- Đơn vị tính.
- Nhà cung cấp.
- Công trình.
- Hạng mục.
- Quỹ.
- Vật tư/xe/máy theo loại và tracking mode.

### Giai đoạn 5: Định mức công trình

- Nhập định mức theo hạng mục.
- Xuất vật tư cho công trình/hạng mục.
- Cảnh báo vượt định mức.
- Báo cáo định mức.

### Giai đoạn 6: Phân quyền động

- Bảng quyền chức năng.
- Màn hình tick quyền.
- `requirePermission(...)` cho toàn bộ server action.
- Bảo vệ invariant luôn còn Admin/quyền quản trị.

### Giai đoạn 7: Quỹ và báo cáo hoàn chỉnh

- Phiếu thu/chi quỹ nhiều dòng.
- Báo cáo quỹ công trình.
- Tổng quỹ tất cả công trình.

### Giai đoạn 8: Tiện ích nhập/xuất file và in ấn

- Import tồn đầu kỳ từ Excel.
- Export Excel cho báo cáo nhập - xuất - tồn.
- Export Excel cho báo cáo định mức.
- View/in phiếu nhập, xuất, chuyển, quỹ.

## Kiểm thử cần có

### Unit/service test

- Ghi sổ phiếu nhập nhiều dòng sinh đúng movement.
- Ghi sổ phiếu xuất nhiều dòng chặn âm tồn.
- Sửa phiếu đã ghi sổ vô hiệu movement cũ và sinh movement mới.
- Sửa phiếu không được làm âm tồn.
- Hủy phiếu không xóa dữ liệu vật lý.
- Tính chênh lệch định mức đúng.
- `requirePermission(...)` chặn user thiếu quyền.

### Integration test

- Nhập 60, xuất 55 cho hạng mục có định mức 50 thì báo cáo vượt định mức 5.
- Chuyển kho pending approval không ảnh hưởng tồn cho đến khi duyệt.
- Admin chuyển kho có thể ghi sổ ngay nếu có quyền bypass.
- Migrate movement cũ sang document không làm đổi tồn kho.

### Manual QA

- Tạo phiếu nhập nhiều dòng.
- Tạo phiếu xuất chọn công trình/hạng mục.
- Sửa phiếu đã ghi sổ và kiểm tra báo cáo tồn.
- Xem lịch sử sửa phiếu.
- Tick quyền cho thủ kho, quản lý, thủ kho kiêm quỹ.
- Kiểm tra user thiếu quyền không gọi server action trực tiếp được.

## Rủi ro và cách giảm

### Rủi ro: sửa phiếu đã ghi sổ làm lệch tồn

Giảm bằng transaction, advisory lock theo `(materialId, warehouseId)`, không update movement cũ trực tiếp, và test chặn âm tồn.

### Rủi ro: phân quyền động bị thiếu kiểm tra backend

Giảm bằng cách tạo helper bắt buộc `requirePermission(...)` và rà toàn bộ server actions trong giai đoạn phân quyền.

### Rủi ro: hiểu sai "hao hụt"

Giảm bằng cách đặt tên báo cáo là "Vượt định mức" hoặc "Chênh lệch định mức", không gọi là hao hụt kho nếu số liệu đến từ so sánh thực xuất với định mức.

### Rủi ro: phạm vi quá rộng

Giảm bằng triển khai theo giai đoạn, giai đoạn 1 chỉ tập trung lõi phiếu kho và migration.

## Tiêu chí hoàn thành cấp thiết kế

Spec này được coi là đủ để chuyển sang kế hoạch triển khai khi:

- User duyệt hướng "phiếu là trung tâm".
- User chấp nhận cơ chế sửa phiếu bằng revision và audit.
- User xác nhận hoặc thay đổi quyết định tạm về việc sửa phiếu đã ghi sổ có cần duyệt lại.
- User đồng ý triển khai theo giai đoạn, bắt đầu từ lõi phiếu kho.
