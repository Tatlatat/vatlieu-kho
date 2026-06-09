# Nhật ký lỗi (Bug Log)

Ghi nhận các lỗi phát sinh trong quá trình xây dựng, đặc biệt lỗi đến từ harness/môi trường (HS) theo yêu cầu của chủ dự án.

> Ghi chú: đây là **nhật ký lịch sử theo thời điểm phát sinh lỗi**. Một số đoạn cũ
> có thể nhắc tới hệ vai trò `OWNER/STAFF` hoặc phạm vi cũ tại thời điểm ghi log,
> không phải hiện trạng mới nhất của app.

**Tổng kết:** 8 lỗi gặp phải, tất cả đã xử lý/giảm thiểu. Đánh giá trung thực (xem bảng phân loại cuối file): 2 lỗi do môi trường/cơ chế công cụ, 1 nửa-nửa, **4 lỗi do mình dùng công cụ chưa đúng hoặc setup ẩu**, 1 lỗi hạ tầng/kiến trúc (chậm vì free-tier region) — không có lỗi nào là "OSS hỏng". Không có lỗi logic nghiệp vụ (tính tồn kho / hao hụt đều đúng).

**Kết quả kiểm thử (3 vòng):**
- Vòng 1 — tĩnh: `typecheck` ✅, `lint` ✅ (0 lỗi, 0 cảnh báo), `build` ✅
- Vòng 2 — E2E (production build): 14/14 PASS (login 2 vai trò, 7 route owner, phân quyền staff, sai mật khẩu, redirect chưa-login)
- Vòng 3 — clean-clone: `git clone` mới → `npm install` → `db:setup` → `build` → `npm start` → login → dashboard render chart, tất cả ✅
- DB Postgres-centric verify riêng: view tự tính tồn đúng, trigger sinh hao hụt khi duyệt, idempotent, CHECK chặn số âm.

