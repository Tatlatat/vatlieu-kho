export const dynamic = "force-dynamic";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getSuppliers } from "@/lib/queries/suppliers";
import { ImportDocForm } from "@/components/import-doc-form";

export default async function NhapMoiPage() {
  const [materials, warehouses, suppliers] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getSuppliers(),
  ]);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold mb-4">Tạo phiếu nhập</h1>
      <ImportDocForm materials={materials} warehouses={warehouses} suppliers={suppliers} />
    </div>
  );
}
