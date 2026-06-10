import { requirePermission } from "@/lib/auth-helpers";
import { OpeningImportForm } from "@/components/opening-import-form";

export default async function TonDauKyPage() {
  await requirePermission("inventory.opening.import");
  return <OpeningImportForm />;
}
