# Đánh giá kiến trúc vatlieu-kho — Có cần cải cách "Công trình"?

**Ngày:** 2026-06-06
**Lý do:** Client liên tục bổ sung yêu cầu "theo công trình" (quỹ theo CT, báo cáo
quỹ tổng hợp đa-CT, sắp tới có thể vật tư/xe theo CT). Cảm giác app đang "drift"
khỏi định hướng ban đầu. Tài liệu này phân tích để quyết: cải cách hay không.

---

## 1. Định hướng BAN ĐẦU (từ git + spec gốc)

App khởi đầu là **"Quản lý kho vật liệu xây dựng"**. Trục trung tâm:

```
Warehouse (kho) ──< StockMovement (xuất/nhập/tồn) >── Material (vật tư)
```

Sạch, đúng 1 nghiệp vụ. Mọi thứ xoay quanh **kho** và **vật tư**.
Tiến hóa qua các phase (theo git): multi-warehouse → Bổ sung 2 (phiếu chứng từ
A–F) → Quỹ Thu-Chi-Tồn → các UX fix.

## 2. Hiện trạng schema (20 model/enum)

Trục kho-vật tư vẫn vững. NHƯNG đã xuất hiện các thực thể "vệ tinh" gắn mơ hồ
với "công trình/công trường":

| Thực thể | Vai trò thực tế | Liên kết "công trình" |
|---|---|---|
| `Warehouse` | Kho — nhưng thực tế mỗi kho ≈ 1 công trường | KHÔNG có field project; tên CT nằm trong `name` |
| `Fund` | Quỹ tiền — comment ghi rõ *"theo công trường (giống Warehouse)"* | KHÔNG link Warehouse; là bảng RỜI, tên CT lặp lại trong `name` |
| `Equipment` | Xe/máy | KHÔNG biết đang ở công trình nào |
| `MovementReason.PROJECT` | 1 *lý do* xuất kho | Chỉ là enum, KHÔNG phải thực thể |

**KHÔNG tồn tại model `Project`/`CôngTrình`.**

## 3. Chẩn đoán: DRIFT có thật, ở đúng 1 điểm

Khái niệm "công trình" đang bị **nhét rải rác và lặp lại**:
- Tên 1 công trình "Hậu Lộc" có thể vừa là tên `Warehouse`, vừa là tên `Fund` —
  **2 nơi nhập tay, không ràng buộc nhau**. Gõ lệch tên = 2 thực thể coi như 2 CT
  khác nhau → báo cáo gom sai.
- Mỗi lần client muốn "xem X theo công trình", ta chắp X vào một bảng khác nhau.
- 3 trục dữ liệu (vật tư ở Warehouse, tiền ở Fund, thiết bị ở Equipment) **không
  có khóa chung** → KHÔNG thể trả lời "tổng chi phí 1 công trình" = vật tư tiêu
  hao + chi quỹ + giờ xe.

→ Đây CHÍNH XÁC là "drift" cảm nhận được: định hướng đang lặng lẽ chuyển từ
**"quản lý kho"** sang **"quản lý công trình"** (mỗi CT có kho riêng, quỹ riêng,
xe riêng, lãi/lỗ riêng) mà cấu trúc dữ liệu chưa theo kịp.

## 4. Nhìn 2–3 nước cờ tới (dự đoán yêu cầu client)

