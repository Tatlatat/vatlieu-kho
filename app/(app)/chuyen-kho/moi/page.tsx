import { requirePermission } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { TransferForm } from "@/components/transfer-form";

export default async function NewChuyenKhoPage() {
  await requirePermission("inventory.transfer.create");
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return <TransferForm materials={materials} warehouses={warehouses} />;
}
