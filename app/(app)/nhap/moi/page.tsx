import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getSupplierOptions } from "@/lib/queries/catalogs";
import { ImportForm } from "@/components/import-form";

export default async function NewNhapPage() {
  const [materials, warehouses, suppliers] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getSupplierOptions(),
  ]);
  return <ImportForm materials={materials} warehouses={warehouses} suppliers={suppliers} />;
}
