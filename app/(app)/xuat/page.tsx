import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { ExportForm } from "@/components/export-form";

export default async function XuatPage() {
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return <ExportForm materials={materials} warehouses={warehouses} />;
}
