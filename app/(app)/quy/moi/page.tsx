import { FundDocumentForm } from "@/components/fund-document-form";
import { requirePermission } from "@/lib/auth-helpers";
import { getFundOptions } from "@/lib/queries/funds";

export default async function NewFundDocumentPage() {
  await requirePermission("fund.create");
  const funds = await getFundOptions();
  return <FundDocumentForm funds={funds} />;
}
