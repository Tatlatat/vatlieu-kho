# Bổ sung 2 — Phiếu chứng từ & hoàn thiện nghiệp vụ (Design)

> **Ngày:** 2026-06-04 · **Trạng thái:** TÁI DỰNG từ memory (bản gốc mất cùng clone `/tmp` khi máy reboot, chưa kịp push). Tái hiện y nguyên kiến trúc đã duyệt & build lần trước.
>
> **Nền tảng:** Dựng trên `main` @ `30802ec` = Bổ sung 1 (đa kho) đã deploy production. KHÔNG sửa engine đa kho/kiểm kê đã có; chỉ thêm lớp phiếu chứng từ bên trên sổ cái.

## 1. Bối cảnh & vấn đề

Client gửi **2 bản bổ sung** cho app `vatlieu-kho`. Bản 2 trùng ~11 mục với bản 1 (đa kho — đã làm), nhưng client đánh số mục riêng (1–6) và không thấy được phần đã làm vì doc cũ đặt tên "Đa kho" không khớp cách client đánh số. Bổ sung 2 cần:

1. Thêm **engine phiếu chứng từ** (Phiếu Nhập/Xuất/Chuyển kho/Kiểm kê) làm lớp nghiệp vụ trên sổ cái.
2. Hoàn thiện: danh mục mã tự do, phân quyền user, nhà cung cấp, xe/máy + nhật ký giờ.
3. **Tài liệu đối chiếu** map đúng số mục client 1–6 (✅ đã có / 🆕 mới) để client khỏi tưởng chưa làm.

**Quỹ (Thu–Chi–Tồn)**: HOÃN theo thỏa thuận với client (giai đoạn sau, không làm đợt này).

## 2. Bốn nguyên tắc ưu tiên (kim chỉ nam — client đặt, CÓ THỨ TỰ)

1. **Tối ưu cho ĐÚNG 1 doanh nghiệp** — không multi-tenant; được hard-code giả định doanh nghiệp này.
2. **UI phải PHÂN RÕ từng cái** — backend được GỘP để tối ưu, nhưng UI tách bạch rành mạch.
3. **Chính xác TUYỆT ĐỐI** kiểm toán/kiểm kê/duyệt — cao hơn tốc độ.
4. **Tốc độ "đúng, đủ"** — không tối ưu quá đà sinh bug; nếu mâu thuẫn #3 thì bỏ tối ưu.

→ Hệ quả kiến trúc: **GỘP ở DB (1 cặp bảng cho 4 loại phiếu), TÁCH ở UI (4 menu riêng)**.

## 3. Kiến trúc chốt

### 3.1 Document + DocumentLine (lớp nghiệp vụ gộp)

`Document` + `DocumentLine` gộp cả 4 loại phiếu ở DB. UI tách 4 menu. `StockMovement` giữ nguyên làm **SỔ CÁI bất biến (append-only)** — đây là nguồn chân lý của tồn kho; Document KHÔNG thay thế nó mà *sinh ra* movements khi POST.

```
enum DocType   { IN, OUT, TRANSFER, STOCKTAKE }
enum DocStatus { DRAFT, PENDING, POSTED, VOIDED }

model Document {
  id           String   @id @default(cuid())
  code         String   @unique           // PN/PX/PC/KK + số tự tăng
  type         DocType
  status       DocStatus @default(DRAFT)
  reason       String?                     // lý do nghiệp vụ (OUT: ánh xạ enum; "Tồn đầu kỳ" để nhận dạng)
  note         String?
  warehouseId  String                      // kho (TRANSFER: kho nguồn)
  toWarehouseId String?                    // chỉ TRANSFER: kho đích
  supplierId   String?                     // chỉ IN: nhà cung cấp (Phase E)
  transferId   String?                     // 1 transferId / 1 phiếu TRANSFER (KHÔNG per-line)
  createdById  String
  postedById   String?
  voidedById   String?
  postedAt     DateTime?
  voidedAt     DateTime?
  createdAt    DateTime @default(now())
  lines        DocumentLine[]
  movements    StockMovement[]             // movements do phiếu này sinh
  // + relations: warehouse, toWarehouse, supplier, createdBy, postedBy, voidedBy
}

model DocumentLine {
  id          String   @id @default(cuid())
  documentId  String
  materialId  String
  quantity    Decimal                      // > 0 (validate)
  // STOCKTAKE: quantity = số đếm thực tế
}
```

Thêm `StockMovement.documentId String?` + relation về Document (movement biết nó thuộc phiếu nào → void theo phiếu, không hủy lẻ).

### 3.2 Vòng đời phiếu

- **IN / OUT / STOCKTAKE:** `DRAFT → POSTED → VOIDED`.
- **TRANSFER:** `DRAFT → PENDING → POSTED → VOIDED` (qua duyệt).
- **DRAFT** (nháp): KHÔNG động tồn. **POST** mới ghi sổ cái.
- **VOID** = bút toán đảo (sinh movements ngược dấu), **KHÔNG xóa** dữ liệu.

