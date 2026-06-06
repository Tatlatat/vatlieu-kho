export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth-helpers";
import { getAllFunds, getFundBalances } from "@/lib/queries/cash";
import { getAllProjects } from "@/lib/queries/projects";
import { FundManager } from "@/components/fund-manager";

export default async function QuyDanhMucPage() {
  await requireRole("OWNER");
  const [funds, balances, projects] = await Promise.all([getAllFunds(), getFundBalances(), getAllProjects()]);
  const balanceMap = Object.fromEntries(balances.map((b) => [b.fund_id, b.balance]));
  const rows = funds.map((f) => ({ ...f, balance: balanceMap[f.id] ?? 0 }));

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="mb-4 text-2xl font-bold">Danh mục quỹ</h1>
      <FundManager funds={rows} projects={projects} />
    </div>
  );
}
