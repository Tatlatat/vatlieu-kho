# Kho Vật Liệu — Quản lý & Phát hiện Hao hụt Vật liệu Xây dựng

> 🌐 **Demo trực tuyến:** https://vatlieu-kho.vercel.app
> Đăng nhập thử — Quản trị: `owner@vatlieu.vn` / `123456` · Quản lý: `manager@vatlieu.vn` / `123456` · Thủ kho: `staff@vatlieu.vn` / `123456`

Phần mềm web giúp **một doanh nghiệp vật liệu xây dựng** quản lý kho vật liệu, chứng từ nhập/xuất/chuyển/kiểm kê, quỹ tiền mặt, công trình và các thực thể vận hành liên quan. Giao diện tiếng Việt, đơn giản cho người không chuyên.

Điểm nhấn kỹ thuật: **logic lõi đặt ở PostgreSQL** (Postgres-centric) — view tự tính tồn kho, trigger tự ghi nhận hao hụt khi duyệt kiểm kê, ràng buộc dữ liệu ngay tại database.

## Nguồn sự thật cộng tác

Nếu bạn là người mới hoặc model mới trong workflow multi-model, hãy đọc theo thứ tự:

1. `docs/COLLAB-SOURCE-OF-TRUTH.md`
2. `AGENTS.md`
3. `prisma/schema.prisma`
4. `lib/auth-helpers.ts`, `proxy.ts`, `lib/actions/*`, `lib/queries/*`

Các tài liệu trong `docs/superpowers/specs/` và `docs/superpowers/plans/` là **snapshot lịch sử**, không mặc định phản ánh hiện trạng mới nhất.

## Tính năng

- **Phiếu nhập / xuất / chuyển kho / kiểm kê** theo sổ cái bất biến (mọi giao dịch được lưu, không sửa/xóa).
- **Kiểm kê định kỳ** → so sánh số đếm thực tế với tồn trên sổ → **phát hiện hao hụt**. Khi quản lý duyệt phiếu, trigger Postgres tự ghi nhận phần chênh lệch.
- **Dashboard hao hụt**: biểu đồ theo tháng, theo nguyên nhân (hỏng / hết hạn / hao tự nhiên / chênh lệch kiểm kê), top vật liệu hao hụt.
- **Cảnh báo** sắp hết hàng / hết hàng.
- **Quỹ tiền mặt**: thu / chi / tồn quỹ theo quỹ và kỳ lọc.
- **Công trình / nhà cung cấp / xe-máy / người dùng** phục vụ vận hành thực tế.
- **3 vai trò phân cấp**: Quản trị (`ADMIN`), Quản lý (`MANAGER`), Thủ kho (`KEEPER`).

## Công nghệ

Next.js 16 (App Router) · TypeScript · PostgreSQL 16 · Prisma · Auth.js v5 · shadcn/ui + Tailwind · TanStack Table · Recharts · Zod · Docker Compose.

## Chạy thử (clone & run)

Yêu cầu: **Node 20+** và **Docker**.

```bash
# 1. Cài phụ thuộc
npm install

# 2. Tạo file .env (sao chép từ mẫu rồi điền giá trị bên dưới)
cp .env.example .env
#   DATABASE_URL="postgresql://vatlieu:vatlieu123@localhost:5433/vatlieu?schema=public"
#   AUTH_SECRET="<chuỗi ngẫu nhiên bất kỳ>"
#   AUTH_URL="http://localhost:3000"

# 3. Bật PostgreSQL + Adminer bằng Docker
docker compose up -d
#   - Postgres ở cổng host 5433 (tránh xung đột với Postgres sẵn có trên máy)
#   - Adminer (xem DB qua web) ở http://localhost:8080

# 4. Tạo bảng + logic Postgres + dữ liệu mẫu
npm run db:setup

# 5. Chạy ứng dụng
npm run dev
# Mở http://localhost:3000
```

### Tài khoản dùng thử (sau khi seed)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | `owner@vatlieu.vn` | `123456` |
| Quản lý | `manager@vatlieu.vn` | `123456` |
| Thủ kho | `staff@vatlieu.vn` | `123456` |

## Lệnh hữu ích

```bash
npm run dev         # chạy chế độ phát triển
npm run build       # build production
npm start           # chạy production
npm run typecheck   # kiểm tra kiểu TypeScript
npm run lint        # kiểm tra ESLint
npm run db:seed     # nạp lại dữ liệu mẫu
npm run db:setup    # migrate + seed local
```

## Kiến trúc Postgres-centric

- **View `current_stock`** — tồn kho = Σ(nhập) − Σ(xuất), tự tính, kèm trạng thái OK/LOW/OUT.
- **Trigger `trg_stocktake_approve`** — khi phiếu kiểm kê được duyệt, tự sinh giao dịch điều chỉnh (`STOCKTAKE_ADJUST`) cho phần chênh lệch → hao hụt được ghi nhận vào sổ cái.
- **CHECK constraint** — chặn số lượng ≤ 0.
- **View `loss_by_month`** — tổng hợp hao hụt theo tháng × nguyên nhân cho dashboard.

Các view/constraint/trigger này được định nghĩa trong `prisma/migrations/` (nguồn sự thật duy nhất, tự chạy qua `prisma migrate deploy`). Xem chi tiết thiết kế tại `docs/superpowers/specs/`.

## Tài liệu

- `docs/COLLAB-SOURCE-OF-TRUTH.md` — nguồn sự thật cho multi-model collaboration
- `AGENTS.md` — hạ tầng, env, deploy, database production
- `docs/superpowers/specs/` — thiết kế
- `docs/superpowers/plans/` — kế hoạch triển khai
- `docs/bugs-log.md` — nhật ký lỗi gặp phải trong quá trình xây dựng
