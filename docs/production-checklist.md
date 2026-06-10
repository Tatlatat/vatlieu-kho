# Checklist đưa vatlieu-kho lên Production

> Tài liệu này là checklist vận hành cho kiến trúc hiện tại: phiếu kho nhiều dòng, quỹ công trình, công trình/hạng mục/định mức, phân quyền động, audit log và khóa kỳ.

**Phân biệt quan trọng:** App có thể demo tốt nhưng chưa nên dùng dữ liệu thật nếu chưa đi hết nhóm bắt buộc. Production nghĩa là có người dùng thật, dữ liệu thật, backup thật và hậu quả thật khi chứng từ sai.

---

## Trạng thái lõi hiện tại

Đã có các nền tảng quan trọng:

- **Phiếu là nguồn phát sinh chính thức**: nhập, xuất, chuyển kho và tồn đầu kỳ đi qua `InventoryDocument` nhiều dòng.
- **Sổ kho có audit theo bút toán**: `StockMovement` giữ bút toán, có cơ chế revision/supersede/void thay vì sửa âm thầm lịch sử.
- **Quỹ công trình có phiếu nhiều dòng**: `FundDocument` và `FundDocumentLine`.
- **Audit log chứng từ**: phiếu kho có `DocumentAuditLog`, phiếu quỹ có `FundDocumentAuditLog`.
- **Phân quyền động**: Admin/Quản lý có thể tick quyền chức năng qua catalog permission.
- **Khóa kỳ**: `AccountingPeriodLock` chặn sửa/tạo/hủy chứng từ kho hoặc quỹ trong kỳ đã chốt.
- **Báo cáo chính**: nhập-xuất-tồn, tồn theo kho, định mức công trình, quỹ công trình, export Excel và in phiếu.

Những phần này giúp hệ thống có nền để kiểm toán, nhưng vẫn cần checklist vận hành bên dưới trước khi chạy dữ liệu thật.

---

## Bắt buộc trước khi dùng dữ liệu thật

### 1. Gỡ tài khoản demo khỏi trang đăng nhập

Không để trang login hiển thị email/mật khẩu mẫu. Nếu còn tài khoản demo trong production, người ngoài có thể đăng nhập và sửa chứng từ.

Việc cần kiểm:

- `app/login/page.tsx` không in tài khoản/mật khẩu demo.
- DB production không còn user dùng mật khẩu `123456`.

### 2. Tạo tài khoản thật và mật khẩu mạnh

- Tạo tài khoản Admin thật cho chủ hệ thống.
- Tạo tài khoản theo vị trí công việc: Quản lý, Thủ kho, Quỹ, hoặc vị trí tùy chỉnh.
- Mật khẩu tối thiểu 12 ký tự, không dùng chung giữa người dùng.
- Không dùng chung một tài khoản cho nhiều người vì audit log sẽ mất ý nghĩa.

### 3. Rà phân quyền động

Trước khi chạy thật, Admin phải rà từng nhóm quyền:

- Thủ kho có được sửa phiếu đã ghi sổ không?
- Ai được hủy phiếu?
- Ai được quản lý quỹ?
- Ai được import tồn đầu kỳ?
- Ai được khóa/mở kỳ?
- Ai được sửa danh mục vật tư/kho/NCC/công trình?

Nguyên tắc khuyến nghị:

- Quyền `period.lock.manage`, `permission.manage`, `inventory.opening.import` chỉ nên giao cho Admin hoặc Quản lý chịu trách nhiệm.
- Quyền hủy phiếu nên ít người có hơn quyền tạo/sửa phiếu.
- UI ẩn nút chỉ là hỗ trợ; server action đã phải kiểm quyền.

### 4. Chạy UAT bằng dữ liệu thật đã ẩn thông tin nhạy cảm

Lấy 10-20 kịch bản thật từ client, nhập vào app và đối chiếu với Excel hiện tại:

