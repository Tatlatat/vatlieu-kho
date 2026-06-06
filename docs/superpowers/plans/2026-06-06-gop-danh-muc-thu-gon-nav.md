# Gộp Danh mục (tab) + thu gọn nav — Implementation Plan

> **For agentic workers:** Workflow = **agy code UI (có mẫu rõ), Claude verify từ artifact + render thật**. KHÔNG có test framework → verify bằng `npx tsc --noEmit` + `npm run lint` + `npm run build` + render thật 3 vai trò. Steps dùng checkbox `- [ ]`.

**Goal:** Gom 4 danh mục (Vật tư&Kho, Quỹ, NCC, Xe/máy) vào 1 trang `/danh-muc` nhiều tab theo quyền; thu gọn nav (menu "Thêm"); redirect 4 trang cũ.

**Architecture:** Trang `/danh-muc` server-component đọc userRole, render thanh tab (lọc theo quyền) + nội dung tab active theo `?tab=`. Mỗi tab dùng component manager SẴN CÓ (không viết lại logic). 4 trang cũ → redirect. Nav tách "thao tác chính" + dropdown "Thêm".

**Tech Stack:** Next 16 App Router (params/searchParams là Promise), Prisma, NextAuth. Mọi trang data `force-dynamic`.

**Phân vai:** agy code (trang tab + nav dropdown — UI có mẫu); Claude verify render thật + sửa guard. Theo quirks agy: verify từ artifact, kiểm git status không clobber.

**Branch:** `feat/project-truc`. Spec: `docs/superpowers/specs/2026-06-06-gop-danh-muc-thu-gon-nav-design.md`.

**DỮ LIỆU SẴN (component + query + props — agy dùng):**
- MaterialManager(`{materials}`) ← getMaterials() [lib/queries/stock]
- WarehouseManager(`{warehouses, projects}`) ← getWarehouses()[lib/queries/warehouses], getAllProjects()[lib/queries/projects]
- FundManager(`{funds, projects}`) ← getAllFunds()+getFundBalances()[lib/queries/cash], getAllProjects()
- SupplierManager(`{suppliers}`) ← getSuppliers()[lib/queries/suppliers]
- EquipmentManager(`{equipment, projects}`) ← getEquipment()[lib/queries/equipment], getAllProjects()
- requireAtLeast(role), roleLabel(role) [lib/auth-helpers]; ROLE_LEVEL{ADMIN:3,MANAGER:2,KEEPER:1}

**4 TAB:** vat-tu (MANAGER) | quy (MANAGER) | ncc (KEEPER) | xe-may (MANAGER).
KEEPER chỉ thấy tab NCC; MANAGER+ thấy 4 tab.

---

## File Structure
| File | Ai | Trách nhiệm |
|---|---|---|
| `app/(app)/danh-muc/page.tsx` | agy | trang tab gom, lọc quyền, fetch data tab active |
| `components/danh-muc-tabs.tsx` | agy | thanh tab client (Link ?tab=, active style) |
| `app/(app)/vat-lieu/page.tsx` | agy | đổi thành redirect → /danh-muc?tab=vat-tu |
| `app/(app)/nha-cung-cap/page.tsx` | agy | redirect → /danh-muc?tab=ncc |
| `app/(app)/xe-may/page.tsx` | agy | redirect → /danh-muc?tab=xe-may |
| `app/(app)/quy/danh-muc/page.tsx` | agy | redirect → /danh-muc?tab=quy |
| `components/nav.tsx` | agy | tách nav chính + dropdown "Thêm" |

---

## Task 1 (agy): Trang /danh-muc + thanh tab

**Files:** `app/(app)/danh-muc/page.tsx`, `components/danh-muc-tabs.tsx`

- [ ] **Bước 1 (agy):** Tạo `components/danh-muc-tabs.tsx` (client) — thanh tab:
```tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabDef { key: string; label: string; }

export function DanhMucTabs({ tabs, active }: { tabs: TabDef[]; active: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/danh-muc?tab=${t.key}`}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
```
- [ ] **Bước 2 (agy):** Tạo `app/(app)/danh-muc/page.tsx`:
```tsx
export const dynamic = "force-dynamic";
import { requireAtLeast, type Role } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { DanhMucTabs, type TabDef } from "@/components/danh-muc-tabs";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getAllProjects } from "@/lib/queries/projects";
import { getAllFunds, getFundBalances } from "@/lib/queries/cash";
import { getSuppliers } from "@/lib/queries/suppliers";
import { getEquipment } from "@/lib/queries/equipment";
import { MaterialManager } from "@/components/material-manager";
import { WarehouseManager } from "@/components/warehouse-manager";
import { FundManager } from "@/components/fund-manager";
import { SupplierManager } from "@/components/supplier-manager";
import { EquipmentManager } from "@/components/equipment-manager";

