export const dynamic = "force-dynamic";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getSuppliers } from "@/lib/queries/suppliers";
import { getActiveEquipmentForSelect } from "@/lib/queries/equipment";
import { getAllProjects } from "@/lib/queries/projects";
import { ImportDocForm } from "@/components/import-doc-form";

export default async function NhapMoiPage() {
  const [materials, warehouses, suppliers, equipment, projects] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getSuppliers(),
    getActiveEquipmentForSelect(),
    getAllProjects(),
  ]);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold mb-4">Tạo phiếu nhập</h1>
      <ImportDocForm materials={materials} warehouses={warehouses} suppliers={suppliers} equipment={equipment} projects={projects} />
    </div>
  );
}
