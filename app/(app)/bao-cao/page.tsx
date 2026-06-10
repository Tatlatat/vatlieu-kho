import * as React from "react";
import { can, requirePermission } from "@/lib/auth-helpers";
import {
  getDashboardSummary,
  getLossByMonth,
  getLossByReason,
  getTopLossMaterials,
  getAlerts,
} from "@/lib/queries/reports";
import { getBalanceReport } from "@/lib/queries/balance";
import { getFundReport } from "@/lib/queries/funds";
import { getWarehouses } from "@/lib/queries/warehouses";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { LossCharts } from "@/components/loss-charts-client";
import { BalanceReport } from "@/components/balance-report";
import { FundReport } from "@/components/fund-report";

export default async function BaoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; wh?: string; projectId?: string }>;
}) {
  const user = await requirePermission("inventory.report.view");

  const sp = await searchParams;

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const from = sp.from ?? firstOfMonth;
  const to = sp.to ?? todayStr;
  const wh = sp.wh ?? "";
  const projectId = sp.projectId ?? "";
  const canViewFund = await can(user.id, "fund.view");

  const [summary, monthData, reasonData, topLoss, alerts, balanceRows, warehouses, fundReport] =
    await Promise.all([
      getDashboardSummary(),
      getLossByMonth(),
      getLossByReason(),
      getTopLossMaterials(5),
      getAlerts(),
      getBalanceReport(from, to, wh || undefined),
      getWarehouses(),
      canViewFund ? getFundReport({ from, to, projectId: projectId || undefined }) : Promise.resolve(null),
    ]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Báo Cáo Thống Kê & Phân Tích
        </h1>
        <p className="text-sm text-muted-foreground">
          Thống kê hao hụt vật liệu, trạng thái kho dành cho Ban Quản Lý (Owner)
        </p>
      </div>

      {/* Balance report — per period & warehouse */}
      <BalanceReport
        rows={balanceRows}
        warehouses={warehouses}
        from={from}
        to={to}
        warehouseId={wh}
      />

      {fundReport && <FundReport report={fundReport} compact />}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-xs border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Tổng số vật tư
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">đang được quản lý</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Sắp hết hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
              {summary.lowCount}
            </div>
            <p className="text-xs text-muted-foreground">chạm mức tối thiểu</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Đã hết hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary.outCount}
            </div>
            <p className="text-xs text-muted-foreground">cần nhập kho khẩn cấp</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Hao hụt tháng này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary.lossThisMonth > 0 ? `-${summary.lossThisMonth.toLocaleString("vi-VN")}` : "0"}
            </div>
            <p className="text-xs text-muted-foreground">từ đầu tháng đến nay</p>
          </CardContent>
        </Card>
      </div>

      {/* Loss Charts component */}
      <LossCharts monthData={monthData} reasonData={reasonData} />

      {/* Bottom tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Loss Materials */}
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Top 5 vật liệu hao hụt nhiều nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLoss.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Chưa ghi nhận hao hụt cho vật tư nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên vật liệu</TableHead>
                      <TableHead className="text-right">Tổng hao hụt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topLoss.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">
                          -{item.total.toLocaleString("vi-VN")} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts / Attention */}
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Cảnh báo vật tư cần chú ý
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-sm text-emerald-600 dark:text-emerald-500 font-medium">
                Tất cả vật tư đều có đủ tồn kho ổn định.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vật tư</TableHead>
                      <TableHead>Tồn kho</TableHead>
                      <TableHead className="text-right">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((item) => (
                      <TableRow key={item.material_id}>
                        <TableCell>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.code}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.on_hand.toLocaleString("vi-VN")}</span>
                          <span className="text-xs text-muted-foreground">
                            {" "}/{item.min_stock.toLocaleString("vi-VN")} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <StockStatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
