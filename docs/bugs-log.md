# Nhật ký lỗi (Bug Log)

Ghi nhận các lỗi phát sinh trong quá trình xây dựng, đặc biệt lỗi đến từ harness/môi trường (HS) theo yêu cầu của chủ dự án.

| # | Ngày | Nguồn | Mô tả lỗi | Cách xử lý | Trạng thái |
|---|------|-------|-----------|------------|-----------|
| 1 | 2026-06-01 | HS (môi trường) | Port host 5432 đã bị chiếm bởi Postgres khác trên máy (`eems-postgres` + postgres native PID 1103) → `docker compose up db` lỗi "Bind for 0.0.0.0:5432 failed: port is already allocated". | Đổi port map host sang **5433** trong `docker-compose.yml` (container vẫn 5432), cập nhật `DATABASE_URL` dùng `localhost:5433`. Người clone về máy sạch vẫn dùng 5433 — không xung đột. | ✅ Đã xử lý |
