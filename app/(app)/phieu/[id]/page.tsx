import { notFound } from "next/navigation";
import { can, requireUser } from "@/lib/auth-helpers";
import { InventoryDocumentDetail } from "@/components/inventory-document-detail";
import { getInventoryDocumentDetail } from "@/lib/queries/documents";
import { permissionForInventoryDocument } from "@/lib/permissions/inventory-permissions";

export default async function PhieuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const document = await getInventoryDocumentDetail(id);
  if (!document) notFound();

  const [canEdit, canVoid] = await Promise.all([
    can(user.id, permissionForInventoryDocument(document.kind, "edit_posted")),
    can(user.id, permissionForInventoryDocument(document.kind, "void")),
  ]);
  return <InventoryDocumentDetail document={document} canEdit={canEdit} canVoid={canVoid} />;
}
