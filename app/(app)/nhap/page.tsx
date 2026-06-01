import { getMaterials } from "@/lib/queries/stock";
import { ImportForm } from "@/components/import-form";

export default async function NhapPage() {
  const materials = await getMaterials();
  return <ImportForm materials={materials} />;
}
