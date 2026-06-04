# AGY SPEC — Phase B: UI 4 menu phiếu chứng từ

> Bạn (agy) chỉ viết **component React + page Next.js**. KHÔNG sửa: schema.prisma, migration, .env, auth.ts, package.json, lib/actions/*, lib/queries/* (đã có sẵn). KHÔNG chạy migration/build. Chỉ tạo/sửa các file UI liệt kê dưới đây.

## Bối cảnh đã có sẵn (KHÔNG viết lại, chỉ DÙNG)

Server actions (đã có, import từ đây):
- `lib/actions/documents.ts`: `saveDraft(input)`, `postDocument(id)`, `voidDocument(id, reason)`
  - `saveDraft` nhận OBJECT (không FormData): `{ type, warehouseId?, fromWarehouseId?, toWarehouseId?, supplierId?, reason?, note?, lines: [{materialId, quantity, note?}] }`. Trả `{ ok, error?, id? }`.
  - `postDocument(id)` / `voidDocument(id, reason)` trả `{ ok, error? }`.
- `lib/actions/transfer-approve.ts`: `submitTransferForApproval(id)`, `approveTransfer(id)`, `rejectTransfer(id)`. Trả `{ ok, error? }`.
- `lib/queries/documents.ts`: `listDocuments(type)`, `getDocument(id)`.
- `lib/queries/stock.ts`: `getMaterials()` → `{id,name,code,unit}[]`.
- `lib/queries/warehouses.ts`: `getWarehouses()` → `{id,name,code,isDefault}[]`.
- `lib/validation.ts`: hằng `OUT_REASONS` = `[{value,label}]` (4 lý do xuất), `REASON_LABELS`.

Component dùng lại (đã có):
- `@/components/searchable-material-select` → `<SearchableMaterialSelect materials name value onChange />` (Combobox gõ tìm được — DÙNG cái này cho chọn vật tư, ĐỪNG tự làm select khác).
- `@/components/warehouse-select` → `<WarehouseSelect warehouses name value onChange placeholder? />`.
- UI primitives: `@/components/ui/{button,input,label,card,select,badge,table,dialog}`.
- `toast` từ `sonner`.

## CÁC FILE PHẢI TẠO

### 1. `components/status-badge-doc.tsx`
Client component `DocStatusBadge`. Prop `status: "DRAFT"|"PENDING"|"POSTED"|"VOIDED"`. Render `<span>` (hoặc Badge) với nhãn tiếng Việt + màu:
- DRAFT → "Nháp" (xám: bg-slate-100 text-slate-700)
- PENDING → "Chờ duyệt" (vàng: bg-amber-100 text-amber-700)
- POSTED → "Đã lập" (xanh lá: bg-green-100 text-green-700)
- VOIDED → "Đã hủy" (đỏ gạch ngang: bg-red-100 text-red-700)
Class chung: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`.

### 2. `components/document-line-editor.tsx`
Client component `DocumentLineEditor` — bảng nhiều dòng để nhập vật tư + số lượng.
Props:
```ts
{
  materials: {id,name,code,unit}[];
  lines: { materialId: string; quantity: string; note?: string }[];
  onChange: (lines: {materialId:string; quantity:string; note?:string}[]) => void;
  disabled?: boolean;
}
```
Hành vi:
- Mỗi dòng: 1 `SearchableMaterialSelect` (chọn vật tư) + 1 `Input type=number step=any` (số lượng) + ô đơn vị hiển thị (unit của vật tư đã chọn) + `Input` ghi chú (tùy chọn) + nút xóa dòng (icon Trash2 từ lucide-react).
- Nút "+ Thêm dòng" ở dưới cùng để thêm dòng trống.
- Khi chỉ còn 1 dòng thì vẫn cho xóa nội dung nhưng giữ tối thiểu 1 dòng (không xóa dòng cuối).
- `disabled=true` → mọi input/nút readonly (dùng cho xem phiếu đã lập).
- KHÔNG tự gọi server action; chỉ quản state qua `onChange`.
- **Key của mỗi dòng PHẢI dùng index ổn định** (ví dụ tạo id ngẫu nhiên 1 lần khi thêm dòng, KHÔNG gọi Math.random() trong lúc render — lint cấm). Cách an toàn: mỗi dòng kèm 1 field `_key` sinh bằng `crypto.randomUUID()` lúc thêm dòng.

### 3. `components/import-doc-form.tsx`
Client component `ImportDocForm` cho phiếu NHẬP. Props: `{ materials, warehouses }`.
- Chọn 1 kho (WarehouseSelect, mặc định kho isDefault).
- `DocumentLineEditor` cho danh sách vật tư.
- Ô ghi chú phiếu (Input).
- 2 nút: "Lưu nháp" (gọi `saveDraft({type:"IN", warehouseId, note, lines})`) và "Lưu & Lập phiếu" (gọi `saveDraft` rồi nếu ok gọi `postDocument(id)`).
- Dùng `useTransition`; toast thành công/lỗi; sau khi xong `router.push("/nhap")`.
- lines gửi lên: lọc bỏ dòng chưa chọn vật tư hoặc quantity trống/<=0; convert quantity sang number. Nếu sau lọc rỗng → toast "Phiếu phải có ít nhất 1 dòng", dừng.

### 4. `components/export-doc-form.tsx`
Client component `ExportDocForm` cho phiếu XUẤT. Props: `{ materials, warehouses }`.
- Giống ImportDocForm nhưng `type:"OUT"`, THÊM 1 select "Lý do xuất" dùng `OUT_REASONS` (giá trị gửi vào field `reason`). Dùng `Select` từ `@/components/ui/select` (KHÔNG để input lồng trong select).
- saveDraft({type:"OUT", warehouseId, reason, note, lines}); nút "Lưu & Lập phiếu" → postDocument(id).
- router.push("/xuat").

### 5. `components/transfer-doc-form.tsx`
Client component `TransferDocForm` cho phiếu CHUYỂN KHO. Props: `{ materials, warehouses }`.
- 2 WarehouseSelect: "Kho nguồn" (fromWarehouseId) và "Kho đích" (toWarehouseId), không được trùng (toast nếu trùng).
- DocumentLineEditor.
- Nút "Lưu nháp" (saveDraft type:"TRANSFER") và "Lưu & Gửi duyệt" (saveDraft rồi submitTransferForApproval(id)).
- router.push("/chuyen-kho").

### 6. `components/document-list.tsx`
Client component `DocumentList`. Props:
```ts
{
  docs: {
    id:string; code:string; status:string; docDate:Date|string;
    warehouse?:{name:string}|null; fromWarehouse?:{name:string}|null;
    toWarehouse?:{name:string}|null; createdBy?:{name:string}|null;
    _count:{lines:number};
  }[];
  basePath: string; // "/nhap" | "/xuat" | "/chuyen-kho"
  newLabel: string; // "Tạo phiếu nhập" v.v.
}
```
- Bảng (Table) cột: Mã phiếu | Ngày | Kho (hoặc "nguồn→đích" cho chuyển kho) | Số dòng | Trạng thái (DocStatusBadge) | Người lập.
- Mỗi hàng click vào → `router.push(\`${basePath}/${id}\`)`.
- Nút "＋ {newLabel}" ở góc trên phải → `router.push(\`${basePath}/moi\`)`.
- Ngày format `dd/MM/yyyy` (tự viết hàm format, KHÔNG thêm thư viện).
- Nếu docs rỗng → dòng "Chưa có phiếu nào".

## CÁC PAGE PHẢI TẠO (mỗi page server component, dòng đầu file thêm: `export const dynamic = "force-dynamic";`)

### `app/(app)/nhap/page.tsx` (GHI ĐÈ file cũ)
```tsx
export const dynamic = "force-dynamic";
import { listDocuments } from "@/lib/queries/documents";
import { DocumentList } from "@/components/document-list";

export default async function NhapListPage() {
  const docs = await listDocuments("IN");
  return <div className="mx-auto max-w-5xl p-4"><h1 className="text-xl font-bold mb-4">Phiếu nhập kho</h1><DocumentList docs={docs} basePath="/nhap" newLabel="Tạo phiếu nhập" /></div>;
}
```

### `app/(app)/nhap/moi/page.tsx`
```tsx
export const dynamic = "force-dynamic";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { ImportDocForm } from "@/components/import-doc-form";

export default async function NhapMoiPage() {
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return <div className="mx-auto max-w-3xl p-4"><h1 className="text-xl font-bold mb-4">Tạo phiếu nhập</h1><ImportDocForm materials={materials} warehouses={warehouses} /></div>;
}
```

### `app/(app)/nhap/[id]/page.tsx`
- `export const dynamic="force-dynamic"`. Param `id` (Next 16: `params` là Promise → `const { id } = await params;`).
- Gọi `getDocument(id)`. Nếu null → `notFound()`.
- Hiển thị chi tiết phiếu (chỉ đọc): mã, ngày, kho, trạng thái (DocStatusBadge), bảng dòng (vật tư/SL/đơn vị/ghi chú), ghi chú phiếu, người lập.
- Nếu status==="DRAFT": render nút "Lập phiếu" (client component nhỏ gọi `postDocument(id)`).
- Nếu status==="POSTED": render nút "Hủy phiếu" (mở dialog nhập lý do → `voidDocument(id, reason)`).
- Để gọn: tạo thêm 1 client component `components/document-detail-actions.tsx` nhận `{id, status}` lo các nút này.

### Tương tự cho XUẤT: `app/(app)/xuat/page.tsx` (listDocuments("OUT")), `app/(app)/xuat/moi/page.tsx` (ExportDocForm), `app/(app)/xuat/[id]/page.tsx`.
### Tương tự cho CHUYỂN KHO: `app/(app)/chuyen-kho/page.tsx` (listDocuments("TRANSFER")), `app/(app)/chuyen-kho/moi/page.tsx` (TransferDocForm), `app/(app)/chuyen-kho/[id]/page.tsx`.
  - Trang chi tiết chuyển kho: nếu status PENDING → nút "Duyệt" (approveTransfer) + "Từ chối" (rejectTransfer); nếu DRAFT → "Gửi duyệt" (submitTransferForApproval). Đưa các nút này vào `document-detail-actions.tsx` (mở rộng prop `type`).

## QUAN TRỌNG
- Tiếng Việt toàn bộ nhãn.
- KHÔNG thêm package mới.
- KHÔNG dùng `Math.random()` khi render (lint react purity sẽ fail) — dùng `crypto.randomUUID()` trong event handler.
- Mỗi page data PHẢI có `export const dynamic = "force-dynamic";` ở dòng đầu.
- Next 16: `params` của trang `[id]` là `Promise<{id:string}>` → phải `await`.
- Khi xong, liệt kê đầy đủ các file đã tạo/sửa.
