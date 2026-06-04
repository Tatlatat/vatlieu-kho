# AGY SPEC — Phase C (phần UI): In phiếu A4 + Trang tồn đầu kỳ

> Bạn (agy) CHỈ viết component React + page Next.js + CSS. KHÔNG sửa: schema.prisma, migration, .env, auth.ts, package.json, lib/actions/*, lib/queries/*, route api. Logic đã có sẵn — chỉ DÙNG.

## Đã có sẵn (DÙNG, không viết lại)
- `lib/queries/documents.ts`: `getDocument(id)` → phiếu + `lines[].material{name,code,unit}`, `warehouse{name,code}`, `fromWarehouse`, `toWarehouse`, `supplier{name}`, `createdBy{name}`, `approvedBy{name}`, các trường `code,type,status,docDate,reason,note`.
- `lib/actions/opening.ts`: `createOpeningStock(entries)` với `entries: {materialId, warehouseId, quantity}[]`. Trả `{ok, error?}`. (Đây là server action — import và gọi trực tiếp từ client qua form.)
- `lib/queries/stock.ts`: `getMaterials()` → `{id,name,code,unit}[]`.
- `lib/queries/warehouses.ts`: `getWarehouses()` → `{id,name,code,isDefault}[]`.
- `@/components/searchable-material-select`, `@/components/warehouse-select`, ui primitives, `toast` từ sonner.

---

## PHẦN 1 — C3: In phiếu A4

### `components/print-button.tsx`
Client component `PrintButton`. Render `<Button>` "In phiếu" gọi `window.print()` onClick. Prop optional `label?: string` (mặc định "In phiếu").

### `app/(app)/phieu/[id]/in/page.tsx`
- `export const dynamic = "force-dynamic";` ở đầu.
- Server component. `params` là `Promise<{id:string}>` → `const { id } = await params;`.
- Gọi `getDocument(id)`; null → `notFound()`.
- Render layout A4 in được: tiêu đề công ty "KHO VẬT LIỆU", tên phiếu theo type (IN=PHIẾU NHẬP KHO, OUT=PHIẾU XUẤT KHO, TRANSFER=PHIẾU CHUYỂN KHO, STOCKTAKE=PHIẾU KIỂM KÊ), mã phiếu, ngày (docDate format dd/MM/yyyy), kho (hoặc nguồn→đích cho TRANSFER), nhà cung cấp (nếu có), bảng dòng (STT | Mã | Tên vật tư | ĐVT | Số lượng | Ghi chú), ghi chú phiếu, 2 ô chữ ký cuối ("Người lập" + "Người duyệt").
- Có `<PrintButton />` ở góc trên (ngoài vùng in).
- **CSS in A4**: tạo file `app/(app)/phieu/[id]/in/print.css` HOẶC dùng `<style>` inline với `@media print`:
  - `@media print { .no-print { display: none; } @page { size: A4; margin: 1.5cm; } body { ... } }`
  - Nút In + nav phải có class `no-print` để KHÔNG hiện khi in.
- Trang này nằm trong layout `(app)` nên có nav — bọc nav-area bằng cách: đặt nội dung phiếu trong 1 container, nút In + mọi thứ thừa class `no-print`. (Không cần ẩn nav nếu khó — tối thiểu ẩn nút In khi in, và phiếu in gọn trên 1 trang A4.)

### Thêm nút "In" vào các form chi tiết (mở trang in)
Trong `components/document-detail-actions.tsx` (ĐÃ CÓ từ Phase B — chỉ THÊM, đừng xóa logic cũ): thêm 1 nút/link "In phiếu" trỏ tới `/phieu/${id}/in` (mở tab mới: `<a href={...} target="_blank">`). Chỉ hiện khi status !== "DRAFT" (phiếu đã lập/chờ duyệt mới in).

---

## PHẦN 2 — C4-UI: Trang nhập tồn đầu kỳ

### `components/opening-stock-form.tsx`
Client component `OpeningStockForm`. Props: `{ materials: {id,name,code,unit}[]; warehouses: {id,name,code,isDefault}[] }`.
- Cho người dùng nhập nhiều dòng tồn đầu kỳ. Mỗi dòng: chọn KHO (WarehouseSelect) + chọn VẬT TƯ (SearchableMaterialSelect) + số lượng (Input number) + nút xóa dòng.
- Nút "+ Thêm dòng" (giống DocumentLineEditor pattern — KEY mỗi dòng dùng `crypto.randomUUID()` tạo trong event handler, KHÔNG Math.random trong render, KHÔNG useEffect+setState để init; dùng lazy initializer `useState(() => [...])`).
- Nút "Lưu tồn đầu kỳ" → gom các dòng hợp lệ thành `entries: {materialId, warehouseId, quantity:Number}[]` rồi gọi `createOpeningStock(entries)`.
- `useTransition`; toast thành công ("Đã lưu tồn đầu kỳ") / lỗi (hiện `res.error`); nếu ok → `router.push("/")`.
- Ghi rõ dòng hướng dẫn ngắn: "Chỉ dùng khi bắt đầu sử dụng phần mềm. Mỗi vật tư × kho chỉ đặt được 1 lần; ô đã có giao dịch sẽ bị từ chối."

### `app/(app)/ton-dau-ky/page.tsx`
```tsx
export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { OpeningStockForm } from "@/components/opening-stock-form";

export default async function TonDauKyPage() {
  await requireRole("OWNER"); // chỉ chủ được nhập tồn đầu kỳ
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold mb-1">Nhập tồn đầu kỳ</h1>
      <OpeningStockForm materials={materials} warehouses={warehouses} />
    </div>
  );
}
```

---

## QUAN TRỌNG
- Tiếng Việt toàn bộ.
- KHÔNG thêm package mới (exceljs đã có, đừng đụng package.json).
- KHÔNG `Math.random()` khi render; KHÔNG `useEffect`+`setState` để khởi tạo state (dùng lazy initializer `useState(() => ...)`).
- Mọi page data: `export const dynamic = "force-dynamic";` dòng đầu.
- Next 16: `params` trang `[id]` là Promise → `await`.
- Xong thì liệt kê đầy đủ file đã tạo/sửa.
