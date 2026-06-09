# Thiết kế: Quỹ (Thu – Chi – Tồn) — Bổ sung 2 mục 6

> **Ghi chú lịch sử:** spec này được viết trong quá trình thiết kế module Quỹ. Một
> số câu có thể còn dùng thuật ngữ/quyền cũ tại thời điểm viết. Hiện trạng thật về
> role/guard/menu phải đọc từ `docs/COLLAB-SOURCE-OF-TRUTH.md`, `lib/auth-helpers.ts`,
> `proxy.ts`, và code route/action hiện tại.

**Goal:** Thêm subsystem theo dõi tiền mặt theo công trường: lập phiếu Thu/Chi, xem tồn quỹ, báo cáo, đúng chuẩn kế toán (bất biến sổ cái, không tồn âm ngầm).

**Kiến trúc:** Mô phỏng đúng kiến trúc kho đa-warehouse hiện có để nhất quán. Quỹ độc lập hoàn toàn với nghiệp vụ kho (không tự sinh từ phiếu nhập/xuất, không đụng đơn giá/giá trị).

**Tech stack:** Next.js 16 App Router, Prisma 6 + PostgreSQL (Supabase), Decimal cho tiền, NextAuth (requireUser/requireRole), ExcelJS, base-ui.

---

## 1. Quyết định nghiệp vụ (đã chốt với client)

| Vấn đề | Quyết định |
|---|---|
| Phạm vi | Nhiều quỹ theo công trường (giống đa-warehouse). Mỗi quỹ tồn riêng. |
| Liên kết kho | ĐỘC LẬP hoàn toàn. Sổ quỹ ghi tay, không tự sinh từ phiếu kho. |
| Phân loại | Danh mục hạng mục cố định (THU/CHI), giống "lý do nhập/xuất". |
| Quy trình | Lập → ghi sổ NGAY (đổi tồn), không có duyệt. STAFF+OWNER lập được. |
| Tồn quỹ âm | CHO ghi nhưng CẢNH BÁO (không chặn). Thực tế công trường chi trước-thu sau. |
| Sửa sai | HỦY (bút toán đảo, giữ lịch sử) — KHÔNG xóa. Giống voidDocument. |

## 2. Mô hình dữ liệu

### Bảng `Fund` (danh mục quỹ) — giống Warehouse
- `id` (cuid), `name` (string), `code` (string, unique), `note` (string?), `isActive` (bool, default true), `createdAt`.
- Back-relation: `entries CashEntry[]`.

### Bảng `CashEntry` (sổ cái tiền, BẤT BIẾN append-only) — giống StockMovement
- `id` (cuid)
- `fundId` (FK → Fund)
- `type` (enum `CashType`: THU | CHI)
- `category` (string — nhãn hạng mục cố định, vd "MUA_VAT_TU")
- `amount` (`Decimal @db.Decimal(15,0)` — VND không lẻ, >0 luôn)
- `entryDate` (DateTime — ngày phiếu)
- `note` (string?)
- `createdById` (FK → User), `createdAt`
- `voidedAt` (DateTime?), `voidedById` (FK → User?), `voidReason` (string?)
- (KHÔNG có voidReversalOf — quỹ dùng cơ chế đánh-dấu-void, không tạo bút toán đảo. Xem §3.)
- Index: `@@index([fundId, entryDate])`, `@@index([type])`, `@@index([createdAt])`.

### Enum `CashType` { THU, CHI }

### VIEW `fund_balance` (tồn quỹ tự tính — giống current_stock)
```sql
CREATE OR REPLACE VIEW fund_balance AS
SELECT
  f.id   AS fund_id,
  f.name AS fund_name,
  f.code AS fund_code,
  COALESCE(SUM(CASE WHEN c.type='THU' THEN c.amount WHEN c.type='CHI' THEN -c.amount ELSE 0 END), 0) AS balance
FROM "Fund" f
LEFT JOIN "CashEntry" c ON c."fundId" = f.id AND c."voidedAt" IS NULL
GROUP BY f.id, f.name, f.code;
```
- CHECK constraint: `amount > 0`.

### Danh mục hạng mục (validation.ts — nhãn cố định)
```ts
export const CASH_IN_CATEGORIES = [
  { value: "CAPITAL", label: "Ứng vốn" },
  { value: "DEBT_COLLECT", label: "Thu nợ / thu hồi" },
  { value: "REFUND_ADVANCE", label: "Hoàn ứng" },
  { value: "OTHER_IN", label: "Khác" },
];
export const CASH_OUT_CATEGORIES = [
  { value: "BUY_MATERIAL", label: "Mua vật tư" },
  { value: "LABOR", label: "Nhân công" },
  { value: "EQUIPMENT", label: "Xe/máy (xăng dầu, sửa chữa)" },
  { value: "MEALS", label: "Ăn uống / sinh hoạt" },
  { value: "ADVANCE", label: "Tạm ứng" },
  { value: "OTHER_OUT", label: "Khác" },
];
// Gộp value→label của cả CASH_IN_CATEGORIES + CASH_OUT_CATEGORIES để hiển thị nhãn ở bảng/báo cáo.
export const CASH_CATEGORY_LABELS: Record<string,string> =
  Object.fromEntries([...CASH_IN_CATEGORIES, ...CASH_OUT_CATEGORIES].map(c => [c.value, c.label]));
```

