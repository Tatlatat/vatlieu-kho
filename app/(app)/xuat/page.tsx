export const dynamic = "force-dynamic";
import { listDocuments } from "@/lib/queries/documents";
import { DocumentList } from "@/components/document-list";

export default async function XuatListPage() {
  const docs = await listDocuments("OUT");
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-bold mb-4">Phiếu xuất kho</h1>
      <DocumentList docs={docs} basePath="/xuat" newLabel="Tạo phiếu xuất" />
    </div>
  );
}
