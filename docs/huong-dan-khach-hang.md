# Hướng dẫn & Lưu ý cho người dùng — Tính năng Đa kho

> Bản cập nhật bổ sung theo yêu cầu: quản lý nhiều kho, nhập/xuất theo kho, chuyển kho, báo cáo nhập–xuất–tồn theo kỳ, hủy chứng từ nhập sai.

Web: **https://vatlieu-kho.vercel.app**

---

## 1. Đăng nhập & phân quyền (LƯU Ý QUAN TRỌNG NHẤT)

Hệ thống có **2 vai trò**, mỗi vai trò thấy menu khác nhau:

| Vai trò | Tài khoản | Thấy được |
|---|---|---|
| **Chủ / Quản lý** | owner@vatlieu.vn | TẤT CẢ: Trang chính, Kiểm kê, Chuyển kho, Lịch sử, **Báo cáo**, **Vật liệu** |
| **Thủ kho** | staff@vatlieu.vn | Trang chính, Kiểm kê, Chuyển kho, Lịch sử (KHÔNG thấy Báo cáo & Vật liệu) |

> ⚠️ **Nếu không thấy menu "Vật liệu" hay "Báo cáo"** → bạn đang đăng nhập bằng **Thủ kho**. Hãy đăng nhập bằng tài khoản **Chủ**. Đây là phân quyền cố ý: chỉ Chủ mới quản lý kho, xem báo cáo, hủy chứng từ.

> 💡 Nếu giao diện trông cũ/thiếu mục → nhấn **Ctrl + Shift + R** để tải lại (xóa bộ nhớ đệm trình duyệt).

---

## 2. Các tính năng mới & vị trí

### a) Quản lý kho + đếm số mã vật tư → menu **Vật liệu**
- Tiêu đề bảng hiện **"Danh sách vật tư (N mã)"** — tự đếm số loại vật tư.
- Cuộn xuống mục **"Quản Lý Kho"** → thêm/sửa kho. Có sẵn **"Kho chính"**.

### b) Nhập / Xuất theo kho → menu **Nhập hàng** / **Xuất hàng**
- Có ô **chọn Kho** (mặc định "Kho chính").
- Khi chọn vật tư, **đơn vị tính** hiện cạnh ô số lượng (chỉ để xem, tránh nhập nhầm).
- Ô chọn vật tư có **ô gõ tìm nhanh** theo tên hoặc mã.
- Khi xuất: hệ thống **chặn xuất quá tồn** của kho đó.

### c) Chuyển kho → menu **Chuyển kho**
- Chọn vật tư, **Kho nguồn → Kho đích**, số lượng.
- Tổng hàng toàn công ty **không đổi** (chỉ chuyển chỗ).

### d) Báo cáo Nhập–Xuất–Tồn → menu **Báo cáo**
- Chọn **Từ ngày – Đến ngày** + chọn kho (hoặc "Tất cả kho").
- Bảng cân đối: **Đầu kỳ – Nhập – Xuất – Tồn cuối** từng vật tư.
- **Bấm vào một dòng** → xem nhật ký nhập/xuất chi tiết theo ngày.
- Nút **"Hiện chuyển kho"** → thêm cột Chuyển đến / Chuyển đi khi cần đối soát.

### e) Hủy chứng từ nhập sai → menu **Lịch sử** (và **Kiểm kê**)
- Lịch sử: nút **"Hủy"** ở mỗi dòng nhập/xuất.
- Kiểm kê: mở phiếu đã duyệt → nút **"Hủy phiếu"**.

---

## 3. NHỮNG ĐIỀU CẦN HIỂU ĐÚNG (tránh tưởng nhầm là lỗi)

### Hủy chứng từ KHÔNG xóa khỏi lịch sử
Khi bấm "Hủy", chứng từ **vẫn còn trong Lịch sử** (hiển thị gạch ngang + nhãn "Đã hủy"), kèm một dòng "Bút toán hủy". Tồn kho tự điều chỉnh lại đúng. **Đây là cố ý** — theo nguyên tắc kế toán, chứng từ phải để lại dấu vết (ai hủy, khi nào, lý do), không được xóa sạch. Nhờ vậy luôn truy được trách nhiệm và không thể gian lận số liệu.

### "Chuyển kho" không phải "xuất hàng"
Trong báo cáo, hàng chuyển kho **không** bị tính vào cột "Xuất" (vì hàng vẫn còn trong công ty, chỉ đổi chỗ). Muốn xem riêng, bấm "Hiện chuyển kho".

### Không hủy được nếu hàng đã đi
Nếu bạn hủy một phiếu **nhập** nhưng hàng đó **đã được xuất/chuyển đi rồi**, hệ thống sẽ **báo lỗi và không cho hủy** (vì hủy sẽ làm tồn bị âm — vô lý). Cần xử lý hàng đã xuất trước.

### Hao hụt chỉ hiện sau khi DUYỆT kiểm kê
Hao hụt từ kiểm kê chỉ xuất hiện ở Báo cáo khi: (1) sửa "số đếm thực tế" lệch số sổ, VÀ (2) Chủ bấm **"Duyệt phiếu"**. Phiếu còn nháp hoặc không chênh lệch thì chưa có hao hụt.

### Điều chỉnh kiểm kê chỉ hủy được qua "Hủy phiếu"
Không thể hủy lẻ một dòng "Điều chỉnh kiểm kê" trong Lịch sử (nút Hủy được ẩn) — phải hủy cả phiếu để giữ phiếu kiểm kê toàn vẹn.

---

## 4. PHẠM VI HIỆN TẠI — chỉ theo dõi SỐ LƯỢNG

> Theo yêu cầu ban đầu: *"Xây dựng app chỉ theo dõi số lượng tồn kho, sau khi hoàn thiện sẽ bổ sung thêm."*

App hiện **chỉ quản lý SỐ LƯỢNG** (bao, cây, m³, viên...). **CHƯA** có:
- Giá nhập / giá vốn / giá trị tồn kho (bao nhiêu tiền).
- Lãi/lỗ, công nợ.

Đây là **đúng phạm vi đã thống nhất** — phần "kế toán giá trị" sẽ làm ở giai đoạn sau nếu cần.

---

## 5. LƯU Ý VẬN HÀNH (trước khi dùng cho dữ liệu thật)

1. **Đổi mật khẩu mặc định** — tài khoản demo dùng mật khẩu `123456`, phải đổi trước khi vận hành thật.
2. **Sao lưu dữ liệu** — nên bật backup database định kỳ (xem `docs/production-checklist.md`).
3. **Tốc độ lần đầu** — gói máy chủ miễn phí có thể chậm vài giây ở lần truy cập đầu sau khi web rảnh lâu; các lần sau nhanh bình thường.
4. **Dữ liệu cũ an toàn** — khi nâng cấp đa kho, toàn bộ dữ liệu nhập/xuất cũ đã được tự gán vào "Kho chính", tồn kho không thay đổi.
