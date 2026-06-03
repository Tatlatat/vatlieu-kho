# Thiết kế: Quản lý đa kho (Multi-Warehouse) cho vatlieu-kho

**Ngày:** 2026-06-03
**Trạng thái:** Đã chốt hướng (Hướng 1), chờ chuyển sang kế hoạch triển khai.

## Triết lý ràng buộc (KHÔNG được vi phạm)

1. **Sổ cái bất biến (append-only):** `StockMovement` chỉ thêm dòng, không sửa/xóa. Hủy chứng từ = thêm bút toán đảo, không DELETE.
2. **Tồn kho luôn được TÍNH từ sổ cái** (`Σ IN − Σ OUT`), không lưu cứng ở đâu → không bao giờ lệch.
3. **Postgres-centric:** logic tồn/báo cáo nằm trong view/trigger Postgres, không nhồi vào tầng app.
4. **Thêm tối thiểu:** chỉ thêm cái cần; không đụng phần đang chạy đúng (auth, Material, Stocktake core).
5. **Gọn & dễ dùng cho người không chuyên:** tính năng mới phải ẩn/hiện hợp lý, mặc định giao diện không phức tạp hơn hiện tại. Chạy tốt trên local.

## Mục tiêu

Thêm chiều "Kho" vào toàn hệ thống để: quản lý nhiều kho, nhập/xuất theo kho, chuyển kho nội bộ, báo cáo cân đối Đầu kỳ–Nhập–Xuất–Tồn cuối theo kỳ & theo kho, và hủy chứng từ nhập sai/trùng. Đáp ứng đủ phản hồi khách hàng (mục 1–4) mà không phá kiến trúc hiện có.

---

## 1. Mô hình dữ liệu (Schema)

### Bảng mới: `Warehouse`
```prisma
model Warehouse {
  id        String          @id @default(cuid())
  name      String          // "Kho chính", "Kho công trình A"
  code      String          @unique // "KHO-CHINH"
  isDefault Boolean         @default(false) // đúng 1 kho mặc định
  createdAt DateTime        @default(now())
  movements StockMovement[]
}
```

### Sửa `StockMovement` — chỉ THÊM cột (không xóa):
```prisma
warehouseId  String        // kho của giao dịch (NOT NULL sau migration)
warehouse    Warehouse     @relation(fields: [warehouseId], references: [id])
transferId   String?       // nối cặp OUT↔IN của một lần chuyển kho
voidedAt     DateTime?     // thời điểm bị hủy (bút toán đảo)
voidedById   String?       // ai hủy
voidReversalOf String?     // nếu dòng này LÀ bút toán đảo, trỏ về movement gốc

@@index([warehouseId])
@@index([transferId])
```

### Sửa `StocktakeItem` — thêm cột:
```prisma
warehouseId String   // kiểm kê theo từng kho
```
> Lưu ý: một phiếu kiểm kê (`Stocktake`) thuộc 1 kho. Thêm `warehouseId` vào `Stocktake` (đơn giản hơn để mỗi phiếu kiểm 1 kho) — item kế thừa kho của phiếu. **Quyết định:** đặt `warehouseId` ở **`Stocktake`** (mỗi phiếu 1 kho), không lặp ở item.

```prisma
// Stocktake: thêm
warehouseId String
warehouse   Warehouse @relation(...)
```

### Mở rộng enum `MovementReason`:
```
TRANSFER_OUT   // chuyển kho - vế đi (ở kho nguồn)
TRANSFER_IN    // chuyển kho - vế đến (ở kho đích)
VOID           // bút toán đảo khi hủy chứng từ
```
Giữ nguyên các reason cũ (PURCHASE, PROJECT, DAMAGED, EXPIRED, NATURAL_LOSS, STOCKTAKE_ADJUST).

### Mở rộng enum `StocktakeStatus`:
```
DRAFT | APPROVED | VOIDED   // thêm VOIDED khi hủy phiếu kiểm kê đã duyệt
```

### Di trú dữ liệu cũ (migration)
1. Tạo bảng Warehouse.
2. Chèn 1 kho `{ name:"Kho chính", code:"KHO-CHINH", isDefault:true }`.
3. `UPDATE "StockMovement" SET warehouseId = (id Kho chính) WHERE warehouseId IS NULL`.
4. Gán `Stocktake.warehouseId` cũ = Kho chính.
5. Sau khi backfill xong, đặt cột `warehouseId` thành `NOT NULL`.
→ Tồn kho hiện tại KHÔNG đổi. Khách dùng tiếp ngay.

