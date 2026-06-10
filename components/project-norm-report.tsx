import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectNormReportRow } from "@/lib/queries/projects";
import { cn } from "@/lib/utils";

function statusClass(status: ProjectNormReportRow["status"]) {
  if (status === "OVER") return "bg-destructive/10 text-destructive border-transparent";
  if (status === "NO_NORM") return "bg-amber-500/10 text-amber-700 border-transparent";
  return "bg-emerald-500/10 text-emerald-700 border-transparent";
}

export function ProjectNormReport({ rows }: { rows: ProjectNormReportRow[] }) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Báo cáo chênh lệch định mức</CardTitle>
          <Link href="/api/reports/norms/export" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="size-3.5" />
            Excel
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công trình</TableHead>
              <TableHead>Hạng mục</TableHead>
              <TableHead>Vật tư</TableHead>
              <TableHead className="text-right">Định mức</TableHead>
              <TableHead className="text-right">Đã xuất</TableHead>
              <TableHead className="text-right">Chênh lệch</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.workItemId}-${row.materialId}`}>
                <TableCell>
                  <div className="font-medium">{row.projectName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{row.projectCode}</div>
                </TableCell>
                <TableCell>{row.workItemName}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.materialName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{row.materialCode}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.normQty == null ? "—" : `${row.normQty.toLocaleString("vi-VN")} ${row.materialUnit}`}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.actualQty.toLocaleString("vi-VN")} {row.materialUnit}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    row.varianceQty != null && row.varianceQty > 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  {row.varianceQty == null
                    ? "—"
                    : `${row.varianceQty > 0 ? "+" : ""}${row.varianceQty.toLocaleString("vi-VN")} ${row.materialUnit}`}
                </TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-0.5", statusClass(row.status))}>
                    {row.statusLabel}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có định mức hoặc phát sinh xuất theo công trình.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
