import { InventoryDocumentList } from "@/components/inventory-document-list";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function NhapPage() {
  const rows = await getInventoryDocuments("IMPORT");

  return (
    <InventoryDocumentList
      title="Phiếu nhập hàng"
      description="Danh sách phiếu nhập đã lập, mới nhất trước."
      newHref="/nhap/moi"
      newLabel="Thêm mới nhập hàng"
      rows={rows}
    />
  );
}
