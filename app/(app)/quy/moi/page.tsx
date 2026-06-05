export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth-helpers";
import { getFunds } from "@/lib/queries/cash";
import { CashEntryForm } from "@/components/cash-entry-form";
import { redirect } from "next/navigation";

export default async function QuyMoiPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const funds = await getFunds();
  if (funds.length === 0) redirect("/quy");
  const defaultFundId = sp.fund && funds.some((f) => f.id === sp.fund) ? sp.fund : funds[0].id;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-bold">Lập phiếu Thu / Chi</h1>
      <CashEntryForm funds={funds} defaultFundId={defaultFundId} />
    </div>
  );
}
