# AGY TASK — REVIEW phần QUỸ (chỉ TÌM LỖI, KHÔNG sửa code)

Nhiệm vụ: đọc kỹ các file phần Quỹ dưới đây, TÌM lỗi (logic kế toán, bug UI, edge case, bảo mật, type). KHÔNG sửa code — chỉ liệt kê lỗi tìm được kèm: file, dòng, mô tả lỗi, kịch bản gây lỗi. Nếu không có lỗi nào ở một mục thì ghi "OK".

## File cần review

**Backend (logic kế toán — soi kỹ nhất):**
- `lib/actions/cash.ts` — createCashEntry (ghi sổ, cảnh báo quỹ âm), voidCashEntry (đánh dấu void)
- `lib/actions/funds.ts` — CRUD quỹ (chặn xóa nếu có giao dịch)
- `lib/queries/cash.ts` — đọc view fund_balance, listCashEntries, getCashReport
- `prisma/migrations/20260605120000_cash_fund/migration.sql` — bảng Fund, CashEntry, view fund_balance, CHECK amount>0
- `lib/validation.ts` (phần cuối: CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, cashEntrySchema, fundSchema)

**UI:**
- `app/(app)/quy/page.tsx`, `app/(app)/quy/moi/page.tsx`, `app/(app)/quy/danh-muc/page.tsx`
- `components/cash-entry-form.tsx` (form Thu/Chi, format tiền)
- `components/cash-ledger.tsx` (bảng + nút Hủy)
- `components/fund-manager.tsx` (CRUD quỹ)
- `components/cash-filter.tsx`
- `app/api/quy/excel/route.ts`

## Các điểm CẦN soi kỹ (checklist)

1. **Kế toán tồn quỹ:** view fund_balance tính `Σ(THU) − Σ(CHI)` loại voided. Kiểm: void có làm sai tồn không? Có chỗ nào tính trùng/sót không?
2. **void KHÔNG tạo bút toán đảo** (chỉ đánh dấu voidedAt). Kiểm logic này có đúng không, double-void có bị chặn không.
3. **Số tiền:** dùng Decimal(15,0). Form nhập format nghìn (cash-entry-form). Kiểm parse số tiền có sai khi có dấu chấm phân cách không. amount âm/0 có bị chặn không (validation + CHECK).
4. **Phân quyền:** createCashEntry/voidCashEntry = requireUser (STAFF+OWNER). CRUD fund = requireRole OWNER. Kiểm có rò rỉ quyền không.
5. **Hạng mục theo loại:** THU dùng CASH_IN_CATEGORIES, CHI dùng CASH_OUT_CATEGORIES. cashEntrySchema refine khớp loại. Kiểm form đổi loại có reset hạng mục đúng không.
6. **Edge case:** quỹ chưa có → trang /quy xử lý sao? Ngày tương lai có bị chặn? Xóa quỹ đang có giao dịch có bị chặn? Race (2 phiếu cùng quỹ)?
7. **UI:** nút bấm có hoạt động? Dialog mở/đóng đúng? Hiển thị tồn âm (màu đỏ)? Bút toán đã hủy (gạch mờ)?
8. **Type/lint:** có `any`, thiếu null-guard, key trùng trong map không?

## Output yêu cầu
Liệt kê lỗi theo mức độ (🔴 nghiêm trọng / 🟠 vừa / 🟡 nhỏ), mỗi lỗi: file:dòng — mô tả — cách tái hiện. Cuối cùng ghi "ĐÃ REVIEW XONG QUỸ". KHÔNG sửa file nào.
