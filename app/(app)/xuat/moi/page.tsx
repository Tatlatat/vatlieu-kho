import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getProjectOptions } from "@/lib/queries/projects";
import { ExportForm } from "@/components/export-form";

export default async function NewXuatPage() {
  const [materials, warehouses, projects] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getProjectOptions(),
  ]);
  return <ExportForm materials={materials} warehouses={warehouses} projects={projects} />;
}
