# Thiết kế: Phần mềm Quản lý & Phát hiện Hao hụt Vật liệu Xây dựng (`vatlieu-kho`)

**Ngày:** 2026-06-01
**Trạng thái:** Đã duyệt qua brainstorming

> **Ghi chú phiên bản:** `create-next-app` cài Next.js 16.2.6 + React 19 + Tailwind v4 (mới nhất, tốt cho portfolio). Tailwind v4 dùng `@import "tailwindcss"` trong `globals.css` thay cho `tailwind.config.ts`. App Router + Server Actions giữ nguyên như thiết kế.

## 1. Mục tiêu

Web app giúp **một doanh nghiệp vật liệu xây dựng** quản lý tồn kho và **phát hiện hao hụt** vật liệu. Người dùng là người không chuyên → UI/UX phải cực đơn giản, tiếng Việt. Đồng thời là dự án portfolio GitHub → code sạch, kiến trúc ấn tượng (Postgres-centric + Docker).

Lõi giá trị: không chỉ trả lời "còn bao nhiêu", mà trả lời **"tháng này hao hụt bao nhiêu, do nguyên nhân gì, phần nào không rõ nguyên nhân cần điều tra"**.

## 2. Phạm vi

**Trong phạm vi:**
- Quản lý danh mục vật liệu (tên, mã, đơn vị, mức tồn tối thiểu)
- Nhập kho / xuất kho với phân loại lý do
- Kiểm kê định kỳ → phát hiện chênh lệch (hao hụt)
- Dashboard hao hụt + cảnh báo sắp hết hàng
- Lịch sử giao dịch
- 2 vai trò: Chủ (OWNER) / Nhân viên kho (STAFF)

**Ngoài phạm vi (YAGNI):**
- Đa doanh nghiệp / multi-tenant
- Realtime (LISTEN/NOTIFY), full-text search, materialized views — để dành nếu cần
- Mobile native, quét mã vạch
- Tích hợp kế toán/ERP ngoài

## 3. Stack công nghệ (agy nghiên cứu + tinh chỉnh)

| Nhóm | Công cụ | Lý do |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack 1 ngôn ngữ, deploy free |
| Database | PostgreSQL 16 (Docker) | Postgres-centric: logic ở DB |
| ORM | Prisma | Truy cập DB type-safe, migration |
| Auth | Auth.js (NextAuth v5) Credentials | 2 vai trò, self-host |
| UI | shadcn/ui + Tailwind CSS | Tối giản, không lock-in |
| Bảng | TanStack Table | Sort/filter/phân trang |
| Biểu đồ | Recharts | Chart hao hụt đơn giản, đẹp |
| Validation | Zod + React Hook Form + Server Actions | Kiểm tra dữ liệu chặt |
| Môi trường | Docker Compose (Postgres + Adminer + healthcheck + init data) | 1 lệnh chạy được, demo có data sẵn |

## 4. Kiến trúc (Postgres-centric mức A)

```
Trình duyệt (responsive, tiếng Việt)
        ↓
Next.js 15 App Router  —  shadcn/ui + Tailwind
        ↓  Server Actions (Zod validate)
Prisma ORM (lớp truy cập mỏng)
        ↓
PostgreSQL  ←── trái tim logic:
  - View current_stock: tự tính tồn = Σ(IN) − Σ(OUT)
  - Trigger duyệt kiểm kê → sinh dòng STOCKTAKE_ADJUST (ghi nhận hao hụt)
  - CHECK constraints: cấm số lượng ≤ 0, cấm xuất quá tồn
  - RLS: STAFF chỉ thêm giao dịch & xem tồn; OWNER xem hết + duyệt + báo cáo
  - Window functions (view báo cáo): hao hụt lũy kế theo tháng/nguyên nhân
(chạy qua Docker — `docker compose up` là có DB + data mẫu + Adminer)
```

**Nguyên tắc UI:** Phức tạp ở backend, đơn giản ở mặt người dùng. Người dùng KHÔNG BAO GIỜ thấy chữ "ledger/sổ cái/+/−". Chỉ thấy thao tác đời thường.

## 5. Mô hình dữ liệu (sổ cái bất biến)

