# Tra cứu MST tự động — Implementation Plan

> **For agentic workers:** Workflow = **agy code (có code mẫu rõ), Claude verify từ artifact + tra cứu thật**. KHÔNG có test framework → verify bằng `npx tsc --noEmit` + `npm run lint` + `npm run build` + gọi action thật. Steps dùng checkbox `- [ ]`.

**Goal:** Khi tạo/sửa NCC, gõ Mã số thuế xong (blur) → tự tra VietQR → điền Tên + Địa chỉ vào form (chỉ điền ô trống, vẫn sửa được).

**Architecture:** Server action `lookupTaxCode(mst)` gọi VietQR API (free, no key) trả {name, address}. Component supplier-manager: onBlur ô MST → gọi action → set giá trị ô Tên/Địa chỉ qua useRef (giữ form uncontrolled). Lỗi → toast nhẹ, không chặn.

**Tech Stack:** Next 16 server action, fetch + AbortController (timeout), sonner toast, React useRef/useTransition.

**Phân vai:** agy code (action + sửa component — có mẫu). Claude verify: tsc/lint/build + gọi action thật với MST thật (Vietcombank 0100112437) + render thật.

**Branch:** `feat/project-truc`. Spec: `docs/superpowers/specs/2026-06-06-tra-cuu-mst-design.md`.

**API ĐÃ VERIFY:** `GET https://api.vietqr.io/v2/business/<mst>` → `{code:"00", data:{name, address, ...}}`. code "00" = OK. MST 0100112437 → "NGÂN HÀNG ... NGOẠI THƯƠNG VIỆT NAM"; MST 0101243150 → "CÔNG TY CỔ PHẦN MISA".

---

## File Structure
| File | Trách nhiệm |
|---|---|
| `lib/actions/tax-lookup.ts` | CREATE — server action lookupTaxCode |
| `components/supplier-manager.tsx` | MODIFY — onBlur MST + useRef + auto-fill (form Thêm + Sửa) |

---

## Task 1 (agy): Server action lookupTaxCode

**File:** `lib/actions/tax-lookup.ts` (CREATE)

- [ ] **Bước 1 (agy):** Tạo file:
```ts
"use server";

export type TaxLookupResult =
  | { ok: true; name: string; address: string }
  | { ok: false; error?: string };

/** Tra thông tin doanh nghiệp theo MST qua VietQR (free, không cần key). */
export async function lookupTaxCode(mst: string): Promise<TaxLookupResult> {
  const code = (mst ?? "").trim();
  // MST VN: 10 số (doanh nghiệp) hoặc 13 số (chi nhánh, dạng 10-3). Bỏ dấu '-'.
  const digits = code.replace(/-/g, "");
  if (!/^\d{10}(\d{3})?$/.test(digits)) {
    return { ok: false, error: "Mã số thuế không hợp lệ" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "Không tra cứu được" };
    const json = (await res.json()) as { code?: string; data?: { name?: string; address?: string } };
    if (json.code === "00" && json.data?.name) {
      return { ok: true, name: json.data.name, address: json.data.address ?? "" };
    }
    return { ok: false, error: "Không tìm thấy doanh nghiệp với mã số thuế này" };
  } catch {
    return { ok: false, error: "Không tra cứu được (mạng/quá thời gian)" };
  } finally {
    clearTimeout(timer);
  }
}
```
- [ ] **Bước 2 (Claude VERIFY):** `npx tsc --noEmit`. Gọi action THẬT với MST thật:
```bash
cd /tmp/vatlieu-kho && npx tsx -e 'import { lookupTaxCode } from "./lib/actions/tax-lookup"; lookupTaxCode("0100112437").then(r=>{console.log(JSON.stringify(r)); process.exit(0)})'
```
Expected: `{"ok":true,"name":"NGÂN HÀNG ... NGOẠI THƯƠNG VIỆT NAM","address":"..."}`.
Test thêm MST rác: `lookupTaxCode("abc")` → `{ok:false,...}`.
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(ncc): server action lookupTaxCode tra VietQR (free, timeout 8s)"`

## Task 2 (agy): Auto-fill ở supplier-manager (form Thêm + Sửa)

**File:** `components/supplier-manager.tsx`

