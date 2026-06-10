import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { InventoryDocumentDetail } from "@/components/inventory-document-detail";
import { getInventoryDocumentDetail } from "@/lib/queries/documents";

export default async function PhieuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const document = await getInventoryDocumentDetail(id);
  if (!document) notFound();

  const canManage = user.role === "OWNER";
  return <InventoryDocumentDetail document={document} canEdit={canManage} canVoid={canManage} />;
}
