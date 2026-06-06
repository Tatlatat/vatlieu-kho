<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ha-tang -->
# Hạ tầng (NGUỒN SỰ THẬT — đọc trước khi đụng DB/deploy)

- **Database PRODUCTION = Supabase (Singapore region)**, pooler `aws-1-ap-southeast-1.pooler.supabase.com`. App đọc qua `DATABASE_URL` (port 6543, pooled, PHẢI có `?pgbouncer=true&connection_limit=1`) + `DIRECT_URL` (port 5432, direct, cho `prisma migrate deploy`).
- **Neon = integration CŨ đã bỏ.** Env Vercel có thể còn key `NEON_*`/`POSTGRES_*` rác — app KHÔNG đọc chúng. Mọi tham chiếu "Neon" trong code/docs cũ là LỊCH SỬ, không phải hiện trạng.
- **Dev local = Docker postgres** (`docker-compose.yml`, port 5433), `.env` trỏ `localhost:5433`. KHÁC hẳn production.
- **Deploy:** `vercel --prod` từ branch hiện tại; `vercel-build` tự chạy `prisma migrate deploy` (qua DIRECT_URL) rồi `next build`. Sau migration đổi schema lớn (vd enum role), nhớ chạy script di trú data nếu có + user đăng nhập lại (JWT).
- **Quy tắc:** khi xem DB production "là gì", đọc biến `DATABASE_URL` app dùng — KHÔNG suy từ "env có key nào" (env có cả rác Neon lẫn Supabase).
<!-- END:ha-tang -->