- [ ] **Bước 1 (agy):** Thêm import + state/ref ở đầu component (sau các useState hiện có):
```ts
import { lookupTaxCode } from "@/lib/actions/tax-lookup";
// trong component:
const [lookingUp, startLookup] = React.useTransition();
// refs cho form THÊM
const createNameRef = React.useRef<HTMLInputElement>(null);
const createAddrRef = React.useRef<HTMLInputElement>(null);
// refs cho form SỬA
const editNameRef = React.useRef<HTMLInputElement>(null);
const editAddrRef = React.useRef<HTMLInputElement>(null);
```
- [ ] **Bước 2 (agy):** Thêm hàm xử lý tra cứu (dùng chung, nhận ref theo form):
```ts
const handleTaxBlur = (
  mst: string,
  nameRef: React.RefObject<HTMLInputElement | null>,
  addrRef: React.RefObject<HTMLInputElement | null>
) => {
  const digits = (mst ?? "").replace(/-/g, "").trim();
  if (!/^\d{10}(\d{3})?$/.test(digits)) return; // chưa hợp lệ → im lặng
  startLookup(async () => {
    const res = await lookupTaxCode(digits);
    if (res.ok) {
      if (nameRef.current && !nameRef.current.value) nameRef.current.value = res.name;
      if (addrRef.current && !addrRef.current.value) addrRef.current.value = res.address;
      toast.success("Đã lấy thông tin từ mã số thuế");
    } else {
      toast.error(res.error || "Không tra được thông tin, vui lòng nhập tay");
    }
  });
};
```
- [ ] **Bước 3 (agy):** Form THÊM — gắn ref + onBlur. Sửa 2 ô + ô MST:
  - ô Tên (id="sname"): thêm `ref={createNameRef}`.
  - ô Địa chỉ (id="saddress"): thêm `ref={createAddrRef}`.
  - ô MST (id="staxCode"): thêm `onBlur={(e) => handleTaxBlur(e.target.value, createNameRef, createAddrRef)}`.
  - cạnh ô MST: hiện "Đang tra cứu..." khi `lookingUp` (vd `{lookingUp && <span className="text-xs text-slate-400">Đang tra cứu...</span>}`).
- [ ] **Bước 4 (agy):** Form SỬA — tương tự với editNameRef/editAddrRef:
  - ô Tên (defaultValue editingSupplier.name): thêm `ref={editNameRef}`.
  - ô Địa chỉ (defaultValue editingSupplier.address): thêm `ref={editAddrRef}`.
  - ô MST (defaultValue editingSupplier.taxCode): thêm `onBlur={(e) => handleTaxBlur(e.target.value, editNameRef, editAddrRef)}`.
  (form Sửa: ô đã có sẵn giá trị → handleTaxBlur chỉ điền nếu trống, nên không ghi đè data cũ — đúng.)
- [ ] **Bước 5 (Claude VERIFY):** `npx tsc --noEmit && npm run lint`. git status không clobber file khác.
- [ ] **Bước 6 (Claude):** Commit: `git commit -am "feat(ncc): auto-fill tên+địa chỉ NCC khi blur MST (form Thêm + Sửa)"`

## Task 3 (Claude): Verify render thật + build + deploy

- [ ] **Bước 1:** `npx tsc --noEmit && npm run lint && npm run build` — pass.
- [ ] **Bước 2:** Render thật: login MANAGER (manager@), mở /danh-muc?tab=ncc, mở form Thêm NCC. (Render thật chỉ xác nhận form load + ô MST có; auto-fill là client JS nên verify logic bằng action test ở Task 1.)
- [ ] **Bước 3:** Commit nếu chỉnh + push + `vercel --prod` deploy. Verify production /danh-muc?tab=ncc render.

---

## Self-Review (đã chạy)

**1. Spec coverage:**
- Spec §3.1 server action lookupTaxCode (validate, timeout 8s, không ném lỗi): Task 1. ✓
- §3.2 UI onBlur + useRef + điền ô trống + form Thêm & Sửa: Task 2. ✓
- §4 xử lý lỗi (MST sai im lặng, timeout/lỗi/không-tồn-tại toast, không ghi đè): Task 1 + 2. ✓
- §2 API VietQR đã verify: Task 1 dùng đúng endpoint. ✓
- §5/§6 không thêm field DB/cache: không task nào làm. ✓

**2. Placeholder scan:** Không TBD. Code mẫu đầy đủ action + onBlur + ref. Lệnh verify cụ thể (MST thật). ✓

**3. Type consistency:**
- `lookupTaxCode(mst): Promise<TaxLookupResult>` — Task 1 định nghĩa, Task 2 gọi khớp.
- TaxLookupResult discriminated union {ok:true,name,address}|{ok:false,error?} — dùng nhất quán.
- handleTaxBlur(mst, nameRef, addrRef) — chữ ký dùng đồng nhất form Thêm + Sửa (Task 2 bước 3/4).
- refs HTMLInputElement | null khớp React.useRef<HTMLInputElement>(null). ✓
