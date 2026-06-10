import { InventoryDocumentList } from "@/components/inventory-document-list";
import { can, requirePermission } from "@/lib/auth-helpers";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function NhapPage() {
  const user = await requirePermission("inventory.import.view");
  const [rows, canCreate] = await Promise.all([
    getInventoryDocuments("IMPORT"),
    can(user.id, "inventory.import.create"),
  ]);

  return (
    <InventoryDocumentList
      title="Phiếu nhập hàng"
      description="Danh sách phiếu nhập đã lập, mới nhất trước."
      newHref="/nhap/moi"
      newLabel="Thêm mới nhập hàng"
      canCreate={canCreate}
      rows={rows}
    />
  );
}
