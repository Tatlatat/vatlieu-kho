import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
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
import { DocumentVoidButton } from "@/components/document-void-button";
import type { InventoryDocumentDetail as InventoryDocumentDetailData } from "@/lib/queries/documents";
import { cn } from "@/lib/utils";

interface Props {
  document: InventoryDocumentDetailData;
  canEdit: boolean;
  canVoid: boolean;
}

function statusClass(status: InventoryDocumentDetailData["status"]) {
  if (status === "POSTED") return "bg-emerald-500/10 text-emerald-700 border-transparent";
  if (status === "VOIDED") return "bg-destructive/10 text-destructive border-transparent";
  return "bg-amber-500/10 text-amber-700 border-transparent";
}

function listHref(kind: InventoryDocumentDetailData["kind"]) {
  if (kind === "IMPORT") return "/nhap";
  if (kind === "EXPORT") return "/xuat";
  if (kind === "TRANSFER") return "/chuyen-kho";
  return "/lich-su";
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

export function InventoryDocumentDetail({ document, canEdit, canVoid }: Props) {
  const canChange = document.status === "POSTED" && (document.kind === "IMPORT" || document.kind === "EXPORT" || document.kind === "TRANSFER");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href={listHref(document.kind)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{document.code}</h1>
            <Badge className={cn("px-2 py-0.5", statusClass(document.status))}>
              {document.statusLabel}
            </Badge>
            <Badge variant="outline" className="px-2 py-0.5">
              Lần {document.revisionNo}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{document.kindLabel}</p>
        </div>

        {canChange && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {canEdit && (
              <Link
                href={`/phieu/${document.id}/sua`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="size-4" />
                Sửa phiếu
              </Link>
            )}
            {canVoid && <DocumentVoidButton documentId={document.id} />}
          </div>
        )}
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
            <div className="text-xs text-muted-foreground">Kho</div>
            <div className="font-medium">{document.warehouseLabel}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Lý do</div>
            <div className="font-medium">{document.reasonLabel ?? "Không có"}</div>
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
          <CardTitle className="text-base font-semibold">Dòng vật tư</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Vật tư</TableHead>
                <TableHead>Công trình / hạng mục</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {document.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.lineNo}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{line.materialCode}</TableCell>
                  <TableCell className="font-medium">{line.materialName}</TableCell>
                  <TableCell>
                    {line.projectName ? (
                      <div>
                        <div className="font-medium">{line.projectName}</div>
                        <div className="text-xs text-muted-foreground">{line.workItemName ?? "Chung"}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Không gắn</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantity.toLocaleString("vi-VN")} {line.materialUnit}
                  </TableCell>
                  <TableCell>{line.note ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Bút toán kho</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kho</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.movements.map((movement) => (
                  <TableRow key={movement.id} className={!movement.isActive ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="font-medium">{movement.type === "IN" ? "Nhập" : "Xuất"}</div>
                      <div className="text-xs text-muted-foreground">{movement.reasonLabel}</div>
                    </TableCell>
                    <TableCell>{movement.warehouseName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {movement.quantity.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      {movement.isActive ? (
                        <Badge className="border-transparent bg-emerald-500/10 text-emerald-700">Hiệu lực</Badge>
                      ) : movement.isVoid ? (
                        <Badge variant="outline">Bút toán hủy</Badge>
                      ) : (
                        <Badge variant="outline">Phiên bản cũ</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Audit phiếu</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Thao tác</TableHead>
                  <TableHead>Người dùng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="tabular-nums">{formatDate(log.changedAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{log.actionLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.fromRevisionNo ? `Lần ${log.fromRevisionNo}` : ""}
                        {log.toRevisionNo ? ` -> lần ${log.toRevisionNo}` : ""}
                      </div>
                      {log.reason && <div className="text-xs text-muted-foreground">{log.reason}</div>}
                    </TableCell>
                    <TableCell>{log.changedByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