### 3.3 Sinh mã phiếu

`lib/doc-codes.ts` → `nextDocCode(type)` tự tăng theo prefix: `PN` (nhập), `PX` (xuất), `PC` (chuyển), `KK` (kiểm kê).

### 3.4 Ánh xạ lý do XUẤT → enum sổ cái (CỰC QUAN TRỌNG cho báo cáo hao hụt)

Báo cáo hao hụt (`lib/queries/reports.ts` + view `loss_by_month`) lọc `StockMovement.reason IN (DAMAGED, EXPIRED, NATURAL_LOSS, STOCKTAKE_ADJUST)`. Nếu `postDocument` hardcode mọi OUT → `PROJECT` thì **hàng hỏng/hết hạn/hao hụt xuất qua phiếu sẽ KHÔNG vào báo cáo hao hụt** → sai kiểm toán (vi phạm nguyên tắc #3).

→ `postDocument` PHẢI map `doc.reason` (OUT) sang đúng `MovementReason` enum qua `outReasonOf(reason)`. Form Xuất dùng `OUT_REASONS` (đã có trong `lib/validation`). NHẬP giữ `IN → PURCHASE` (lý do nhập không phải loss).

### 3.5 An toàn tương tranh (race-safety) — bắt buộc mọi đường ghi sổ

Mọi action ghi sổ cái chạy trong `prisma.$transaction` interactive với:
- `pg_advisory_xact_lock(hashtext("<materialId>:<warehouseId>"))` cho từng slot,
- **các slot lock theo thứ tự `.sort()` xác định** (chống deadlock),
- **dedup slot trùng trong cùng 1 lần** bằng `Set` (PG advisory lock re-entrant → nếu không dedup, slot trùng bị đếm 2 lần),
- **recheck `current_stock` / on-hand SAU khi lock** cho mọi OUT/TRANSFER (chống tồn âm TOCTOU).

## 4. Phạm vi theo Phase

### Phase A — Document Engine (nền)
- Schema + migration: `Document`, `DocumentLine`, enum `DocType`/`DocStatus`, `StockMovement.documentId`, FK `voidedBy`.
- `lib/doc-codes.ts` (`nextDocCode`).
- `lib/actions/documents.ts`: `saveDraft` (object input, không động tồn), `postDocument` (DRAFT→POSTED, advisory lock + on-hand recheck cho OUT, `outReasonOf` cho OUT, guard quantity>0), `voidDocument` (bút toán đảo, guard trạng thái treo).
- `lib/actions/transfer-approve.ts`: `submitTransferForApproval`, `approveTransfer` (1 transferId/phiếu hoisted ngoài loop, sorted slot locks, **segregation of duties: người tạo không tự duyệt trừ khi OWNER**), `rejectTransfer`.
- `lib/queries/documents.ts`: `listDocuments`, `getDocument`.
- Bỏ regex mã kho; `docHeaderSchema`/`docLineSchema`.
- **Guard quan trọng:** `voidMovement` (đường cũ) chặn hủy lẻ dòng thuộc `documentId` (`if (mv.documentId) return error`) — tránh strand phiếu.

### Phase B — UI 4 menu phiếu
Component dùng chung: `DocStatusBadge`, `DocumentLineEditor`, `DocumentList`. Mỗi menu = list → phiếu (page/moi/[id]), **tất cả `export const dynamic = "force-dynamic"`**.
- **B1 Nhập** (`/nhap`): `ImportDocForm`, prop `suppliers` (Phase E thêm select NCC).
- **B2 Xuất** (`/xuat`): `ExportDocForm` dùng `OUT_REASONS`; engine map OUT reason→enum (xem 3.4).
- **B3 Chuyển kho** (`/chuyen-kho`): `TransferDocForm` 2 kho, gửi duyệt/duyệt/từ chối/hủy.
- **B4** Ô "Chuyển kho" ra Trang chính (`app/(app)/page.tsx`, lưới `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`).

### Phase C — Báo cáo nâng cao
- **C1** Lịch sử read-only (gỡ nút Hủy khỏi `history-table.tsx`; hủy chỉ qua phiếu).
- **C2** Xuất Excel: route `/api/bao-cao/excel` + `exceljs`, dùng chung `getBalanceReport`, `requireRole("OWNER")`.
- **C3** In phiếu A4: trang `/phieu/[id]/in` + `PrintButton` (`window.print()` + CSS `@media print`), nút In trên 3 form. Không lib PDF.
- **C4** Nhập tồn đầu kỳ: trang `/ton-dau-ky` (OWNER) + bảng vật tư×kho + `lib/actions/opening.ts` `createOpeningStock` (sinh phiếu "Tồn đầu kỳ"/kho qua sổ cái, dedup Set + sorted locks, **chặn ô đã có giao dịch race-safe** — count>0 throw trong tx sau lock). Dùng reason `PURCHASE` (đầu kỳ tính theo NGÀY trong balance, không theo reason; `Document.reason="Tồn đầu kỳ"` để nhận dạng — KHÔNG thêm enum OPENING).

### Phase D — Danh mục mã tự do
- Regex mã kho đã bỏ ở Phase A. Đổi nhãn nav "Vật liệu" → **"Danh mục"**. Đếm số thứ tự (STT) trong bảng danh mục.

### Phase E — Phân quyền + NCC + Xe/máy
- **E1 Phân quyền user:** `lib/queries/users.ts`, `lib/actions/users.ts` (`createUser` bcrypt.hash(...,10) + Zod + chặn trùng email; `updateUserRole` **chặn tự hạ quyền mình** `if (id===me.id && role!=="OWNER") return error`; `resetPassword` bcrypt). Tất cả `requireRole("OWNER")`. `components/user-manager.tsx`, `/nguoi-dung`, nav link.
- **E2 Nhà cung cấp:** model `Supplier` + migration, queries/actions/`supplier-manager`, `/nha-cung-cap`. Thêm select NCC vào `ImportDocForm` (prop `suppliers` + `supplierId` state); `nhap/moi`+`[id]` fetch `getSuppliers`.
- **E3 Xe/Máy:** model `Equipment` + `EquipmentLog` + migration, queries/actions/`equipment-manager`, `/xe-may`, nav. `logHours` dùng `requireUser()` (STAFF cũng ghi được), lưu `createdById`.

### Phase F — Tài liệu đối chiếu khách hàng
- Viết `docs/huong-dan-khach-hang.md` theo **đúng số mục client 1–6**, đánh dấu ✅ ĐÃ CÓ / 🆕 MỚI. Ghi chú Quỹ hoãn. **KHÔNG lộ tên field nội bộ** (createdById/createdByName…) ra tài liệu khách hàng.

## 5. Phân quyền (tóm tắt)
- `requireRole("OWNER")`: tạo/sửa user, reset mật khẩu, nhập tồn đầu kỳ, xuất Excel, duyệt chuyển kho (segregation), quản lý NCC/danh mục.
- `requireUser()` (STAFF + OWNER): lập phiếu nhập/xuất/chuyển (nháp+gửi), ghi nhật ký giờ xe/máy.
- TRANSFER: người tạo KHÔNG tự duyệt phiếu mình trừ khi là OWNER.

## 6. Verify (không có test framework)
typecheck + lint + build sạch; `prisma migrate status` up-to-date; psql kiểm view `current_stock`/`stock_by_material`/`loss_by_month`; **render thật authed** từng trang mới (login owner → curl → grep nội dung, 0 prisma error). Verify từ ARTIFACT, không tin self-report.

## 7. Lưu ý deploy
Migration mới (Document/DocumentLine Phase A, Supplier E2, Equipment E3, + các migration Phase B/C nếu có) chỉ áp Docker local (`.env` → localhost:5433). Neon (Vercel prod, `.env.local`) nhận qua `vercel-build` chạy `prisma migrate deploy` khi deploy. Build local nhặt `.env.local` (Neon) → mọi trang data MỚI phải `force-dynamic` để không prerender lúc build.

## 8. Bài học PHẢI tránh lặp (từ bản trước)
1. **transferId per-phiếu, KHÔNG per-line** (hoist ngoài loop) — bug code-review đã bắt.
2. **`voidMovement` chặn dòng thuộc Document** — nếu không, hủy lẻ strand phiếu (CRITICAL).
3. **Advisory lock phải `.sort()`** mọi nơi — thứ tự không xác định → deadlock.
4. **OUT reason→enum** (3.4) — nếu hardcode PROJECT, hao hụt qua phiếu xuất biến mất khỏi báo cáo (CRITICAL audit).
5. **Dedup slot trùng trong 1 lần (Set)** — advisory lock re-entrant → double-count (CRITICAL, C4).
6. **`force-dynamic`** mọi trang data → build không prerender bằng Neon.
7. **PUSH sau MỖI phase** — bản trước mất sạch vì để ~45 commit treo trong clone `/tmp` chưa push. KHÔNG lặp lại.

## 9. Trạng thái Phase
| Phase | Nội dung | Trạng thái |
|---|---|---|
| A | Document engine | ⬜ chưa dựng lại |
| B | UI 4 menu phiếu | ⬜ |
| C | Báo cáo Excel/in/tồn đầu kỳ | ⬜ |
| D | Danh mục mã tự do | ⬜ |
| E | Phân quyền + NCC + Xe/máy | ⬜ |
| F | Tài liệu đối chiếu | ⬜ |
