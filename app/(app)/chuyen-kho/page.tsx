import { InventoryDocumentList } from "@/components/inventory-document-list";
import { getInventoryDocuments } from "@/lib/queries/documents";

export default async function ChuyenKhoPage() {
  const rows = await getInventoryDocuments("TRANSFER");

  return (
    <InventoryDocumentList
      title="Phiếu chuyển kho"
      description="Danh sách phiếu chuyển kho đã lập và ghi nhận phát sinh ngay."
      newHref="/chuyen-kho/moi"
      newLabel="Chuyển kho"
      rows={rows}
    />
  );
}
