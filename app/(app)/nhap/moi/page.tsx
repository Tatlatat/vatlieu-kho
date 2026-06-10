import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { ImportForm } from "@/components/import-form";

export default async function NewNhapPage() {
  const [materials, warehouses] = await Promise.all([getMaterials(), getWarehouses()]);
  return <ImportForm materials={materials} warehouses={warehouses} />;
}
