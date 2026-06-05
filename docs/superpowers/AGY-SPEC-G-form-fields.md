# AGY TASK G — Thêm trường NGÀY chứng từ + LÝ DO vào 3 form phiếu

Backend ĐÃ sẵn sàng (logic lõi xong): saveDraft nhận `docDate` (string YYYY-MM-DD, optional) và `reason` (string, optional). Danh sách lý do đã export trong `lib/validation.ts`: `IN_REASONS`, `OUT_REASONS` (đã có), `TRANSFER_REASONS`. Việc của bạn CHỈ là sửa UI 3 form để gửi 2 trường này. KHÔNG đụng backend, KHÔNG đụng schema.

## QUY TẮC CHUNG (áp dụng cho cả 3 form)

1. Thêm state ngày: `const [docDate, setDocDate] = React.useState(() => new Date().toISOString().slice(0, 10));`  (mặc định HÔM NAY).
2. Thêm 1 ô input ngày trong grid header (cùng hàng với các trường kho/ghi chú):
```tsx
<div className="space-y-2">
  <Label htmlFor="docDate">Ngày <TÊN> <span className="text-destructive">*</span></Label>
  <Input id="docDate" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="h-10" max={new Date().toISOString().slice(0, 10)} />
</div>
```
   (TÊN = "nhập" / "xuất" / "chuyển" tùy form. `max` chặn chọn ngày tương lai trên UI.)
3. Trong `saveDraft({...})`, THÊM `docDate,` vào object truyền đi.
4. KHÔNG dùng useEffect để init state. KHÔNG dùng Math.random. Lazy initializer như mẫu trên.
5. Grid header hiện là `grid-cols-1 md:grid-cols-3`. Khi thêm trường, đổi thành `md:grid-cols-2 lg:grid-cols-4` để không bị chật (4 ô: kho/ngày/lý do/ghi chú).

## FILE 1: components/import-doc-form.tsx (PHIẾU NHẬP)

- Import thêm: `import { IN_REASONS } from "@/lib/validation";`
- Thêm state: `const [docDate, setDocDate] = ...` (mẫu trên) VÀ `const [reason, setReason] = React.useState<string>(IN_REASONS[0].value);`
- Thêm ô NGÀY NHẬP (label "Ngày nhập").
- Thêm ô LÝ DO NHẬP — Select giống hệt mẫu Select "Nhà cung cấp" đang có trong file (dùng `<Select value={reason} onValueChange={(v) => setReason(v ?? "")}>`), nhưng options map từ `IN_REASONS`:
```tsx
<div className="space-y-2">
  <Label htmlFor="reason">Lý do nhập <span className="text-destructive">*</span></Label>
  <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
    <SelectTrigger id="reason" className="w-full h-10"><SelectValue placeholder="Chọn lý do nhập..." /></SelectTrigger>
    <SelectContent>
      {IN_REASONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
    </SelectContent>
  </Select>
</div>
```
- Trong lệnh gọi `saveDraft({ type: "IN", warehouseId, supplierId: ..., ... })` THÊM cả `docDate,` VÀ `reason,`.
- Grid header giờ có 5 ô (kho/nhà cung cấp/ngày/lý do/ghi chú) → dùng `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

## FILE 2: components/export-doc-form.tsx (PHIẾU XUẤT)

- Đã có state `reason` (OUT_REASONS) và Select lý do — GIỮ NGUYÊN (option "Kiểm kê thiếu" tự xuất hiện vì OUT_REASONS đã được cập nhật ở backend).
- CHỈ thêm: state `docDate` + ô NGÀY XUẤT (label "Ngày xuất").
- Trong `saveDraft({ type: "OUT", warehouseId, reason, ... })` THÊM `docDate,`.
- Grid header có 4 ô (kho/lý do/ngày/ghi chú) → `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.

## FILE 3: components/transfer-doc-form.tsx (PHIẾU CHUYỂN KHO)

- Import thêm: `import { TRANSFER_REASONS } from "@/lib/validation";`
- Thêm state `docDate` (mẫu trên) VÀ `const [reason, setReason] = React.useState<string>(TRANSFER_REASONS[0].value);`
- Thêm ô NGÀY CHUYỂN (label "Ngày chuyển").
- Thêm ô LÝ DO CHUYỂN — Select map từ `TRANSFER_REASONS` (cấu trúc giống mẫu Select ở trên).
- Trong lệnh gọi `saveDraft({ type: "TRANSFER", fromWarehouseId, toWarehouseId, ... })` THÊM `docDate,` VÀ `reason,`.
- Điều chỉnh grid header cho đủ chỗ (kho nguồn/kho đích/ngày/lý do/ghi chú).

## SAU KHI XONG

Chạy `npx tsc --noEmit` để chắc không lỗi type. Báo lại "ĐÃ XONG G" + liệt kê 3 file đã sửa.
