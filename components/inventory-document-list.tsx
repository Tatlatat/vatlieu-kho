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
import type { InventoryDocumentListRow } from "@/lib/queries/documents";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  newHref: string;
  newLabel: string;
  canCreate?: boolean;
  rows: InventoryDocumentListRow[];
}

function statusClass(status: InventoryDocumentListRow["status"]) {
  if (status === "POSTED") return "bg-emerald-500/10 text-emerald-700 border-transparent";
  if (status === "VOIDED") return "bg-destructive/10 text-destructive border-transparent";
  return "bg-amber-500/10 text-amber-700 border-transparent";
}

export function InventoryDocumentList({
  title,
  description,
  newHref,
  newLabel,
  canCreate = true,
  rows,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canCreate && (
          <Link href={newHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <Plus className="size-4" />
            {newLabel}
          </Link>
        )}
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Danh sách phiếu</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phiếu</TableHead>
                <TableHead>Ngày chứng từ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Kho</TableHead>
                <TableHead>NCC</TableHead>
                <TableHead className="text-right">Dòng</TableHead>
                <TableHead className="text-right">Tổng SL</TableHead>
                <TableHead>Người lập</TableHead>
                <TableHead className="text-right">Xem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/phieu/${row.id}`} className="font-medium text-primary hover:underline">
                      {row.code}
                    </Link>
                    <div className="text-xs text-muted-foreground">Lần {row.revisionNo}</div>
                  </TableCell>
                  <TableCell>{row.documentDate.toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    <Badge className={cn("px-2 py-0.5", statusClass(row.status))}>
                      {row.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate" title={row.warehouseLabel}>
                    {row.warehouseLabel}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate" title={row.supplierName ?? ""}>
                    {row.supplierName ? (
                      <div>
                        <div className="font-medium">{row.supplierName}</div>
                        <div className="text-xs text-muted-foreground">{row.supplierCode}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.lineCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.totalQuantity.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>{row.createdByName}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/phieu/${row.id}`}
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
                    Chưa có phiếu nào.
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
