import { notFound, redirect } from "next/navigation";
import { can, requireUser } from "@/lib/auth-helpers";
import { getInventoryDocumentDetail } from "@/lib/queries/documents";
import { permissionForInventoryDocument } from "@/lib/permissions/inventory-permissions";
import {
  InventoryDocumentPrint,
  inventoryPrintBackHref,
} from "@/components/print/inventory-document-print";
import { PrintToolbar } from "@/components/print/print-toolbar";

export default async function InventoryDocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const document = await getInventoryDocumentDetail(id);
  if (!document) notFound();
  if (!(await can(user.id, permissionForInventoryDocument(document.kind, "view")))) redirect("/");

  return (
    <div>
      <PrintToolbar backHref={inventoryPrintBackHref(document.kind, document.id)} />
      <InventoryDocumentPrint document={document} />
    </div>
  );
}
