# Hướng dẫn ngắn gọn các thay đổi mới

Web: https://vatlieu-kho.vercel.app

Tài liệu này tóm tắt các thay đổi mới để anh/chị dễ kiểm tra và hướng dẫn nhân viên sử dụng.

## 1. Nhà cung cấp có mã riêng

- Mỗi nhà cung cấp có thêm trường **Mã NCC**.
- Mã này là mã nội bộ để công ty tự quản lý, không phải mã số thuế.
- Vào **Danh mục -> Nhà cung cấp** để thêm/sửa nhà cung cấp.
- Khi lập phiếu nhập, có thể chọn nhà cung cấp để biết hàng nhập từ đâu.

## 2. Đơn vị tính được quản lý cố định

- Vật tư không còn nhập đơn vị tính tự do.
- Quản lý vào **Danh mục -> Đơn vị tính** để tạo các đơn vị như `kg`, `cây`, `bao`, `m3`, `viên`.
- Khi thêm/sửa vật tư, người dùng chọn đơn vị từ danh sách có sẵn.
- Mục đích là tránh lệch dữ liệu như `bao`, `Bao`, `BAO` bị hiểu thành nhiều đơn vị khác nhau.

## 3. Nhập tồn đầu kỳ bằng Excel

- Vào **Tồn đầu kỳ** để nhập số tồn ban đầu.
- Có thể nhập thủ công hoặc tải file mẫu Excel rồi import lại.
- File Excel gồm 3 cột: `ma_kho`, `ma_vat_tu`, `so_luong`.
- Nếu file sai mã kho, sai mã vật tư, trùng dòng, hoặc vật tư/kho đã có giao dịch, hệ thống sẽ báo lỗi theo từng dòng và không ghi dữ liệu.

## 4. Chuyển kho chọn người duyệt

- Khi tạo phiếu chuyển kho, người lập chọn **thủ kho đích** để duyệt phiếu.
- Phiếu chuyển kho đi theo luồng: **Nháp -> Gửi duyệt -> Đã lập**.
- Người không được chỉ định sẽ không duyệt được phiếu.
- Quản trị viên có thể lập và duyệt ngay khi cần xử lý nhanh.

## 5. Phiếu nhập có thể ghi thêm xe/máy

- Trong phiếu nhập, ngoài vật tư, có thể thêm dòng **xe/máy** và số giờ hoạt động.
- Dòng xe/máy chỉ dùng cho nhật ký thiết bị, không làm tăng tồn kho vật tư.
- Khi in phiếu, phần vật tư và phần xe/máy được tách riêng để dễ đối chiếu.

## 6. Quỹ có báo cáo tổng hợp theo công trình

- Vào **Quỹ** và chọn chế độ tổng hợp để xem thu, chi, tồn theo từng công trình.
- Có thể xuất Excel báo cáo tổng hợp này.
- Phiếu quỹ đã hủy sẽ không được tính vào tổng thu/chi.

## 7. Phân quyền hiện tại

- **Quản trị**: toàn quyền, gồm quản lý người dùng.
- **Quản lý**: quản lý danh mục, quỹ, công trình, tồn đầu kỳ, báo cáo.
- **Thủ kho**: nhập/xuất/chuyển kho, kiểm kê, lịch sử, báo cáo tồn kho, nhà cung cấp.

Lưu ý: hệ thống hiện dùng 3 vai trò cố định. Ma trận phân quyền chi tiết hơn sẽ là hạng mục nâng cấp sau nếu cần.

## 8. Nguyên tắc an toàn số liệu

- Phiếu nháp chưa làm thay đổi tồn kho.
- Phiếu đã lập mới ghi vào sổ kho.
- Hủy phiếu không xóa lịch sử; hệ thống ghi bút toán đảo để còn đối chiếu được.
- Không cho hủy nếu việc hủy làm tồn kho bị âm.
- Báo cáo tồn kho, công trình, quỹ và xe/máy đã loại trừ dữ liệu bị hủy để tránh cộng sai.

## 9. Việc nên làm trước khi dùng thật

- Đổi mật khẩu các tài khoản mặc định.
- Kiểm tra lại danh mục vật tư, kho, đơn vị tính và nhà cung cấp.
- Nhập tồn đầu kỳ trước khi bắt đầu phát sinh giao dịch thật.
- Thử một vòng: nhập kho, xuất kho, chuyển kho, kiểm kê, xem báo cáo, in phiếu.
