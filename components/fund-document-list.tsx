import Link from "next/link";
import { Eye, Plus } from "lucide-react";
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
import type { FundDocumentListRow } from "@/lib/queries/funds";
import { cn } from "@/lib/utils";

interface Props {
  rows: FundDocumentListRow[];
  canCreate: boolean;
}

function money(value: number) {
  return value.toLocaleString("vi-VN");
}

function statusClass(status: FundDocumentListRow["status"]) {
  if (status === "POSTED") return "bg-emerald-500/10 text-emerald-700 border-transparent";
  if (status === "VOIDED") return "bg-destructive/10 text-destructive border-transparent";
  return "bg-amber-500/10 text-amber-700 border-transparent";
}

function kindClass(kind: FundDocumentListRow["kind"]) {
  return kind === "RECEIPT"
    ? "bg-blue-500/10 text-blue-700 border-transparent"
    : "bg-rose-500/10 text-rose-700 border-transparent";
}

export function FundDocumentList({ rows, canCreate }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quỹ công trường</h1>
          <p className="text-sm text-muted-foreground">Danh sách phiếu thu, phiếu chi đã lập.</p>
        </div>
        {canCreate && (
          <Link href="/quy/moi" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <Plus className="size-4" />
            Thêm phiếu quỹ
          </Link>
        )}
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Danh sách phiếu quỹ</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phiếu</TableHead>
                <TableHead>Ngày chứng từ</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Quỹ / công trình</TableHead>
                <TableHead className="text-right">Dòng</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Người lập</TableHead>
                <TableHead className="text-right">Xem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/quy/${row.id}`} className="font-medium text-primary hover:underline">
                      {row.code}
                    </Link>
                    <div className="text-xs text-muted-foreground">Lần {row.revisionNo}</div>
                  </TableCell>
                  <TableCell>{row.documentDate.toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    <Badge className={cn("px-2 py-0.5", kindClass(row.kind))}>{row.kindLabel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("px-2 py-0.5", statusClass(row.status))}>
                      {row.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.fundName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.projectName ?? row.fundCode}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.lineCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.totalAmount)}</TableCell>
                  <TableCell>{row.createdByName}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/quy/${row.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      title="Xem phiếu"
                      aria-label="Xem phiếu"
                    >
                      <Eye className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có phiếu quỹ nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