## 3. Server Actions (lib/actions/cash.ts)

- `createCashEntry(input)`: requireUser; validate (fundId, type, category hợp lệ theo type, amount>0, entryDate không tương lai); transaction + advisory lock theo fundId; tạo CashEntry; nếu CHI làm tồn âm → trả về `{ ok:true, warning:"Quỹ âm..." }` (vẫn ghi). revalidatePath("/quy").
- `voidCashEntry(id, reason)`: requireUser; chỉ hủy entry chưa void; transaction + lock fundId; **CHỈ đánh dấu** `voidedAt`/`voidedById`/`voidReason` trên entry gốc — KHÔNG tạo bút toán đảo. (Lý do kế toán: view `fund_balance` đã loại `voidedAt IS NULL`, nên đánh dấu void là đủ để loại khỏi tồn. Tạo thêm entry đảo sẽ TRỪ HAI LẦN = sai. Khác cách kho: kho dùng view tính TẤT-CẢ nên cần đảo; quỹ dùng view loại-voided nên chỉ cần đánh dấu.) Lịch sử vẫn giữ (entry gốc còn nguyên, chỉ hiển thị gạch mờ).
- Danh mục Fund (lib/actions/funds.ts): createFund/updateFund (requireRole OWNER), deleteFund (chặn nếu có CashEntry — giống deleteSupplier).

## 4. Queries (lib/queries/cash.ts)
- `getFunds()`: list quỹ active.
- `getFundBalance(fundId?)`: đọc view fund_balance.
- `listCashEntries(fundId, from, to)`: bút toán theo quỹ + khoảng ngày, orderBy entryDate desc, include createdBy.name.
- `getCashReport(fundId, from, to)`: tổng THU, tổng CHI, tồn, nhóm theo category. Promise.all để nhanh.

## 5. UI
- **Nav:** thêm "Quỹ" (icon Wallet), roles OWNER+STAFF.
- **`/quy`** (sổ quỹ): lọc quỹ + ngày; thẻ tồn quỹ (xanh dương/đỏ âm); bảng bút toán (ngày/loại/hạng mục/số tiền/diễn giải/người lập/trạng thái, void = gạch mờ); nút "Lập phiếu Thu/Chi".
- **`/quy/moi`**: form lập phiếu — chọn quỹ, THU/CHI (đổi danh sách hạng mục theo loại), hạng mục (Select), số tiền (format nghìn), ngày (date, max hôm nay), diễn giải. Submit hiện cảnh báo nếu quỹ âm.
- **`/quy/danh-muc`** (OWNER): quản lý Fund (tạo/sửa, chặn xóa nếu có giao dịch).
- **Báo cáo** (trong /quy hoặc /quy/bao-cao): tổng Thu/Chi/Tồn theo khoảng ngày, nhóm hạng mục; nút Tải Excel (tái dùng pattern /api/bao-cao/excel).

## 6. Phi chức năng (theo goal: mượt, không lỗi)
- **Kế toán:** sổ cái bất biến (append-only + void đảo, không xóa/sửa amount); tồn tính từ view (không lưu cứng); Decimal không Float; advisory lock chống race; recheck void không cho hủy bút toán đảo.
- **Tốc độ:** query song song; view fund_balance 1 query; index (fundId,entryDate); region sin1.
- **Migration:** tạo bảng + enum + view + CHECK trong 1 migration SQL (idempotent CREATE OR REPLACE), tự chạy qua `prisma migrate deploy` (KHÔNG dùng file SQL rời — bài học nợ kỹ thuật).

## 7. Kiểm thử (verify thật, không tin build)
- DB test: tạo THU 10tr + CHI 3tr → fund_balance = 7tr; void CHI → balance = 10tr; CHI 20tr (âm) → vẫn ghi + cảnh báo; xóa Fund có entry → bị chặn.
- Render thật: /quy load, form hiện đủ field, lập phiếu E2E → bút toán vào DB + tồn đổi.
- Verify trên production (không chỉ local).

## 8. Ngoài phạm vi (YAGNI)
- Không liên kết tự động phiếu kho ↔ quỹ.
- Không đơn giá/giá trị vật tư (kế toán giá trị — phase khác).
- Không chuyển tiền giữa các quỹ (có thể thêm sau bằng cặp CHI+THU).
- Không duyệt phiếu thu/chi.
