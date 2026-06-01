import * as React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { listStocktakes } from "@/lib/queries/stocktake";
import { NewStocktakeButton } from "@/components/new-stocktake-button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function KiemKePage() {
  await requireUser();
  const takes = await listStocktakes();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kiểm Kê Kho
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý và lập phiếu kiểm kê hao hụt định kỳ
          </p>
        </div>
        <NewStocktakeButton />
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách phiếu kiểm kê</CardTitle>
        </CardHeader>
        <CardContent>
          {takes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có phiếu kiểm kê nào được tạo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiếu</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng hao hụt</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {takes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-medium">{t.code}</TableCell>
                    <TableCell>
                      {new Date(t.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{t.createdBy.name}</TableCell>
                    <TableCell>
                      {t.status === "DRAFT" ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent px-2.5 py-0.5">
                          Nháp
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent px-2.5 py-0.5">
                          Đã duyệt
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {t.totalLoss > 0 ? `-${t.totalLoss}` : "0"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/kiem-ke/${t.id}`}
                        className="text-sm text-primary hover:underline font-semibold"
                      >
                        Xem
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