| Bảng | Vai trò |
|---|---|
| `users` | id, email, password_hash, name, role (`OWNER`/`STAFF`) |
| `materials` | id, name, code, unit (bao/cây/m³...), min_stock, created_at |
| `stock_movements` | **SỔ CÁI BẤT BIẾN** — id, material_id, type (`IN`/`OUT`), quantity (>0), reason (`PURCHASE`/`PROJECT`/`DAMAGED`/`EXPIRED`/`NATURAL_LOSS`/`STOCKTAKE_ADJUST`), note, created_by, created_at. KHÔNG sửa/xóa. |
| `stocktakes` | id, code, created_by, status (`DRAFT`/`APPROVED`), approved_by, created_at, approved_at |
| `stocktake_items` | id, stocktake_id, material_id, counted_qty (đếm thực tế), system_qty (chốt lúc tạo), diff (= counted − system) |

**Quan hệ:** `materials 1—n stock_movements`; `stocktakes 1—n stocktake_items`; `materials 1—n stocktake_items`; `users 1—n stock_movements`.

**Logic Postgres:**
- View `current_stock(material_id, name, unit, min_stock, on_hand, status)` — `status` ∈ {`OK`, `LOW`, `OUT`} tính từ on_hand vs min_stock.
- Hàm/Trigger `approve_stocktake`: khi `stocktakes.status` → `APPROVED`, với mỗi `stocktake_item` có `diff ≠ 0`, sinh 1 dòng `stock_movements` loại điều chỉnh (`STOCKTAKE_ADJUST`): diff < 0 → OUT (hao hụt), diff > 0 → IN (thừa). Đảm bảo idempotent (không duyệt 2 lần).
- CHECK: `quantity > 0`. Chống xuất quá tồn: kiểm tra trong Server Action + trigger BEFORE INSERT trên movement OUT.
- View báo cáo `loss_by_month` dùng window function: hao hụt theo tháng × nguyên nhân.

## 6. Luồng nghiệp vụ

1. **Nhập hàng** (STAFF): vật liệu → số lượng → ghi chú → ghi `IN/PURCHASE`.
2. **Xuất hàng** (STAFF): vật liệu → số lượng → lý do (PROJECT/DAMAGED/EXPIRED/NATURAL_LOSS) → ghi `OUT/<reason>`. Chặn xuất quá tồn.
3. **Kiểm kê** (STAFF tạo & đếm → OWNER duyệt): tạo phiếu chốt system_qty, nhập counted_qty, app hiện diff. OWNER duyệt → trigger ghi nhận hao hụt.
4. **Dashboard** (OWNER): biểu đồ hao hụt theo tháng/nguyên nhân, top vật liệu hao hụt, cảnh báo sắp hết.

## 7. Bản đồ màn hình

| Route | Vai trò | Nội dung |
|---|---|---|
| `/login` | Cả hai | Đăng nhập |
| `/` | STAFF | 4 nút lớn (Nhập/Xuất/Kiểm kê/Tìm) + bảng tồn kho màu trạng thái |
| `/nhap`, `/xuat` | STAFF | Form 3-4 trường |
| `/kiem-ke` | STAFF + OWNER | Tạo/điền phiếu; OWNER duyệt |
| `/vat-lieu` | OWNER | Quản lý danh mục, đặt min_stock |
| `/bao-cao` | OWNER | Dashboard Recharts + cảnh báo + xuất |
| `/lich-su` | Cả hai | TanStack Table lịch sử giao dịch |

## 8. Xử lý lỗi & validation

- Mọi Server Action validate bằng Zod trước khi chạm DB.
- Lỗi nghiệp vụ (xuất quá tồn) → thông báo tiếng Việt thân thiện, không lộ lỗi kỹ thuật.
- DB constraint là lớp bảo vệ cuối (defense in depth).
- Lỗi do harness/môi trường (HS) → ghi vào `docs/bugs-log.md`.

## 9. Kiểm thử

- `npm run build` sạch, `tsc --noEmit` sạch, `eslint` sạch.
- Seed data mẫu (vật liệu + giao dịch + 1 phiếu kiểm kê có chênh lệch) để demo.
- Khởi động app thật, kiểm tra từng luồng: login 2 vai trò, nhập, xuất (cả case quá tồn), kiểm kê + duyệt, dashboard hiện hao hụt.
- Lặp nhiều vòng đến khi không còn lỗi.

## 10. Quyết định môi trường

- **Build path:** `/tmp/vatlieu-kho` (không có dấu cách — tránh lỗi native tool với path "level 3.1").
- **Quy trình:** Claude giao prompt chi tiết cho agy (Antigravity) viết code → Claude verify từ artifact (git diff, build, lint, chạy thật) → lặp. Không tin agy tự báo cáo.
- **Tự động hóa hoàn toàn:** không hỏi user trong quá trình; mọi quyết định nhỏ Claude tự xử theo spec này.