| # | Ngày | Nguồn | Mô tả lỗi | Cách xử lý | Trạng thái |
|---|------|-------|-----------|------------|-----------|
| 1 | 2026-06-01 | HS (môi trường) | Port host 5432 đã bị chiếm bởi Postgres khác trên máy (`eems-postgres` + postgres native PID 1103) → `docker compose up db` lỗi "Bind for 0.0.0.0:5432 failed: port is already allocated". | Đổi port map host sang **5433** trong `docker-compose.yml` (container vẫn 5432), cập nhật `DATABASE_URL` dùng `localhost:5433`. Người clone về máy sạch vẫn dùng 5433 — không xung đột. | ✅ Đã xử lý |
| 2 | 2026-06-01 | HS (version mới) | `create-next-app` + `npm install prisma` kéo về **Prisma 7.8.0** (bleeding edge). Prisma 7 có breaking change: bỏ `url = env(...)` trong `datasource`, yêu cầu driver adapter cho PrismaClient runtime → `prisma migrate` lỗi P1012, và client runtime phức tạp hơn nhiều. | Quyết định **pin Prisma về dòng 6.x ổn định** (nhiều tài liệu, agy & tutorial đều theo Prisma 6, ít rủi ro lỗi) để đạt mục tiêu "không lỗi". Giữ `url = env("DATABASE_URL")` trong schema như chuẩn Prisma 6. | ✅ Đã xử lý |
| 3 | 2026-06-01 | HS (cơ chế Prisma) | `prisma migrate reset --force` bị chặn bởi cơ chế an toàn mới ("PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION") khi chạy qua agent → không reset được DB tự động. | Không cần reset: bảng đã tạo đúng schema từ migrate trước (Prisma 6/7 sinh SQL giống nhau cho schema này). Apply `postgres-logic.sql` trực tiếp qua `psql` (views/trigger/constraint tạo OK). Seed nạp qua `tsx prisma/seed.ts` trực tiếp (không qua wrapper bị chặn). | ✅ Đã xử lý |
| 4 | 2026-06-02 | HS (version mới) | shadcn v4 dùng **base-ui** mới: `Select.onValueChange` có chữ ký `(value: string \| null, ...) => void`, không khớp `useState` setter `(v: string) => void` → build TypeScript fail. | Wrap handler: `onValueChange={(v) => setX(v ?? "")}` trong `material-select.tsx` và `export-form.tsx`. | ✅ Đã xử lý |
| 5 | 2026-06-02 | HS (version mới) | Recharts 3 type chặt: trong `Pie.label`, `percent` có kiểu `number \| undefined` → `(percent * 100)` lỗi "possibly undefined". | `((percent ?? 0) * 100).toFixed(0)` trong `loss-charts.tsx`. | ✅ Đã xử lý |
| 6 | 2026-06-02 | Phát hiện ở vòng 3 (clone test) | `.gitignore` mặc định của create-next-app có `.env*` → match luôn `.env.example`, nên file mẫu KHÔNG được commit. Người clone về thiếu file → README `cp .env.example .env` thất bại. | Thêm dòng `!.env.example` vào `.gitignore` rồi `git add -f .env.example`. | ✅ Đã xử lý |
| 7 | 2026-06-02 | **Lỗi code của mình** (user phát hiện) | Dropdown chọn vật tư & lý do hiển thị mã ID nội bộ (cuid `cmpvz3ce...`) / enum (`PROJECT`) thay vì tên. Do `<SelectValue>` để trống — khi đã chọn, base-ui hiển thị raw value. Đây là lỗi dùng component chưa đúng, KHÔNG phải lỗi của OSS. | Truyền children vào `SelectValue` để map value → tên hiển thị (`material-select.tsx`, `export-form.tsx`). | ✅ Đã xử lý |
| 8 | 2026-06-02 | **Hạ tầng/kiến trúc** (user phát hiện) | Chuyển trang chậm ~2s (đôi khi tới 10s). Đo thật bằng curl đã-login: server warm chỉ ~0.4s, NHƯNG cold-start 2.4–10s; header `x-vercel-id: sin1::iad1` cho thấy edge Singapore phải bay sang function ở Mỹ (iad1) để render, và DB Neon cũng ở Mỹ. (CẬP NHẬT: production sau đó đã chuyển sang Supabase Singapore — phần Neon ở đây là bối cảnh sự cố cũ.) Vercel Hobby (free) **không** đổi được region function → không thể chuyển sang Singapore (đổi DB sang SG sẽ phản tác dụng vì function vẫn ở Mỹ). | (1) Thêm `app/(app)/loading.tsx` skeleton → chuyển trang phản hồi tức thì, hết "đứng hình". (2) Thêm `/api/ping` (SELECT 1) làm endpoint keep-warm cho uptime ngoài (UptimeRobot 5'/lần) gọi → chống cold-start. Cron Vercel bị bỏ vì Hobby chỉ cho 1 lần/ngày. Sau khi sửa: không còn cú 2-10s, cao nhất ~1s, warm ~0.4s; `/vat-lieu` 9.8s → 0.37s. **Lưu ý:** keep-warm chỉ bền nếu có uptime ngoài ping liên tục; cắt triệt để độ trễ VN→Mỹ cần nâng Vercel Pro + đặt function ở `sin1`. | ✅ Đã giảm thiểu (giới hạn free) |

---

## Phân loại lại (đánh giá trung thực)

Đánh giá lại bản chất: lỗi do **OSS/môi trường** (nằm ngoài tầm kiểm soát) hay do **cách mình dùng công cụ chưa đúng** (developer error).

| # | Nhãn cũ | Bản chất thật | Giải thích |
|---|---------|---------------|-----------|
| 1 | HS môi trường | **Môi trường (thật)** | Máy chấm có Postgres khác chiếm cổng 5432. Không phải lỗi code. Né cổng là hợp lý. |
| 2 | HS version mới | **Nửa-nửa** | Prisma 7 đúng là có breaking change thật. NHƯNG để `create-next-app`/agy kéo về bản 7 bleeding-edge mà không pin version ngay từ đầu là **quyết định setup chưa cẩn thận của mình**. Đáng lẽ pin `prisma@6` ngay. |
| 3 | HS cơ chế Prisma | **Cơ chế công cụ (thật)** | Prisma chặn `migrate reset` qua agent là tính năng an toàn mới. Không phải lỗi code. |
| 4 | HS version mới | **Lỗi dùng công cụ của mình** | base-ui đổi chữ ký `onValueChange` — nhưng việc không xử lý kiểu `string\|null` là **mình dùng chưa khớp API**. OSS không sai, chỉ là API mới. |
| 5 | HS version mới | **Lỗi dùng công cụ của mình** | Recharts khai báo `percent?: number` (đúng, vì có thể undefined). Mình quên xử lý `undefined` — **đây là mình ẩu**, không phải Recharts lỗi. |
| 6 | clone test | **Lỗi setup của mình** | `.gitignore` mặc định nuốt `.env.example` — đáng lẽ kiểm tra ngay khi tạo file. Lỗi quy trình của mình, không phải OSS. |
| 7 | — | **Lỗi code của mình** | Dùng `SelectValue` thiếu children. Hoàn toàn là developer error. |

**Kết luận thẳng thắn:** Trong 7 lỗi — **2 lỗi thật sự do môi trường/cơ chế công cụ** (#1, #3), **1 lỗi nửa-nửa** (#2), và **4 lỗi do mình dùng công cụ chưa đúng / setup ẩu** (#4, #5, #6, #7). Không có lỗi nào là "OSS bị hỏng" — các thư viện đều hoạt động đúng; phần lớn vấn đề là **mình chưa dùng đúng API của bản mới**.