---

## 2. Logic Postgres (view & trigger)

### View `current_stock` → thêm chiều kho

**Cách xử lý hủy (làm rõ):** có 2 lựa chọn cùng cho kết quả tồn đúng, chọn cách đơn giản nhất để không trùng lặp:

- **Cách đã chọn — loại trừ ở view, không tạo dòng đảo vật lý cho phép tính tồn:** Khi hủy, đánh `voidedAt`/`voidedById` lên movement gốc. View tính tồn chỉ cần điều kiện `WHERE sm."voidedAt" IS NULL` → dòng đã hủy biến mất khỏi phép tính tồn, nhưng VẪN nằm trong sổ cái để nhật ký audit hiển thị "Đã hủy".
- Reason `VOID` và cột `voidReversalOf` vẫn được tạo như **một bút toán đảo hiển thị trong nhật ký** (để người dùng thấy rõ "đã có hành động hủy ngày X bởi Y"), NHƯNG dòng VOID này KHÔNG tính vào tồn (view loại `reason='VOID'`). Như vậy tồn chỉ phụ thuộc `voidedAt` của dòng gốc — một nguồn sự thật duy nhất, không lo cặp lệch.

→ Điều kiện view: `WHERE sm."voidedAt" IS NULL AND sm.reason <> 'VOID'`.
→ Tồn vẫn 100% tính từ sổ cái; "hủy" chỉ là cờ loại-trừ, giữ đúng triết lý bất biến.

```sql
CREATE OR REPLACE VIEW current_stock AS
SELECT
  m.id AS material_id, m.name, m.code, m.unit, m."minStock" AS min_stock,
  w.id AS warehouse_id, w.name AS warehouse_name,
  COALESCE(SUM(CASE sm.type WHEN 'IN' THEN sm.quantity WHEN 'OUT' THEN -sm.quantity ELSE 0 END),0) AS on_hand,
  CASE ... END AS status   -- logic OK/LOW/OUT giữ nguyên, theo tồn của cặp (material,warehouse)
FROM "Material" m
CROSS JOIN "Warehouse" w           -- để kho nào chưa có giao dịch vẫn hiện tồn 0 nếu cần
LEFT JOIN "StockMovement" sm
  ON sm."materialId" = m.id AND sm."warehouseId" = w.id
  AND sm."voidedAt" IS NULL AND sm.reason <> 'VOID'
GROUP BY m.id, m.name, m.code, m.unit, m."minStock", w.id, w.name;
```
> Tinh chỉnh: CROSS JOIN có thể tạo nhiều dòng tồn-0; ở tầng app/báo cáo sẽ lọc bỏ dòng on_hand=0 khi không cần. View tổng-hợp-theo-mã (mọi kho) = SUM thêm một bậc.

### View phụ: `stock_by_material` (tồn 1 mã trên TẤT CẢ kho) — phục vụ mục 4
```sql
CREATE OR REPLACE VIEW stock_by_material AS
SELECT material_id, name, code, unit, min_stock, SUM(on_hand) AS total_on_hand
FROM current_stock GROUP BY material_id, name, code, unit, min_stock;
```

### Trigger kiểm kê `fn_apply_stocktake_adjustments` → thêm warehouseId
Khi sinh `STOCKTAKE_ADJUST`, lấy `warehouseId` từ `Stocktake` của phiếu, gắn vào movement điều chỉnh. Logic còn lại giữ nguyên (idempotent qua status DRAFT→APPROVED).

### View `loss_by_month` → giữ nguyên ý nghĩa, thêm option lọc kho
Vẫn chỉ tính reason hao hụt (DAMAGED/EXPIRED/NATURAL_LOSS/STOCKTAKE_ADJUST). **Quan trọng:** TRANSFER_OUT/TRANSFER_IN/VOID **KHÔNG** được tính là hao hụt (chuyển kho không phải mất hàng). Thêm `warehouse_id` vào view để báo cáo lọc theo kho.

---

## 3. Luồng nghiệp vụ

