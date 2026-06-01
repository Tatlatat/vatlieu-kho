import { getMaterials } from "@/lib/queries/stock";
import { ExportForm } from "@/components/export-form";

export default async function XuatPage() {
  const materials = await getMaterials();
  return <ExportForm materials={materials} />;
}
