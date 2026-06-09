export const dynamic = "force-dynamic";
import { listDocuments } from "@/lib/queries/documents";
import { DocumentList } from "@/components/document-list";

export default async function ChuyenKhoListPage() {
  const docs = await listDocuments("TRANSFER");
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-bold mb-4">Phiếu chuyển kho</h1>
      <DocumentList docs={docs} basePath="/chuyen-kho" newLabel="Tạo phiếu chuyển kho" />
    </div>
  );
}