### Nhập hàng (mục 2)
- Thêm trường **Kho** (chọn kho nhận hàng; mặc định = Kho chính).
- Hiển thị **đơn vị tính** cạnh ô số lượng (chỉ đọc, lấy từ Material đã chọn).
- Ô **chọn mã vật tư có bộ lọc tìm nhanh** (gõ để lọc theo tên/mã).
- Lưu: 1 `StockMovement` type=IN, reason=PURCHASE, warehouseId đã chọn.

### Xuất hàng (mục 3)
- Thêm trường **Kho** (chọn kho xuất; kiểm tra tồn của (mã × kho) trước khi xuất).
- Hiển thị đơn vị tính (chỉ đọc) + bộ lọc tìm mã nhanh (như nhập).
- Lưu: 1 `StockMovement` type=OUT, reason theo lý do, warehouseId đã chọn.

### Chuyển kho (mục 3) — loại giao dịch riêng
- Form: chọn **Mã vật tư**, **Kho nguồn**, **Kho đích**, **Số lượng**, ghi chú.
- Ràng buộc: kho nguồn ≠ kho đích; số lượng ≤ tồn của (mã × kho nguồn).
- Lưu **2 movement cùng `transferId`** trong 1 transaction:
  - OUT ở kho nguồn, reason=TRANSFER_OUT.
  - IN ở kho đích, reason=TRANSFER_IN.
- Tổng tồn toàn công ty KHÔNG đổi (cân bằng). Báo cáo phân biệt được nhờ reason.

### Hủy chứng từ (mục 4) — bút toán đảo
- Áp dụng cho movement nhập/xuất và phiếu kiểm kê.
- Quyền: chỉ OWNER. Bắt buộc nhập **lý do hủy**.
- Cơ chế:
  - Đánh `voidedAt`, `voidedById` lên (các) movement gốc.
  - Tạo movement đảo: ngược type (IN↔OUT), cùng quantity/material/warehouse, reason=VOID, `voidReversalOf` = id gốc, note = lý do hủy.
  - Với chuyển kho: hủy cả CẶP transfer (cả 2 vế).
  - Với phiếu kiểm kê đã duyệt: đảo (các) STOCKTAKE_ADJUST mà nó sinh ra; đánh dấu phiếu là VOIDED (thêm status hoặc cờ).
- Tồn tự đúng lại (vì view loại trừ cặp void). Nhật ký vẫn lưu dấu vết đầy đủ.

---

## 4. Báo cáo (mục 4) — giá trị cao nhất

### 4.1 Bộ lọc thời gian
- Thêm chọn **Từ ngày – Đến ngày** (mặc định: tháng hiện tại).
- Thêm chọn **Kho**: "Tất cả kho" hoặc 1 kho cụ thể.

### 4.2 Bảng cân đối Đầu kỳ – Nhập – Xuất – Tồn cuối (theo kho)
Mỗi dòng = 1 mã vật tư. Cột:
- **Đầu kỳ** = Σ(IN−OUT) của mọi movement TRƯỚC "từ ngày" (trong phạm vi kho đã chọn), loại trừ void.
- **Nhập trong kỳ** = Σ IN (reason mua/nhập, KHÔNG gồm TRANSFER_IN) trong kỳ.
- **Xuất trong kỳ** = Σ OUT (KHÔNG gồm TRANSFER_OUT) trong kỳ.
- **Tồn cuối** = Đầu kỳ + Nhập + (Chuyển đến) − Xuất − (Chuyển đi).

**Cột "Chuyển kho" ẩn mặc định** (quyết định của user):
- Mặc định bảng chỉ 4 cột: Đầu kỳ, Nhập, Xuất, Tồn cuối → gọn như hiện tại.
- Nút **"Hiện chuyển kho"** → thêm 2 cột: **Chuyển đến** (Σ TRANSFER_IN trong kỳ) và **Chuyển đi** (Σ TRANSFER_OUT trong kỳ). Tắt thì bảng thu lại.
- Công thức cân đối khi bật vẫn đúng & "cân" được.

### 4.3 Drill-down: click mã → nhật ký chi tiết theo ngày
- Click (hoặc tick) một mã trong bảng cân đối → mở danh sách **mọi movement** của mã đó trong kỳ + kho đã chọn, sắp theo ngày: ngày | loại (Nhập/Xuất/Chuyển/Điều chỉnh/Hủy) | kho | số lượng | tồn lũy kế | ghi chú | người tạo.
- Dòng đã hủy hiển thị gạch ngang + nhãn "Đã hủy"; bút toán đảo hiển thị nhãn "Bút toán hủy".

