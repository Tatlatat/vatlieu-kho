import { InventoryDocumentList } from "@/components/inventory-document-list";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function XuatPage() {
  const rows = await getInventoryDocuments("EXPORT");

  return (
    <InventoryDocumentList
      title="Phiếu xuất hàng"
      description="Danh sách phiếu xuất đã lập, mới nhất trước."
      newHref="/xuat/moi"
      newLabel="Thêm mới xuất hàng"
      rows={rows}
    />
  );
}
