export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth-helpers";
import { getSuppliers } from "@/lib/queries/suppliers";
import { SupplierManager } from "@/components/supplier-manager";

export default async function NhaCungCapPage() {
  await requireRole("OWNER");
  const suppliers = await getSuppliers();
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý nhà cung cấp</h1>
      <SupplierManager suppliers={suppliers} />
    </div>
  );
}
