export const dynamic = "force-dynamic";
import { requireAtLeast } from "@/lib/auth-helpers";
import { getEquipment } from "@/lib/queries/equipment";
import { getAllProjects } from "@/lib/queries/projects";
import { EquipmentManager } from "@/components/equipment-manager";

export default async function XeMayPage() {
  await requireAtLeast("MANAGER");
  const [equipment, projects] = await Promise.all([getEquipment(), getAllProjects()]);
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý xe/máy</h1>
      <EquipmentManager equipment={equipment} projects={projects} />
    </div>
  );
}