### 4.4 Báo cáo theo mã trên TẤT CẢ kho (mục 4 sau)
- Dùng view `stock_by_material`: bảng tổng tồn mỗi mã gộp mọi kho.
- Khi chọn "Tất cả kho" ở 4.1, bảng cân đối cũng tổng hợp xuyên kho.

---

## 5. UI/UX — nguyên tắc "thêm mà vẫn gọn"

| Khu vực | Thêm gì | Cách giữ gọn |
|---|---|---|
| **Danh mục** | (a) Mục quản lý **Kho** (thêm/sửa kho). (b) Hiển thị **đếm số lượng mã vật tư** (badge tổng số mã). | Kho là một thẻ/khu riêng trong trang Danh mục; số đếm chỉ là 1 dòng thống kê nhỏ. |
| **Nhập / Xuất** | Trường Kho (select, mặc định Kho chính); đơn vị hiển thị cạnh ô số lượng; bộ lọc tìm mã trong dropdown. | Kho mặc định sẵn → người dùng không phải chọn nếu chỉ 1 kho. Đơn vị chỉ đọc. Bộ lọc = ô search trong dropdown đã có. |
| **Chuyển kho** | Mục/nút "Chuyển kho" mới. | Đặt cùng nhóm thao tác kho; form ngắn (mã, nguồn, đích, số lượng). Chỉ hiện khi có ≥2 kho. |
| **Báo cáo** | Lọc ngày + chọn kho; bảng cân đối; nút hiện chuyển kho; drill-down. | Cột chuyển kho ẩn mặc định. Drill-down mở inline/expand, không rời trang. |
| **Hủy chứng từ** | Nút "Hủy" trên dòng chứng từ (lịch sử/kiểm kê), chỉ OWNER. | Ẩn với STAFF. Có xác nhận + bắt nhập lý do để tránh bấm nhầm. |

**"Chỉ hiện khi cần":** Các tính năng đa-kho (chọn kho ở form, nút chuyển kho) chỉ thực sự nổi bật khi DN tạo kho thứ 2. DN dùng 1 kho thì giao diện gần như y hệt hiện tại.

---

## 6. Phân quyền
- **STAFF:** nhập, xuất, chuyển kho, tạo phiếu kiểm kê (như hiện tại + kho).
- **OWNER:** thêm tất cả của STAFF + quản lý kho (danh mục), xem báo cáo, **hủy chứng từ**.
- Middleware giữ nguyên cơ chế; thêm route mới vào danh sách bảo vệ theo vai trò.

## 7. Xử lý lỗi & ràng buộc toàn vẹn
- CHECK constraint `quantity > 0` giữ nguyên.
- Chuyển kho/ xuất: validate tồn (mã × kho nguồn) ≥ số lượng tại thời điểm submit (đọc qua view).
- Hủy: không cho hủy 2 lần (kiểm tra voidedAt đã set chưa). Không cho hủy 1 vế transfer lẻ (hủy cả cặp).
- Mọi server action giữ `requireUser/requireRole` + validate Zod như hiện tại.

## 8. Phạm vi loại trừ (YAGNI — KHÔNG làm)
- KHÔNG quy đổi đơn vị (chỉ hiển thị đơn vị cố định của Material).
- KHÔNG kho phân cấp (zone/bin).
- KHÔNG theo dõi giá trị tiền (đúng ghi chú khách: "chỉ theo dõi số lượng, giá trị bổ sung sau").
- KHÔNG multi-tenant.

## 9. Kiểm thử (định hướng)
- Migration: dữ liệu cũ gán Kho chính, tồn không đổi (so trước/sau).
- Tồn theo kho: nhập A, xuất A, kiểm tra view đúng từng kho + tổng.
- Chuyển kho: tổng toàn công ty bất biến; báo cáo không tính là nhập/xuất thường.
- Hủy chứng từ: tồn quay về đúng; nhật ký vẫn còn dấu vết; không hủy được 2 lần.
- Báo cáo kỳ: Đầu kỳ + Nhập + Chuyển đến − Xuất − Chuyển đi = Tồn cuối (luôn cân).
- Phân quyền: STAFF không thấy nút hủy/quản lý kho.
