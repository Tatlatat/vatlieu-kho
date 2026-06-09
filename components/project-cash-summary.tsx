"use client";

import { formatVnd } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectCashSummaryRow {
  project_id: string | null;
  project_code: string | null;
  project_name: string;
  fund_count: number;
  total_in: number;
  total_out: number;
  balance: number;
}

export function ProjectCashSummary({
  rows,
  from,
  to,
}: {
  rows: ProjectCashSummaryRow[];
  from: string;
  to: string;
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      fundCount: acc.fundCount + row.fund_count,
      totalIn: acc.totalIn + row.total_in,
      totalOut: acc.totalOut + row.total_out,
      balance: acc.balance + row.balance,
    }),
    { fundCount: 0, totalIn: 0, totalOut: 0, balance: 0 }
  );

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Tổng hợp theo công trình</h2>
          <p className="text-xs text-slate-500">
            Kỳ: {from} → {to}
          </p>
        </div>
        <a
          href={`/api/quy/tong-hop-excel?from=${from}&to=${to}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Tải Excel
        </a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Công trình</TableHead>
            <TableHead>Mã</TableHead>
            <TableHead className="text-right">Số quỹ</TableHead>
            <TableHead className="text-right">Tổng thu</TableHead>
            <TableHead className="text-right">Tổng chi</TableHead>
            <TableHead className="text-right">Tồn trong kỳ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                Chưa có dữ liệu tổng hợp trong kỳ
              </TableCell>
            </TableRow>
          ) : (
            <>
              {rows.map((row) => (
                <TableRow key={row.project_id ?? "unassigned"}>
                  <TableCell className="font-medium">{row.project_name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.project_code ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.fund_count}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{formatVnd(row.total_in)}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-700">{formatVnd(row.total_out)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatVnd(row.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 font-semibold">
                <TableCell>Tổng cộng</TableCell>
                <TableCell>—</TableCell>
                <TableCell className="text-right tabular-nums">{totals.fundCount}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700">{formatVnd(totals.totalIn)}</TableCell>
                <TableCell className="text-right tabular-nums text-red-700">{formatVnd(totals.totalOut)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(totals.balance)}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
