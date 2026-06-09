export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAtLeast } from "@/lib/auth-helpers";
import { getFunds, getFundBalances, listCashEntries, getCashReport, getProjectCashSummary } from "@/lib/queries/cash";
import { CashLedger } from "@/components/cash-ledger";
import { CashFilter } from "@/components/cash-filter";
import { ProjectCashSummary } from "@/components/project-cash-summary";
import { formatVnd } from "@/lib/utils";
import { CASH_CATEGORY_LABELS } from "@/lib/validation";
import { Plus, Wallet } from "lucide-react";

export default async function QuyPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string; from?: string; to?: string; view?: "ledger" | "summary" }>;
}) {
  await requireAtLeast("MANAGER");
  const sp = await searchParams;

  const funds = await getFunds();
  if (funds.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <h1 className="text-xl font-bold mb-4">Quỹ tiền</h1>
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p>Chưa có quỹ nào.</p>
          <Link href="/quy/danh-muc" className="mt-3 inline-block text-blue-600 hover:underline">
            Tạo quỹ đầu tiên →
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const fundId = sp.fund && funds.some((f) => f.id === sp.fund) ? sp.fund : funds[0].id;
  const from = sp.from ?? firstOfMonth;
  const to = sp.to ?? todayStr;
  const view = sp.view === "summary" ? "summary" : "ledger";

  const [balances, entries, report, summaryRows] = await Promise.all([
    view === "ledger" ? getFundBalances(fundId) : Promise.resolve([]),
    view === "ledger" ? listCashEntries(fundId, from, to) : Promise.resolve([]),
    view === "ledger" ? getCashReport(fundId, from, to) : Promise.resolve({ totalIn: 0, totalOut: 0, balance: 0, byCategory: [] }),
    view === "summary" ? getProjectCashSummary(from, to) : Promise.resolve([]),
  ]);
  const balance = balances.length ? balances[0].balance : 0;
  const fund = funds.find((f) => f.id === fundId)!;

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Quỹ tiền</h1>
          <p className="text-sm text-slate-500">Sổ thu – chi – tồn quỹ công trường</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/quy/danh-muc"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Danh mục quỹ
          </Link>
          <Link
            href={`/quy/moi?fund=${fundId}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Lập phiếu Thu/Chi
          </Link>
        </div>
      </div>

      <CashFilter funds={funds} fundId={fundId} from={from} to={to} view={view} />

      {view === "ledger" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={`rounded-xl border p-4 ${balance < 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="text-xs font-medium text-slate-500">Tồn quỹ hiện tại — {fund.name}</div>
              <div className={`mt-1 text-2xl font-bold ${balance < 0 ? "text-red-700" : "text-emerald-700"}`}>
                {formatVnd(balance)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Tổng THU trong kỳ</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{formatVnd(report.totalIn)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Tổng CHI trong kỳ</div>
              <div className="mt-1 text-2xl font-bold text-red-700">{formatVnd(report.totalOut)}</div>
            </div>
          </div>

          {report.byCategory.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Theo hạng mục (trong kỳ)</h2>
                <a
                  href={`/api/quy/excel?fund=${fundId}&from=${from}&to=${to}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Tải Excel
                </a>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {report.byCategory.map((c) => (
                  <div key={`${c.type}-${c.category}`} className="flex items-center justify-between border-b border-slate-100 py-1 text-sm">
                    <span className="text-slate-600">
                      <span className={c.type === "THU" ? "text-emerald-600" : "text-red-600"}>
                        {c.type === "THU" ? "Thu" : "Chi"}
                      </span>{" "}
                      · {CASH_CATEGORY_LABELS[c.category] ?? c.category}
                    </span>
                    <span className="font-medium tabular-nums">{formatVnd(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <CashLedger entries={entries} canVoid />
        </>
      ) : (
        <ProjectCashSummary rows={summaryRows} from={from} to={to} />
      )}
    </div>
  );
}
