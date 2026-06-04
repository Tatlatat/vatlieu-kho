export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth-helpers";
import { getEquipment } from "@/lib/queries/equipment";
import { EquipmentManager } from "@/components/equipment-manager";

export default async function XeMayPage() {
  await requireRole("OWNER");
  const equipment = await getEquipment();
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Quản lý xe/máy</h1>
      <EquipmentManager equipment={equipment} />
    </div>
  );
}
