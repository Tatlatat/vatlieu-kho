import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { getFundDocumentDetail } from "@/lib/queries/funds";
import { FundDocumentPrint } from "@/components/print/fund-document-print";
import { PrintToolbar } from "@/components/print/print-toolbar";

export default async function FundDocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requirePermission("fund.view")]);
  const document = await getFundDocumentDetail(id);
  if (!document) notFound();

  return (
    <div>
      <PrintToolbar backHref={`/quy/${document.id}`} />
      <FundDocumentPrint document={document} />
    </div>
  );
}
