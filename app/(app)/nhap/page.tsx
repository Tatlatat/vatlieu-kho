export const dynamic = "force-dynamic";
import { listDocuments } from "@/lib/queries/documents";
import { DocumentList } from "@/components/document-list";

export default async function NhapListPage() {
  const docs = await listDocuments("IN");
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-bold mb-4">Phiếu nhập kho</h1>
      <DocumentList docs={docs} basePath="/nhap" newLabel="Tạo phiếu nhập" />
    </div>
  );
}
