# AGY SPEC — Phase E (phần UI): Phân quyền user + NCC + Xe/máy

> Bạn (agy) CHỈ viết component + page + sửa nav + chèn select NCC vào form nhập. KHÔNG sửa: schema.prisma, migration, .env, package.json, lib/actions/*, lib/queries/*. Logic + bảng đã có sẵn. KHÔNG chạy build/migration.

## Đã có sẵn (DÙNG, không viết lại)
Actions (import và gọi trực tiếp):
- `lib/actions/users.ts`: `createUser({email,name,password,role})`, `updateUserRole(id, role)`, `resetPassword(id, newPassword)`. Trả `{ok,error?}`.
- `lib/actions/suppliers.ts`: `createSupplier({name,contact?,note?})`, `updateSupplier(id, {...})`, `deleteSupplier(id)`.
- `lib/actions/equipment.ts`: `createEquipment({name,type?,plateNo?,note?})`, `updateEquipment(id,{...})`, `deleteEquipment(id)`, `logHours({equipmentId,logDate,hours,note?})`.
Queries:
- `lib/queries/users.ts`: `getUsers()` → `{id,email,name,role,createdAt}[]`.
- `lib/queries/suppliers.ts`: `getSuppliers()` → `{id,name,contact,note}[]`.
- `lib/queries/equipment.ts`: `getEquipment()` → `{id,name,type,plateNo,note,_count:{logs}}[]`, `getEquipmentLogs(id)`.
- ui primitives, `toast` từ sonner, `@/components/warehouse-select`, `@/components/searchable-material-select`.

`role` chỉ có 2 giá trị: `"OWNER"` (Chủ) | `"STAFF"` (Thủ kho).

---

## 1. Phân quyền user

### `components/user-manager.tsx`
Client `UserManager`, prop `{ users: {id,email,name,role,createdAt}[]; currentUserId: string }`.
- Bảng: STT | Tên | Email | Vai trò (Chủ/Thủ kho) | Hành động.
- Nút "Thêm người dùng" → mở Dialog form: email, tên, mật khẩu, vai trò (select OWNER/STAFF) → `createUser(...)`.
- Mỗi hàng: nút đổi vai trò (toggle OWNER↔STAFF qua `updateUserRole`) + nút "Đặt lại mật khẩu" (Dialog nhập mật khẩu mới → `resetPassword`).
- Hàng của chính mình (`u.id === currentUserId`): KHÔNG hiện nút hạ quyền (server cũng chặn, nhưng UI nên ẩn cho rõ).
- `useTransition` + toast + `router.refresh()` sau thành công.

### `app/(app)/nguoi-dung/page.tsx`
```tsx
export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth-helpers";
import { getUsers } from "@/lib/queries/users";
import { UserManager } from "@/components/user-manager";

export default async function NguoiDungPage() {
  const me = await requireRole("OWNER");
  const users = await getUsers();
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý người dùng</h1>
      <UserManager users={users} currentUserId={me.id} />
    </div>
  );
}
```

## 2. Nhà cung cấp

### `components/supplier-manager.tsx`
Client `SupplierManager`, prop `{ suppliers: {id,name,contact,note}[] }`.
- Bảng STT | Tên NCC | Liên hệ | Ghi chú | Hành động (Sửa/Xóa).
- Nút "Thêm nhà cung cấp" → Dialog form (tên, liên hệ, ghi chú) → `createSupplier`.
- Sửa (Dialog) → `updateSupplier`; Xóa (confirm) → `deleteSupplier` (hiện `res.error` nếu bị chặn vì đã gắn phiếu).
- useTransition + toast + router.refresh().

### `app/(app)/nha-cung-cap/page.tsx`
`force-dynamic`, `requireRole("OWNER")`, `getSuppliers()`, render `<SupplierManager suppliers={...} />`, tiêu đề "Quản lý nhà cung cấp".

## 3. Xe/Máy + nhật ký giờ

### `components/equipment-manager.tsx`
Client `EquipmentManager`, prop `{ equipment: {id,name,type,plateNo,note,_count:{logs}}[] }`.
- Bảng STT | Tên | Loại | Biển số | Số lần ghi giờ (`_count.logs`) | Hành động.
- Nút "Thêm xe/máy" → Dialog (tên, loại, biển số, ghi chú) → `createEquipment`.
- Mỗi hàng: nút "Ghi giờ" → Dialog (chọn ngày `<input type=date>`, số giờ, ghi chú) → `logHours({equipmentId, logDate, hours, note})`. (Ghi giờ ai cũng làm được — đừng giới hạn OWNER ở UI.)
- Sửa/Xóa equipment → `updateEquipment`/`deleteEquipment`.
- useTransition + toast + router.refresh().

### `app/(app)/xe-may/page.tsx`
`force-dynamic`, `requireRole("OWNER")` (trang quản lý là OWNER; còn logHours action thì requireUser nên STAFF gọi được nếu có UI — ở đây trang là OWNER, chấp nhận), `getEquipment()`, render `<EquipmentManager .../>`, tiêu đề "Quản lý xe/máy".

## 4. Nav — thêm 3 link (OWNER)
Trong `components/nav.tsx`, mảng `links`, THÊM 3 dòng (chọn icon từ lucide-react: Users, Truck, Wrench/Cog) — chỉ role OWNER:
```ts
{ href: "/nguoi-dung", label: "Người dùng", icon: Users, roles: ["OWNER"] },
{ href: "/nha-cung-cap", label: "Nhà cung cấp", icon: Truck, roles: ["OWNER"] },
{ href: "/xe-may", label: "Xe/máy", icon: Wrench, roles: ["OWNER"] },
```
Nhớ import 3 icon đó ở đầu file nav.tsx (Users, Truck, Wrench đều có trong lucide-react).

## 5. Chèn select NCC vào phiếu nhập
### `components/import-doc-form.tsx` (CHỈ THÊM, đừng phá logic cũ)
- Thêm vào props: `suppliers: {id,name}[]`.
- Thêm state `const [supplierId, setSupplierId] = React.useState("")`.
- Thêm 1 `Select` (từ `@/components/ui/select`) "Nhà cung cấp (tùy chọn)" cạnh chỗ chọn Kho, đổ options từ `suppliers` (thêm option rỗng "— Không chọn —" value="").
- Trong lời gọi `saveDraft({...})` (đang có `type:"IN", warehouseId, note, lines`), THÊM `supplierId: supplierId || undefined`.

### `app/(app)/nhap/moi/page.tsx` (sửa fetch)
```tsx
export const dynamic = "force-dynamic";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getSuppliers } from "@/lib/queries/suppliers";
import { ImportDocForm } from "@/components/import-doc-form";

export default async function NhapMoiPage() {
  const [materials, warehouses, suppliers] = await Promise.all([getMaterials(), getWarehouses(), getSuppliers()]);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold mb-4">Tạo phiếu nhập</h1>
      <ImportDocForm materials={materials} warehouses={warehouses} suppliers={suppliers} />
    </div>
  );
}
```
### `app/(app)/nhap/[id]/page.tsx` (nếu form chi tiết dùng ImportDocForm có suppliers thì cũng truyền; nếu trang [id] chỉ xem thì bỏ qua).

## QUAN TRỌNG
- Tiếng Việt toàn bộ. role: OWNER="Chủ", STAFF="Thủ kho".
- KHÔNG thêm package. KHÔNG `Math.random()` khi render. KHÔNG `useEffect`+`setState` để init state (dùng lazy initializer `useState(() => ...)`). Key dòng/list dùng id thật hoặc `crypto.randomUUID()` trong handler.
- Base-ui Select: `onValueChange` trả `string | null` → luôn bọc `(v) => setX(v ?? "")`.
- KHÔNG dùng `<Button asChild>` (Button của project KHÔNG hỗ trợ asChild) — nếu cần link kiểu nút, dùng `<a className="...">` hoặc `<Link className="...">`.
- Mọi page data: `export const dynamic = "force-dynamic";`.
- Xong liệt kê đầy đủ file đã tạo/sửa.
