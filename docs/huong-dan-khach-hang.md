# Hướng dẫn & Đối chiếu yêu cầu — Phần mềm Kho Vật Liệu

> Tài liệu này đối chiếu **từng mục trong bản yêu cầu bổ sung của anh/chị** với tính năng đã có trong phần mềm.
> - ✅ **ĐÃ CÓ** = đã làm từ đợt nâng cấp trước (nhiều kho), nay gom lại cho dễ thấy.
> - 🆕 **MỚI** = vừa bổ sung trong đợt này.

Web: **https://vatlieu-kho.vercel.app**

---

## 0. Đăng nhập & phân quyền (đọc trước tiên)

Hệ thống hiện có **3 vai trò phân cấp**, mỗi vai trò thấy menu và thao tác khác nhau:

| Vai trò | Thấy được |
|---|---|
| **Quản trị** | Tất cả chức năng, gồm Người dùng |
| **Quản lý** | Gần như toàn bộ nghiệp vụ vận hành, gồm Báo cáo, Quỹ, Công trình, Danh mục |
| **Thủ kho** | Trang chính, thao tác nhập/xuất từ màn hình chính, Chuyển kho, Kiểm kê, Lịch sử, Báo cáo |

> ⚠️ **Không thấy một menu nào đó?** → có thể đang đăng nhập bằng vai trò thấp hơn. Đây là phân quyền cố ý.
> 💡 Giao diện trông cũ/thiếu mục → nhấn **Ctrl + Shift + R** để tải lại.

> Ghi chú kỹ thuật: điều hướng trên thanh menu và quyền nền không hoàn toàn trùng 1-1. Ví dụ `Danh mục` chỉ hiện từ cấp Quản lý, nhưng tab `Nhà cung cấp` trong trang đó hiện đang mở quyền thao tác từ cấp Thủ kho trở lên theo code thật.

---

## 1. Phiếu chứng từ Nhập / Xuất / Chuyển kho / Kiểm kê 🆕

Trước đây nhập/xuất ghi thẳng một dòng. Nay mỗi lần làm việc là **một phiếu chứng từ** có quy trình rõ ràng — giống chứng từ kế toán:

- **Mỗi loại có menu riêng:** **Nhập kho**, **Xuất kho**, **Chuyển kho**, **Kiểm kê**.
- Mỗi phiếu **tự sinh mã** (PN… nhập, PX… xuất, PC… chuyển, KK… kiểm kê) và chứa **nhiều dòng vật tư** trong cùng một phiếu.
- **Trạng thái phiếu** rõ ràng: **Nháp → Đã lập → (Đã hủy)**. Riêng phiếu chuyển kho có thêm bước **Chờ duyệt**.
- **"Lưu nháp"**: lưu lại nhưng **chưa** ảnh hưởng tồn kho — có thể sửa tiếp.
- **"Lập phiếu"**: chính thức ghi vào sổ kho, tồn kho thay đổi.
- **In phiếu** ra khổ A4 (xem mục 6).

> Vì sao tách phiếu? Để mỗi lần nhập/xuất là một chứng từ có thể in, lưu, đối chiếu — đúng cách doanh nghiệp quản lý, tránh ghi nhầm lẻ tẻ.

### Chuyển kho có DUYỆT 🆕
Phiếu chuyển kho đi theo: **Nháp → Gửi duyệt → Quản lý/Quản trị duyệt → Đã lập**. Người lập phiếu **không tự duyệt phiếu của mình** (trừ khi là **Quản trị**) — để có người kiểm tra chéo, tránh sai sót.

---

## 2. Danh mục vật tư & kho — mã tự do, có số thứ tự

- ✅ **Quản lý vật tư & kho** ở menu **Danh mục** (trước tên là "Vật liệu" — 🆕 đổi tên cho đúng nghĩa). Thêm/sửa vật tư, thêm/sửa kho.
- 🆕 **Số thứ tự (STT)** hiển thị trước mỗi vật tư để dễ đếm và đối chiếu.
- 🆕 **Mã vật tư / mã kho đặt tự do** — không bắt buộc theo khuôn cứng nào, anh/chị tự quy ước.
- ✅ Có sẵn **"Kho chính"**; thêm kho mới tùy nhu cầu công trình/chi nhánh.

---

## 3. Phân quyền & quản lý người dùng 🆕

Menu **Người dùng** (chỉ **Quản trị**):

- **Thêm tài khoản mới**, đặt vai trò **Quản trị / Quản lý / Thủ kho**.
- **Đổi vai trò** một người.
- **Đặt lại mật khẩu** cho nhân viên khi quên.
- Hệ thống **không cho tự hạ quyền chính mình** và **luôn giữ ít nhất một Quản trị** — tránh trường hợp khóa nhầm toàn bộ quyền quản trị.

> Mật khẩu được lưu **mã hóa** (không ai đọc được mật khẩu gốc, kể cả người quản trị) — an toàn theo chuẩn.

---

## 4. Nhà cung cấp 🆕

Danh mục **Nhà cung cấp**:

- Thêm/sửa **danh sách nhà cung cấp** (tên, liên hệ, ghi chú).
- Khi **lập phiếu nhập**, có ô **chọn nhà cung cấp** cho phiếu (tùy chọn) — để biết lô hàng nhập từ đâu.
- Không xóa được nhà cung cấp **đã gắn với phiếu nhập** (giữ đúng lịch sử) — nếu cần, để lại và ngừng dùng.

