import { notFound } from "next/navigation";
import { FundDocumentForm } from "@/components/fund-document-form";
import { requirePermission } from "@/lib/auth-helpers";
import { getFundDocumentDetail, getFundOptions } from "@/lib/queries/funds";

export default async function EditFundDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("fund.edit_posted");
  const { id } = await params;
  const document = await getFundDocumentDetail(id);
  if (!document || document.status !== "POSTED") notFound();

  const funds = await getFundOptions();
  return (
    <FundDocumentForm
      funds={funds}
      mode="edit"
      initialDocument={{
        id: document.id,
        kind: document.kind,
        fundId: document.fundId,
        documentDate: document.documentDate,
        note: document.note,
        lines: document.lines,
      }}
    />
  );
}
