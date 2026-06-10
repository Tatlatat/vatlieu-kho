import { InventoryDocumentList } from "@/components/inventory-document-list";
import { can, requirePermission } from "@/lib/auth-helpers";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function ChuyenKhoPage() {
  const user = await requirePermission("inventory.transfer.view");
  const [rows, canCreate] = await Promise.all([
    getInventoryDocuments("TRANSFER"),
    can(user.id, "inventory.transfer.create"),
  ]);

  return (
    <InventoryDocumentList
      title="Phiếu chuyển kho"
      description="Danh sách phiếu chuyển kho đã lập và ghi nhận phát sinh ngay."
      newHref="/chuyen-kho/moi"
      newLabel="Chuyển kho"
      canCreate={canCreate}
      rows={rows}
    />
  );
}
