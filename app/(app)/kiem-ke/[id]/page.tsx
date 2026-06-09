import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getStocktake } from "@/lib/queries/stocktake";
import { StocktakeDetail } from "@/components/stocktake-detail";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KiemKeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const stocktake = await getStocktake(id);

  if (!stocktake) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kiem-ke">
          <Button variant="outline" size="sm" className="cursor-pointer">
            Quay lại
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Chi Tiết Phiếu Kiểm Kê
        </h1>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-foreground">
                {stocktake.code}
              </span>
              {stocktake.status === "DRAFT" ? (
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent px-2.5 py-0.5">
                  Nháp
                </Badge>
              ) : stocktake.status === "VOIDED" ? (
                <Badge variant="destructive" className="border-transparent px-2.5 py-0.5">
                  Đã hủy
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent px-2.5 py-0.5">
                  Đã duyệt
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Người lập: <span className="font-medium text-foreground">{stocktake.createdBy.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Kho: <span className="font-medium text-foreground">{stocktake.warehouse?.name}</span>
            </p>
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            <p>
              Ngày lập:{" "}
              <span className="font-medium text-foreground">
                {new Date(stocktake.createdAt).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
            {stocktake.approvedAt && stocktake.approvedBy && (
              <p>
                Người duyệt:{" "}
                <span className="font-medium text-foreground">
                  {stocktake.approvedBy.name}
                </span>{" "}
                vào{" "}
                <span className="font-medium text-foreground">
                  {new Date(stocktake.approvedAt).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <StocktakeDetail stocktake={stocktake} role={user.role} />
        </CardContent>
      </Card>
    </div>
  );
}
