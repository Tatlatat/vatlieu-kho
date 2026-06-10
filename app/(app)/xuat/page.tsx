import { InventoryDocumentList } from "@/components/inventory-document-list";
import { can, requirePermission } from "@/lib/auth-helpers";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function XuatPage() {
  const user = await requirePermission("inventory.export.view");
  const [rows, canCreate] = await Promise.all([
    getInventoryDocuments("EXPORT"),
    can(user.id, "inventory.export.create"),
  ]);

  return (
    <InventoryDocumentList
      title="Phiếu xuất hàng"
      description="Danh sách phiếu xuất đã lập, mới nhất trước."
      newHref="/xuat/moi"
      newLabel="Thêm mới xuất hàng"
      canCreate={canCreate}
      rows={rows}
    />
  );
}
