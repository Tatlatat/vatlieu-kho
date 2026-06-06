# Thiết kế — Tra cứu MST tự động cho NCC

**Ngày:** 2026-06-06
**Trạng thái:** Đã duyệt brainstorm, chờ viết plan
**Người duyệt:** hungdotmn@gmail.com
**Branch:** `feat/project-truc`
**Nguồn:** Client BỔ SUNG #1e+ ("nhập mã số thuế xong PM tự động lấy thông tin Cty").

---

## 1. Mục tiêu
Khi tạo/sửa NCC: gõ Mã số thuế xong → tự tra cứu (VietQR API) → điền Tên + Địa chỉ
công ty vào form. Vẫn cho sửa tay. Lỗi/không tìm thấy → báo nhẹ, nhập tay.

### Tiêu chí THÀNH CÔNG
- Gõ MST hợp lệ + rời ô (blur) → tự gọi tra cứu, điền Tên + Địa chỉ (nếu ô trống).
- MST không tồn tại / API lỗi → toast nhẹ, KHÔNG chặn, nhập tay được.
- Không ghi đè Tên user đã gõ (chỉ điền khi ô trống).
- Gọi API qua BACKEND (server action), không trực tiếp từ browser.

## 2. API (đã verify thật)
- `GET https://api.vietqr.io/v2/business/<mst>` — FREE, KHÔNG cần API key.
- Trả JSON: `{ "code": "00", "data": { "name", "address", "shortName", "status", ... } }`.
- `code === "00"` = thành công; khác (vd "51") = không tìm thấy/ lỗi.
- Verify: MST 0100112437 → "NGÂN HÀNG ... NGOẠI THƯƠNG VIỆT NAM" + địa chỉ;
  MST 0101243150 → "CÔNG TY CỔ PHẦN MISA" + địa chỉ. Đều OK.

## 3. Kiến trúc

### 3.1 Server action: `lib/actions/tax-lookup.ts`
```
export async function lookupTaxCode(mst: string):
  Promise<{ ok: true; name: string; address: string } | { ok: false; error?: string }>
```
- Validate MST: chỉ gồm chữ số, độ dài 10 hoặc 13 (chuẩn MST VN). Sai → {ok:false}.
- fetch VietQR với timeout 8s (AbortController). Lỗi mạng/timeout → {ok:false}.
- code === "00" và có data.name → {ok:true, name, address}. Khác → {ok:false}.
- KHÔNG ném lỗi (luôn trả object) — để UI xử lý mềm.
- "use server".

### 3.2 UI: `components/supplier-manager.tsx`
- Ô "Mã số thuế" thêm `onBlur`: nếu MST hợp lệ (regex 10/13 số) → gọi lookupTaxCode.
- Dùng `useTransition` (isPending) → hiện "Đang tra cứu..." nhỏ cạnh ô MST.
- Kết quả ok:
  - điền ô Tên NCC NẾU ô Tên đang TRỐNG (không ghi đè user gõ).
  - điền ô Địa chỉ NẾU ô Địa chỉ đang trống.
  - toast.success("Đã lấy thông tin từ mã số thuế").
- Kết quả fail: toast nhẹ ("Không tra được thông tin, vui lòng nhập tay") — KHÔNG chặn.
- Áp cho CẢ form Thêm và form Sửa.
- ĐIỀN GIÁ TRỊ: form hiện dùng uncontrolled (FormData/defaultValue). Để KHÔNG
  refactor cả form, dùng **useRef** cho ô Tên + Địa chỉ (form Thêm và Sửa). Khi tra
  OK: nếu `nameRef.current.value` trống → set `nameRef.current.value = name`; tương
  tự addressRef. Giữ uncontrolled, chỉ set .value qua ref khi cần.

## 4. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| MST chưa đủ số / có chữ | onBlur KHÔNG gọi API (im lặng) |
| API timeout (>8s) / lỗi mạng | {ok:false} → toast "Không tra được, nhập tay" |
| MST không tồn tại (code != 00) | toast nhẹ, để trống cho nhập tay |
| Tra OK nhưng ô Tên đã có | KHÔNG ghi đè Tên (chỉ điền ô trống); điền Địa chỉ nếu trống |
| Tra OK | điền + toast success, vẫn cho sửa |

## 5. An toàn & phạm vi
- Không lưu thêm field DB (taxCode/address đã có). Chỉ là tiện ích auto-fill form.
- Không cache, không tra ngành nghề/trạng thái (chỉ name + address).
- Không khóa ô sau khi điền (user sửa được).

## 6. Phạm vi (YAGNI)
✅ Server action tra VietQR + auto-fill name/address khi blur MST (form Thêm + Sửa).
❌ Cache kết quả. ❌ Thêm field DB. ❌ Tra ngành nghề/đại diện pháp luật.
❌ Nút "Tra cứu" thủ công (đã chốt: tự động khi blur).

## 7. Câu hỏi nghiệp vụ — ĐÃ CHỐT
- Tự động tra khi blur ô MST (không cần nút bấm).
- Qua backend (server action).
- Chỉ điền khi ô đang trống (không ghi đè user gõ).
- VietQR API (free, no key).
