import { can, requirePermission } from "@/lib/auth-helpers";
import { FundDocumentList } from "@/components/fund-document-list";
import { FundReport } from "@/components/fund-report";
import { getFundDocuments, getFundReport } from "@/lib/queries/funds";

function defaultDateRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export default async function QuyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; projectId?: string }>;
}) {
  const user = await requirePermission("fund.view");
  const sp = await searchParams;
  const defaults = defaultDateRange();
  const from = sp.from ?? defaults.from;
  const to = sp.to ?? defaults.to;
  const projectId = sp.projectId ?? "";

  const [rows, report, canCreate] = await Promise.all([
    getFundDocuments(),
    getFundReport({ from, to, projectId: projectId || undefined }),
    can(user.id, "fund.create"),
  ]);

  return (
    <div className="space-y-6">
      <FundDocumentList rows={rows} canCreate={canCreate} />
      <FundReport report={report} />
    </div>
  );
}
