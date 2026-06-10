import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FundReportData } from "@/lib/queries/funds";

interface Props {
  report: FundReportData;
  compact?: boolean;
}

function money(value: number) {
  return value.toLocaleString("vi-VN");
}

export function FundReport({ report, compact = false }: Props) {
  const summaryItems = [
    { label: "Đầu kỳ", value: report.total.openingBalance },
    { label: "Thu trong kỳ", value: report.total.receiptAmount },
    { label: "Chi trong kỳ", value: report.total.paymentAmount },
    { label: "Tồn cuối kỳ", value: report.total.closingBalance },
  ];

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Báo cáo quỹ công trình</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!compact && (
          <form className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[160px_160px_minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="fund-from">Từ ngày</Label>
              <Input id="fund-from" name="from" type="date" defaultValue={report.from} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fund-to">Đến ngày</Label>
              <Input id="fund-to" name="to" type="date" defaultValue={report.to} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fund-project">Công trình</Label>
              <select
                id="fund-project"
                name="projectId"
                defaultValue={report.projectId}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tất cả công trình</option>
                {report.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.code})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">
              <Filter className="size-4" />
              Lọc
            </Button>
          </form>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{money(item.value)}</div>
            </div>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công trình</TableHead>
              <TableHead>Quỹ</TableHead>
              <TableHead className="text-right">Đầu kỳ</TableHead>
              <TableHead className="text-right">Thu</TableHead>
              <TableHead className="text-right">Chi</TableHead>
              <TableHead className="text-right">Tồn cuối</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={row.fundId}>
                <TableCell>
                  <div className="font-medium">{row.projectName ?? "Không gắn công trình"}</div>
                  {row.projectCode && <div className="font-mono text-xs text-muted-foreground">{row.projectCode}</div>}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.fundName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{row.fundCode}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(row.openingBalance)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.receiptAmount)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.paymentAmount)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(row.closingBalance)}</TableCell>
              </TableRow>
            ))}
            {report.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có quỹ công trình nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