Hướng client đang kéo: *"xem mọi thứ theo từng công trình"*. Sắp tới khả năng cao:
- Báo cáo quỹ tổng hợp **theo từng CT** (đã yêu cầu — Nâng cấp #2).
- Vật tư tiêu hao **theo từng CT**.
- Xe/máy thuộc **CT nào**, giờ làm tính vào **CT nào**.
- **Tổng chi phí / hiệu quả mỗi công trình** (báo cáo lãnh đạo).

Mục cuối là "đắt giá" nhất với chủ doanh nghiệp — và **không làm được** nếu 3
trục không chung 1 `projectId`.

## 5. Ba phương án

### PA1 — Thêm model `Project` làm trục (KHUYẾN NGHỊ, làm DẦN)
- Tạo `Project` (id, code, name, isActive...).
- `Warehouse.projectId?` và `Fund.projectId?` (nullable trước → không phá data
  cũ). Sau này `Equipment.projectId?`.
- Logic xuất-nhập-tồn + Quỹ **GIỮ NGUYÊN** (không đụng phần đang chạy đúng).
- Báo cáo "theo công trình" = group theo `projectId` (1 khóa chung).
- **Di trú data cũ:** mỗi Warehouse/Fund hiện có → tạo/khớp 1 Project tương ứng
  (script 1 lần, vì data còn ít).
- Chi phí: 1 migration + 1 màn "Danh mục Công trình" + sửa vài query báo cáo.
- Rủi ro: THẤP nếu projectId nullable + làm từng bước + verify.
- Lợi: chặn drift, mở đường mọi báo cáo "theo CT", đúng hướng client.

### PA2 — Không đổi trục, chắp vá khi cần
- Báo cáo quỹ đa-CT = gom theo `Fund` rời (làm được ngay).
- Nhanh trước mắt. Nhưng drift TIẾP TỤC: lần sau lại chắp chỗ khác; "tổng chi phí
  1 CT" vẫn bất khả; tên CT vẫn lặp tay nhiều nơi → rủi ro sai số liệu.

### PA3 — Đại phẫu toàn diện ngay
- Thiết kế lại quanh Project + dọn luôn Equipment-thành-Material + phân quyền.
- Mạnh nhưng RỦI RO CAO: đụng nhiều thứ cùng lúc trên bản LIVE, ngược YAGNI và
  nguyên tắc "phần mềm vẫn chạy mượt, không mắc lỗi".

## 6. Khuyến nghị

**Chọn PA1, nhưng KHÔNG làm ngay trong đợt này.** Lý do:
- PA1 là cách cải cách CÓ KIỂM SOÁT: thêm trục Project, giữ nguyên phần đang
  chạy, di trú data ít, làm từng bước verify.
- Nó chặn drift tận gốc thay vì chắp vá (PA2), mà không liều như PA3.
- **Thứ tự đề xuất:**
  1. (Đợt nhỏ trước — đã brainstorm) bỏ bắt buộc minStock + MST/địa chỉ NCC.
     Đây là việc độc lập, không dính trục Project → làm luôn, không phí.
  2. **Trước khi làm "báo cáo quỹ đa-CT"**, dừng lại làm PA1 (thêm Project,
     link Warehouse+Fund). Vì báo cáo đa-CT chính là thứ ĐẦU TIÊN cần trục
     Project — làm Project trước thì báo cáo này "miễn phí" và đúng đắn; chắp
     vào Fund (PA2) là tự tạo nợ.
  3. Sau Project: phân quyền 3 vai trò; rồi mới tính gộp Equipment.

## 7. Câu hỏi mở cần client/anh xác nhận (trước khi làm PA1)

- 1 "Công trình" có thể có **nhiều kho** không, hay 1 CT = 1 kho? (quyết
  Warehouse.projectId là 1-nhiều hay 1-1).
- 1 Công trình có **đúng 1 quỹ** không?
- Có công trình "ảo" (vd Kho tổng / Văn phòng) không thuộc CT nào? → projectId
  nullable xử lý được.

## 8. Kết luận 1 dòng

App drift có thật, ở đúng điểm thiếu thực thể **Công trình**. Cách lành mạnh:
thêm `Project` làm trục chung (PA1), làm DẦN — bắt đầu NGAY TRƯỚC báo cáo quỹ
đa-CT, không đại phẫu, không chắp vá thêm.

---

## 9. TẦM NHÌN SÂU HƠN của client (bổ sung 2026-06-06, RẤT QUAN TRỌNG)

Sau khi nghe phân tích "thêm Project", client làm rõ: vấn đề KHÔNG chỉ là thiếu
1 thực thể. Tầng sâu hơn:

> "Nó còn là câu chuyện về **quản lý quỹ** (vốn ban đầu không có, phong cách quản
> lý KHÁC), rồi **xe/máy** cũng quản lý theo kiểu khác, rồi **kho bãi** các kiểu…
> Ở tầng sâu, nó yêu cầu sự thay đổi không chỉ là quản lý nữa, mà liên quan tới
> **sự khéo léo, tinh tế trong sắp xếp thông tin** — để vừa NHỎ GỌN, vừa CHÍNH
> XÁC trong quản lý. Cái cần KHÔNG phải đại tu lớn lao, mà là **sự sắp xếp tối ưu
> thực dụng giữa các tầng sâu**, để dữ liệu **tương tác chồng chéo** với nhau mà
> không gặp vấn đề. Tương lai còn nhiều bổ sung như này."

### Diễn giải đúng vấn đề
- App đang tích tụ NHIỀU "phong cách quản lý" khác nhau, mỗi cái client thêm vào
  mang 1 TƯ DUY riêng:
  - Kho: quản theo **số lượng tồn** (StockMovement đếm quantity).
  - Quỹ: quản theo **dòng tiền** (CashEntry Thu/Chi, append-only).
  - Xe/máy: quản theo **giờ làm/công suất** (EquipmentLog hours), sắp tới gắn CT.
- Mỗi "phong cách" là 1 mô hình ghi sổ khác nhau. Yêu cầu thật của client:
  **một nền sắp xếp thông tin cho phép các phong cách này CHỒNG LẤN/GIAO THOA**
  (vd: tổng chi phí 1 CT = vật tư + tiền + giờ xe) mà không xung đột, không phình to.

### Nguyên tắc thiết kế client ĐÃ NÊU (ghi để mọi quyết định sau bám theo)
1. KHÔNG đại tu lớn. Thực dụng.
2. NHỎ GỌN + CHÍNH XÁC đồng thời (không hi sinh cái nào).
3. Dữ liệu nhiều phong cách phải GIAO THOA được qua trục/khóa chung.
4. Thiết kế phải MỞ cho bổ sung tương lai (extensible) mà không phải sửa lại nền.

### Hướng suy nghĩ (chưa chốt — cần brainstorm tiếp)
- Project là TRỤC GOM (cái "chồng chéo" hội tụ về). Đúng nhưng CHƯA ĐỦ.
- Có thể cần 1 khái niệm chung hơn cho "phong cách ghi sổ": cả StockMovement,
  CashEntry, EquipmentLog đều là **sổ cái append-only theo thời gian, gắn 1 đối
  tượng + 1 công trình** → có thể có pattern chung (ledger pattern) để báo cáo
  tổng hợp đa-chiều mà không hardcode từng loại.
- CẨN TRỌNG: đừng trừu tượng hóa quá sớm thành "EAV/bảng vạn năng" (mất chính
  xác + khó). Phải cân giữa "1 trục chung" và "giữ từng sổ đúng bản chất riêng".
- Đây là bài toán THIẾT KẾ THÔNG TIN, không phải coding. Cần brainstorm kỹ trục
  + cách các sổ giao nhau TRƯỚC khi đụng schema.
