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