const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };

// Định nghĩa tab + quyền tối thiểu.
const ALL_TABS: { key: string; label: string; minRole: Role }[] = [
  { key: "vat-tu", label: "Vật tư & Kho", minRole: "MANAGER" },
  { key: "quy", label: "Quỹ", minRole: "MANAGER" },
  { key: "ncc", label: "Nhà cung cấp", minRole: "KEEPER" },
  { key: "xe-may", label: "Xe/máy", minRole: "MANAGER" },
];

export default async function DanhMucPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAtLeast("KEEPER"); // trang mở cho KEEPER (tab NCC)
  const level = ROLE_LEVEL[user.role];
  const tabs: TabDef[] = ALL_TABS.filter((t) => level >= ROLE_LEVEL[t.minRole]).map((t) => ({ key: t.key, label: t.label }));
  if (tabs.length === 0) redirect("/");

  const sp = await searchParams;
  // tab active: lấy từ ?tab nếu hợp lệ + đủ quyền, else tab đầu user có
  const active = tabs.find((t) => t.key === sp.tab)?.key ?? tabs[0].key;

  // Chỉ fetch data cho tab ĐANG active (tránh fetch thừa).
  let content: React.ReactNode = null;
  if (active === "vat-tu") {
    const [materials, warehouses, projects] = await Promise.all([getMaterials(), getWarehouses(), getAllProjects()]);
    content = (
      <div className="space-y-8">
        <MaterialManager materials={materials} />
        <WarehouseManager warehouses={warehouses} projects={projects} />
      </div>
    );
  } else if (active === "quy") {
    const [funds, balances, projects] = await Promise.all([getAllFunds(), getFundBalances(), getAllProjects()]);
    const balanceMap = Object.fromEntries(balances.map((b) => [b.fund_id, b.balance]));
    const rows = funds.map((f) => ({ ...f, balance: balanceMap[f.id] ?? 0 }));
    content = <FundManager funds={rows} projects={projects} />;
  } else if (active === "ncc") {
    const suppliers = await getSuppliers();
    content = <SupplierManager suppliers={suppliers} />;
  } else if (active === "xe-may") {
    const [equipment, projects] = await Promise.all([getEquipment(), getAllProjects()]);
    content = <EquipmentManager equipment={equipment} projects={projects} />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="mb-4 text-2xl font-bold">Danh mục</h1>
      <DanhMucTabs tabs={tabs} active={active} />
      {content}
    </div>
  );
}
```
- [ ] **Bước 3 (Claude VERIFY):** `npx tsc --noEmit` (kiểm prop FundManager/balances khớp — getFundBalances trả {fund_id, balance}). `npm run lint`. git status không clobber.
- [ ] **Bước 4 (Claude):** Commit: `git commit -am "feat(ui): trang /danh-muc gom 4 tab theo quyền"`

## Task 2 (agy): Redirect 4 trang cũ

**Files:** `app/(app)/vat-lieu/page.tsx`, `nha-cung-cap/page.tsx`, `xe-may/page.tsx`, `quy/danh-muc/page.tsx`

- [ ] **Bước 1 (agy):** Mỗi trang đổi TOÀN BỘ nội dung thành redirect. Vd `vat-lieu/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Page() {
  redirect("/danh-muc?tab=vat-tu");
}
```
Tương tự: nha-cung-cap → `?tab=ncc`; xe-may → `?tab=xe-may`; quy/danh-muc → `?tab=quy`.
- [ ] **Bước 2 (Claude VERIFY):** `npx tsc --noEmit`. Render thật: GET /vat-lieu → 307 redirect /danh-muc?tab=vat-tu. git status không clobber file khác.
- [ ] **Bước 3 (Claude):** Commit: `git commit -am "feat(ui): redirect 4 trang danh mục cũ -> /danh-muc?tab="`

## Task 3 (agy): Thu gọn nav (chính + dropdown "Thêm")

**File:** `components/nav.tsx`

- [ ] **Bước 1 (agy):** Tách `links` thành 2 nhóm: `mainLinks` (luôn hiện) + `moreLinks` (dropdown). Map lại:
  - mainLinks: Trang chính(/), Nhập(/nhap nếu có)... THỰC TẾ nav hiện có: Trang chính, Kiểm kê, Chuyển kho → giữ nhóm này + thêm gì là thao tác chính. Cụ thể mainLinks = [Trang chính, Kiểm kê, Chuyển kho] (các link KEEPER thao tác).
  - moreLinks = [Lịch sử, Báo cáo, Quỹ, Công trình, Danh mục, Người dùng] (quản trị).
  - Đổi link "/vat-lieu" thành "/danh-muc" label "Danh mục" (vì gom rồi). Bỏ link /nha-cung-cap, /xe-may riêng (đã vào tab); GIỮ /quy (giao dịch quỹ, khác /danh-muc?tab=quy là CRUD quỹ).
- [ ] **Bước 2 (agy):** Render: nav chính map mainLinks (lọc minRole như cũ). Sau đó 1 nút "Thêm" (icon Menu/MoreHorizontal) → click toggle panel xổ xuống chứa moreLinks (lọc minRole). Panel dùng useState (client). Mobile bấm được.
```tsx
// mẫu dropdown:
const [moreOpen, setMoreOpen] = React.useState(false);
// ...nút:
<button onClick={() => setMoreOpen((v) => !v)} className="...">≡ Thêm</button>
{moreOpen && (
  <div className="absolute right-0 top-full mt-1 rounded-md border bg-white shadow-lg z-50 min-w-[180px]">
    {moreLinks.filter((l) => ROLE_LEVEL[role] >= ROLE_LEVEL[l.minRole]).map((l) => (
      <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-100">
        {l.label}
      </Link>
    ))}
  </div>
)}
```
(nav.tsx đã có ROLE_LEVEL cục bộ + type Role — dùng lại.)
- [ ] **Bước 3 (Claude VERIFY):** build + render thật 3 vai trò: nav chính gọn; menu "Thêm" xổ ra đúng link theo quyền (KEEPER không thấy Người dùng; "Danh mục" trỏ /danh-muc). git status sạch.
- [ ] **Bước 4 (Claude):** Commit: `git commit -am "feat(ui): thu gọn nav — thao tác chính + menu Thêm (gom quản trị)"`

## Task 4 (Claude): Sửa guard NCC tab + verify tổng + deploy

- [ ] **Bước 1 (Claude):** NCC tab cho KEEPER, nhưng SupplierManager actions đã là requireAtLeast("KEEPER") (RBAC trước). /danh-muc page guard = KEEPER (đã đúng ở Task 1). XÁC NHẬN: action createSupplier = KEEPER. Nếu /nha-cung-cap cũ guard MANAGER thì giờ redirect nên không sao.
- [ ] **Bước 2 (Claude):** `npx tsc --noEmit && npm run lint && npm run build` — pass.
- [ ] **Bước 3 (Claude):** Render thật 3 vai trò:
  - KEEPER (staff@): /danh-muc → chỉ thấy tab NCC; tạo NCC được.
  - MANAGER (manager@): /danh-muc → 4 tab; vào tab Quỹ/Xe-máy OK.
  - ADMIN (owner@): full + menu "Thêm" có Người dùng.
  - Redirect: /vat-lieu → /danh-muc?tab=vat-tu.
- [ ] **Bước 4 (Claude):** Commit (nếu chỉnh) + push + `vercel --prod` deploy. Verify production: /danh-muc render, nav gọn.

---

## Self-Review (đã chạy)

**1. Spec coverage:**
- Spec §2 trang /danh-muc 4 tab theo quyền: Task 1. ✓
- §2 redirect 4 trang cũ: Task 2. ✓
- §3 thu gọn nav (chính + Thêm): Task 3. ✓
- §1 tiêu chí (tab theo quyền KEEPER chỉ NCC, CRUD giữ nguyên, render 3 vai trò): Task 1 + Task 4. ✓
- §4 không viết lại logic (dùng component sẵn): Task 1 dùng Manager sẵn. ✓
- §5 YAGNI (không đổi logic, không gộp xe thành vật tư, Công trình giữ riêng): không task nào làm; nav giữ /cong-trinh trong moreLinks. ✓

**2. Placeholder scan:** Không TBD. Code mẫu đầy đủ cho trang tab + nav dropdown + redirect. Bảng map quyền cụ thể. ✓

**3. Type consistency:**
- TabDef {key,label} dùng nhất quán Task 1 (danh-muc-tabs + page).
- Manager props khớp dữ liệu thật đã verify: MaterialManager{materials}, WarehouseManager{warehouses,projects}, FundManager{funds,projects}, SupplierManager{suppliers}, EquipmentManager{equipment,projects}. ✓
- getFundBalances trả {fund_id, balance} → balanceMap đúng (khớp quy/danh-muc cũ). ✓
- ROLE_LEVEL {ADMIN:3,MANAGER:2,KEEPER:1} nhất quán page + nav. ✓
