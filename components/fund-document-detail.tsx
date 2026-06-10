import Link from "next/link";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
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
import { FundVoidButton } from "@/components/fund-void-button";
import type { FundDocumentDetail as FundDocumentDetailData } from "@/lib/queries/funds";
import { cn } from "@/lib/utils";

interface Props {
  document: FundDocumentDetailData;
  canEdit: boolean;
  canVoid: boolean;
}

function money(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatDate(date: Date | null) {
  if (!date) return "Chưa có";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: FundDocumentDetailData["status"]) {
  if (status === "POSTED") return "bg-emerald-500/10 text-emerald-700 border-transparent";
  if (status === "VOIDED") return "bg-destructive/10 text-destructive border-transparent";
  return "bg-amber-500/10 text-amber-700 border-transparent";
}

function kindClass(kind: FundDocumentDetailData["kind"]) {
  return kind === "RECEIPT"
    ? "bg-blue-500/10 text-blue-700 border-transparent"
    : "bg-rose-500/10 text-rose-700 border-transparent";
}

export function FundDocumentDetail({ document, canEdit, canVoid }: Props) {
  const canChange = document.status === "POSTED";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/quy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{document.code}</h1>
            <Badge className={cn("px-2 py-0.5", kindClass(document.kind))}>{document.kindLabel}</Badge>
            <Badge className={cn("px-2 py-0.5", statusClass(document.status))}>
              {document.statusLabel}
            </Badge>
            <Badge variant="outline" className="px-2 py-0.5">
              Lần {document.revisionNo}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{document.fundName}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/quy/${document.id}/in`} className={buttonVariants({ variant: "outline" })}>
            <Printer className="size-4" />
            In phiếu
          </Link>
          {canChange && canEdit && (
            <Link href={`/quy/${document.id}/sua`} className={buttonVariants({ variant: "outline" })}>
              <Pencil className="size-4" />
              Sửa phiếu
            </Link>
          )}
          {canChange && canVoid && <FundVoidButton documentId={document.id} />}
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Thông tin phiếu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Ngày chứng từ</div>
            <div className="font-medium">{document.documentDate.toLocaleDateString("vi-VN")}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Quỹ</div>
            <div className="font-medium">{document.fundName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Công trình</div>
            <div className="font-medium">{document.projectName ?? "Không gắn công trình"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tổng tiền</div>
            <div className="font-medium tabular-nums">{money(document.totalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Người lập</div>
            <div className="font-medium">{document.createdByName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ghi sổ lúc</div>
            <div className="font-medium">{formatDate(document.postedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Người ghi sổ</div>
            <div className="font-medium">{document.postedByName ?? "Chưa có"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cập nhật gần nhất</div>
            <div className="font-medium">{formatDate(document.updatedAt)}</div>
          </div>
          {document.status === "VOIDED" && (
            <div>
              <div className="text-xs text-muted-foreground">Lý do hủy</div>
              <div className="font-medium text-destructive">{document.voidReason ?? "Không có"}</div>
            </div>
          )}
          {document.note && (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs text-muted-foreground">Ghi chú</div>
              <div className="font-medium">{document.note}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Dòng thu chi</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {document.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.lineNo}</TableCell>
                  <TableCell className="font-medium">{line.category}</TableCell>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(line.amount)}</TableCell>
                  <TableCell>{line.note ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
