import { notFound } from "next/navigation";
import { can, requirePermission } from "@/lib/auth-helpers";
import { FundDocumentDetail } from "@/components/fund-document-detail";
import { getFundDocumentDetail } from "@/lib/queries/funds";

export default async function FundDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requirePermission("fund.view")]);
  const document = await getFundDocumentDetail(id);
  if (!document) notFound();

  const [canEdit, canVoid] = await Promise.all([
    can(user.id, "fund.edit_posted"),
    can(user.id, "fund.void"),
  ]);

  return <FundDocumentDetail document={document} canEdit={canEdit} canVoid={canVoid} />;
}