- Tồn đầu kỳ.
- Nhập mua mới.
- Xuất cho công trình/hạng mục.
- Chuyển kho.
- Sửa phiếu đã ghi sổ.
- Hủy phiếu.
- Kiểm kê thừa/thiếu.
- Thu/chi quỹ.
- Báo cáo định mức công trình.

Chưa đối chiếu được với Excel/client thì chưa nên coi báo cáo là production-ready.

### 5. Kiểm tra khóa kỳ

Trước khi chốt tháng/quý:

- Vào `/khoa-ky`.
- Khóa phạm vi `Kho`, `Quỹ`, hoặc `Kho và quỹ`.
- Thử tạo/sửa/hủy một phiếu trong kỳ đã khóa.
- Hệ thống phải chặn bằng lỗi tiếng Việt.
- Thử phiếu ngoài kỳ khóa để chắc thao tác vẫn chạy bình thường.

Quy tắc vận hành: sau khi kế toán/quản lý đã đối chiếu xong kỳ, khóa kỳ ngay. Nếu cần sửa số liệu kỳ cũ, phải mở khóa có kiểm soát, sửa xong rồi khóa lại.

### 6. Kiểm tra audit trail

Với ít nhất một phiếu kho và một phiếu quỹ:

- Tạo phiếu.
- Sửa phiếu đã ghi sổ.
- Hủy phiếu.
- Mở chi tiết phiếu và kiểm tra phần audit.

Audit phải trả lời được:

- ai thao tác
- thao tác lúc nào
- thao tác gì
- từ revision nào sang revision nào
- lý do hủy/sửa nếu có

### 7. Backup và thử restore

Backup chưa thử restore thì chưa được coi là backup.

Việc cần làm:

- Bật backup/PITR ở DB provider nếu có.
- Có lịch export định kỳ bằng `pg_dump` hoặc cơ chế tương đương.
- Thử restore sang một DB staging.
- Kiểm tra app staging đọc được dữ liệu đã restore.

### 8. Cấu hình bảo mật production

- `AUTH_SECRET` phải là chuỗi ngẫu nhiên mạnh, sinh bằng `openssl rand -base64 32`.
- Không commit `.env`.
- Không dùng DB production cho local dev.
- Bật HTTPS/domain riêng khi đưa cho client dùng thật.
- Cân nhắc rate limit login nếu public URL được chia sẻ rộng.

---

## Rất nên có trong tuần đầu vận hành

- **Error monitoring**: Sentry hoặc công cụ tương đương để biết lỗi thật ngoài production.
- **Uptime alert**: theo dõi `/api/ping`.
- **Nhật ký thao tác danh mục/người dùng**: hiện audit mạnh nhất nằm ở chứng từ; danh mục và phân quyền nên được audit thêm khi hệ thống lớn.
- **Chức năng đổi mật khẩu/quên mật khẩu**: tránh phải sửa DB thủ công.
- **Hướng dẫn vận hành cho client**: cách tạo phiếu, sửa phiếu, hủy phiếu, khóa kỳ, export báo cáo.

---

## Lệnh kiểm tra trước deploy

Chạy các lệnh sau trên code mới nhất:

```bash
for f in tests/*.test.ts; do npx tsx "$f" || exit 1; done
npm run lint
npm run typecheck
npx prisma validate
npm run build
```

Nếu có migration mới:

```bash
npx prisma migrate deploy
```

Nếu có thay đổi logic Postgres riêng:

```bash
npm run db:logic
```

---

## Điều không nên hứa với client

Không nên nói phần mềm "không bao giờ sai kế toán/kiểm toán". Cách nói đúng hơn:

- Hệ thống có phân quyền.
- Chứng từ có audit trail.
- Sổ kho không sửa/xóa âm thầm.
- Có khóa kỳ sau đối chiếu.
- Có test nghiệp vụ và quy trình UAT với dữ liệu thật.
- Có backup/restore.

Đó là cách giảm rủi ro thực tế và có bằng chứng khi cần kiểm tra lại.
