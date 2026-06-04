export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDocument } from "@/lib/queries/documents";
import { DocStatusBadge } from "@/components/status-badge-doc";
import { DocumentDetailActions } from "@/components/document-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChuyenKhoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc || doc.type !== "TRANSFER") {
    notFound();
  }

  const formatDate = (dateInput: Date | string) => {
    if (!dateInput) return "—";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/chuyen-kho"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <DocumentDetailActions id={doc.id} status={doc.status} type={doc.type} />
      </div>

      <Card>
        <CardHeader className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-bold">{doc.code}</CardTitle>
              <DocStatusBadge status={doc.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Phiếu chuyển kho nội bộ giữa các kho hàng
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
              Ngày chứng từ
            </span>
            <span className="text-sm font-semibold">{formatDate(doc.docDate)}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                Kho nguồn
              </span>
              <span className="text-sm font-medium mt-1 block">
                {doc.fromWarehouse?.name || "—"} ({doc.fromWarehouse?.code || "—"})
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                Kho đích
              </span>
              <span className="text-sm font-medium mt-1 block text-green-700 font-semibold">
                {doc.toWarehouse?.name || "—"} ({doc.toWarehouse?.code || "—"})
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                Người lập phiếu
              </span>
              <span className="text-sm font-medium mt-1 block">
                {doc.createdBy?.name || "—"}
              </span>
            </div>
            {doc.approvedBy && (
              <div>
                <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                  Người duyệt phiếu
                </span>
                <span className="text-sm font-medium mt-1 block text-green-600">
                  {doc.approvedBy.name}
                </span>
              </div>
            )}
            {doc.voidedBy && (
              <div>
                <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                  Người hủy phiếu
                </span>
                <span className="text-sm font-medium mt-1 block text-destructive">
                  {doc.voidedBy.name}
                </span>
              </div>
            )}
            <div className="sm:col-span-2 md:col-span-4">
              <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                Ghi chú phiếu
              </span>
              <span className="text-sm mt-1 block italic text-muted-foreground bg-muted/30 p-2.5 rounded-md border">
                {doc.note || "Không có ghi chú"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Danh sách vật tư chi tiết</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">#</TableHead>
                    <TableHead className="w-[45%]">Tên / Mã vật tư</TableHead>
                    <TableHead className="w-[15%] text-right">Số lượng</TableHead>
                    <TableHead className="w-[10%]">Đơn vị</TableHead>
                    <TableHead className="w-[20%]">Ghi chú dòng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.lines.map((line, idx) => (
                    <TableRow key={line.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {line.material.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {line.material.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {line.quantity}
                      </TableCell>
                      <TableCell>{line.material.unit}</TableCell>
                      <TableCell className="text-muted-foreground text-xs italic">
                        {line.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
