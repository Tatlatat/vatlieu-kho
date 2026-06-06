# Checklist đưa vatlieu-kho lên Production

> Tài liệu này liệt kê những việc cần làm trước khi để **người dùng thật, dữ liệu thật** sử dụng app. Đánh giá dựa trên rà soát code thực tế (auth.ts, middleware.ts, server actions, seed.ts) — không phải checklist chung chung.

**Phân biệt quan trọng:** App hiện tại là một **demo deploy thật**, chưa phải production. Khác biệt nằm ở 3 chữ: *dữ liệu thật, người dùng thật, hậu quả thật*.

---

## ✅ Phần lõi đã sẵn sàng (không cần làm gì thêm)

Những thứ khó nhất đã làm đúng:

- **Mật khẩu băm bcrypt** — `auth.ts` dùng `bcrypt.compare`, không lưu plaintext.
- **Phân quyền chặt** — `middleware.ts` chặn route theo vai trò (OWNER/STAFF); mọi server action đều `requireUser()`/`requireRole()` + validate Zod (`safeParse`) trước khi chạm DB.
- **Sổ cái bất biến (append-only)** — bảng `StockMovement` chỉ thêm, không sửa/xóa → audit trail tự nhiên cho nhập/xuất/kiểm kê.
- **Logic nghiệp vụ trong Postgres** — view `current_stock`, trigger duyệt kiểm kê, CHECK constraint chặn tồn âm → dữ liệu không thể sai dù app có bug.
- **Migration có version** — thư mục `prisma/migrations/` → deploy DB lặp lại được, an toàn.

➡️ **Kết luận: kiến trúc đã production-grade. Việc còn lại chủ yếu là "dọn dẹp demo" + "vận hành".**

---

## 🔴 BẮT BUỘC — chưa làm thì KHÔNG được dùng thật

### 1. Bỏ tài khoản demo lộ trên trang đăng nhập
**Vấn đề:** `app/login/page.tsx` đang in công khai:
```
Quản lý: owner@vatlieu.vn — mật khẩu 123456
Thủ kho: staff@vatlieu.vn — mật khẩu 123456
```
→ Bất kỳ ai mở trang login đều đăng nhập được quyền Quản lý. **Lỗ hổng nghiêm trọng nhất.**

**Cách sửa:** Xóa khối `<div>` "Tài khoản dùng thử" (dòng ~63–67 trong `app/login/page.tsx`).

### 2. Tạo tài khoản thật + mật khẩu mạnh, xóa tài khoản seed
**Vấn đề:** Tài khoản hiện có dùng mật khẩu `123456`.

**Cách làm:**
- Tạo tài khoản thật cho chủ doanh nghiệp + (các) thủ kho, mật khẩu ≥ 12 ký tự.
- Xóa hẳn `owner@vatlieu.vn` / `staff@vatlieu.vn` khỏi DB production.
- Tạm thời có thể chèn qua script (băm bằng bcrypt) hoặc thêm trang quản lý người dùng (xem mục 🟠).

### 3. Kiểm tra AUTH_SECRET
**Vấn đề:** `AUTH_SECRET` ký JWT phiên đăng nhập. Lộ = giả mạo phiên của bất kỳ ai.

**Cách làm:**
- Sinh chuỗi ngẫu nhiên mạnh: `openssl rand -base64 32`
- Đặt vào Vercel env (Production), KHÔNG commit vào git.
- Kiểm tra: `vercel env ls production | grep AUTH_SECRET`

### 4. Dọn dữ liệu mẫu khỏi DB production
**Vấn đề:** DB đang chứa 8 vật tư mẫu + ~30 giao dịch giả (từ `seed.ts`).

**Cách làm:**
- Production phải bắt đầu **sạch** hoặc bằng dữ liệu thật.
- Tách rõ: `seed.ts` chỉ để DEV. Production nhập liệu qua chính giao diện app.
- Nếu muốn xóa sạch để bắt đầu lại: `TRUNCATE` các bảng theo đúng thứ tự khóa ngoại (Stocktake → StockMovement → Material), hoặc tạo lại DB.

### 5. Bật + kiểm tra backup database
**Vấn đề:** Chưa có chiến lược backup. Mất DB = mất sạch sổ kho, không lấy lại được.

**Cách làm:**
- Supabase có **Point-in-Time Restore**, nhưng gói free giới hạn cửa sổ thời gian → **kiểm tra gói hiện tại có đủ không**.
- Cân nhắc export định kỳ: `pg_dump` (qua GitHub Actions cron, tương tự keep-warm) đẩy file backup ra nơi an toàn.
- **Quan trọng nhất: thử RESTORE một lần** để chắc backup dùng được — backup chưa test = chưa có backup.

---

## 🟠 RẤT NÊN — để an toàn & vận hành lâu dài

| Việc | Vì sao cần | Trạng thái |
|------|-----------|-----------|
| **Rate limiting trang login** | Chống dò mật khẩu (brute force). Hiện thử mật khẩu vô hạn lần. Dùng Upstash Redis (free tier) hoặc giới hạn theo IP trong middleware. | ❌ Chưa có |
| **Chức năng đổi mật khẩu trong app** | Để chủ/thủ kho tự đổi, không phải nhờ sửa DB tay. | ❌ Chưa có |
| **Quên mật khẩu / khôi phục** | Mất mật khẩu hiện không có đường lấy lại (cần SMTP gửi email, hoặc owner reset cho staff). | ❌ Chưa có |
| **Domain riêng + HTTPS** | `*.vercel.app` thiếu chuyên nghiệp với khách thật. Vercel hỗ trợ gắn domain + cấp SSL tự động. | Đang dùng tên Vercel |
| **Nâng Vercel Pro (nếu đông người dùng)** | Free-tier: cold-start + function ở Mỹ (chậm ở VN). Đã giảm thiểu bằng keep-warm nhưng chưa triệt để. Pro cho đặt function ở Singapore. | Hobby (free) |

---

## 🟡 NÊN CÓ — chuyên nghiệp hoá

- **Theo dõi lỗi (error monitoring)** — Sentry (free tier) để biết khi app lỗi với người dùng thật mà họ không báo.
- **Audit log mở rộng** — ledger StockMovement đã ghi nhập/xuất/kiểm kê; nên ghi thêm ai sửa danh mục vật tư, ai tạo/sửa tài khoản.
- **Mở rộng vai trò** — hiện chỉ OWNER/STAFF. Nếu doanh nghiệp lớn hơn: thêm vai trò "kế toán" chỉ-xem-báo-cáo, v.v.
- **Chính sách dữ liệu** — nếu lưu thông tin nhân viên/đối tác, cần biết đang lưu gì, lưu bao lâu.
- **Health check / uptime alert** — endpoint `/api/ping` đã có; gắn cảnh báo (vd UptimeRobot/Better Uptime) để được báo khi app sập.

---

## Thứ tự đề xuất khi bắt tay

1. **Trước khi mời người dùng đầu tiên:** làm hết nhóm 🔴 (đặc biệt #1, #2 — chỉ vài phút mà chặn được lỗ hổng lớn nhất).
2. **Tuần đầu vận hành:** rate limiting + đổi mật khẩu (🟠).
3. **Khi app đã được dùng đều:** domain riêng, error monitoring, cân nhắc Pro.

> **Lưu ý chi phí:** Tất cả nhóm 🔴 và phần lớn 🟠 đều **miễn phí** (free tier của Supabase/Vercel/Upstash/Sentry). Chỉ Vercel Pro và domain riêng là tốn tiền, và chỉ cần khi app thật sự đông người dùng.