> Theo code hiện tại, quyền thao tác nhà cung cấp đang mở từ cấp **Thủ kho** trở lên, dù đường điều hướng chính thường được nhìn thấy từ nhóm vai trò quản lý.

---

## 5. Xe / Máy & nhật ký giờ chạy 🆕

Menu **Xe/máy**:

- **Quản lý / Quản trị**: thêm/sửa **danh sách xe, máy móc** (tên, loại, biển số, ghi chú).
- **Ghi nhật ký giờ chạy** cho từng xe/máy theo ngày — **Thủ kho cũng ghi được** (vì người trực tiếp vận hành thường là thủ kho/công nhân), hệ thống tự lưu ai ghi.

## 6. Báo cáo, Quỹ, In phiếu & Tồn đầu kỳ

### a) Báo cáo Nhập–Xuất–Tồn ✅ (kèm 🆕 xuất Excel)
- Menu **Báo cáo**: chọn **Từ ngày – Đến ngày** + kho (hoặc "Tất cả kho").
- Bảng cân đối **Đầu kỳ – Nhập – Xuất – Tồn cuối** từng vật tư; bấm một dòng để xem chi tiết theo ngày.
- 🆕 Nút **"Tải Excel"** → xuất bảng báo cáo ra file Excel để lưu hoặc gửi.

> Theo code hiện tại, trang **Báo cáo** đang mở từ cấp **Thủ kho** trở lên.

### b) Quỹ tiền mặt 🆕
- Menu **Quỹ** (từ cấp **Quản lý**): theo dõi **Thu – Chi – Tồn** theo từng quỹ.
- Có **danh mục quỹ**, **lập phiếu thu/chi**, **lọc theo ngày**, và **xuất Excel**.
- Hủy phiếu quỹ là **đánh dấu hủy**, không xóa khỏi lịch sử.

### c) In phiếu A4 🆕
- Mở một phiếu đã lập → nút **"In phiếu"** → bản in khổ A4 gọn gàng (tên công ty, mã phiếu, ngày, bảng vật tư, ô ký tên Người lập / Người duyệt).

### d) Nhập tồn đầu kỳ 🆕
- Menu **Tồn đầu kỳ** (từ cấp **Quản lý**): khi **bắt đầu** dùng phần mềm, nhập số tồn hiện có của từng vật tư × kho.
- Mỗi vật tư × kho **chỉ đặt được một lần**; ô đã phát sinh giao dịch sẽ bị từ chối — để đầu kỳ không đè lên số liệu thật.

---

## 7. Những điều cần hiểu đúng (tránh tưởng nhầm là lỗi)

### Hủy phiếu KHÔNG xóa khỏi lịch sử
Hủy một phiếu đã lập sẽ tạo **bút toán đảo** và đánh dấu "Đã hủy", **không xóa** khỏi sổ. Tồn kho tự chỉnh lại đúng. Đây là cố ý theo nguyên tắc kế toán — luôn truy được ai hủy, khi nào, vì sao; không thể sửa lén số liệu.

### Lịch sử là sổ chỉ-xem 🆕
Menu **Lịch sử** giờ **chỉ để tra cứu**, không có nút hủy lẻ. Muốn hủy → mở **đúng phiếu** rồi bấm "Hủy phiếu". Như vậy mỗi lần hủy gắn với một phiếu cụ thể, rõ ràng hơn.

### "Chuyển kho" không phải "xuất hàng"
Hàng chuyển kho **không** tính vào cột "Xuất" của báo cáo (vì vẫn trong công ty, chỉ đổi chỗ).

### Không hủy được nếu hàng đã đi
Hủy một phiếu nhập mà hàng đó **đã xuất/chuyển đi rồi** → hệ thống báo lỗi và không cho hủy (vì sẽ làm tồn âm). Xử lý hàng đã xuất trước.

### Hàng hỏng / hết hạn / hao hụt khi xuất
Khi lập **phiếu xuất**, chọn đúng **lý do** (xuất công trình / hỏng / hết hạn / hao hụt tự nhiên). Các lý do hao hụt sẽ vào đúng **báo cáo hao hụt** — không bị bỏ sót.

### Hao hụt kiểm kê chỉ hiện sau khi DUYỆT
Hao hụt từ kiểm kê chỉ xuất hiện khi (1) số đếm thực tế lệch số sổ, VÀ (2) **Quản lý/Quản trị** bấm **"Duyệt phiếu"**.

---

## 8. Phạm vi hiện tại & phần để sau

- App hiện quản lý **SỐ LƯỢNG kho** (bao, cây, m³, viên…) và **quỹ tiền mặt** theo sổ thu/chi.
- Hệ thống **chưa** có kế toán giá trị kho chuyên sâu như **giá vốn, công nợ, lãi/lỗ**, hay ERP tổng hợp.

---

## 9. Lưu ý vận hành (trước khi dùng cho dữ liệu thật)

1. **Đổi mật khẩu mặc định** trước khi vận hành (menu Người dùng → Đặt lại mật khẩu).
2. **Nhập tồn đầu kỳ** một lần khi bắt đầu (menu Tồn đầu kỳ).
3. **Sao lưu dữ liệu** định kỳ (xem `docs/production-checklist.md`).
4. **Dữ liệu cũ an toàn** — mọi nâng cấp đều giữ nguyên nhập/xuất và tồn kho đã có.
