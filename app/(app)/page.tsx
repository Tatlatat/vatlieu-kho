import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessPermission } from "@/lib/permissions/effective";
import { getUserPermissionSnapshot } from "@/lib/permissions/service";
import { getCurrentStock } from "@/lib/queries/stock";
import { getDashboardSummary } from "@/lib/queries/reports";
import { getWarehouses } from "@/lib/queries/warehouses";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { WarehouseFilter } from "@/components/warehouse-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Search,
  TrendingDown,
  ChevronRight,
  Wallet,
} from "lucide-react";

const actions = [
  { href: "/nhap", label: "Nhập hàng", icon: ArrowDownToLine, color: "bg-blue-600", permission: "inventory.import.view" },
  { href: "/xuat", label: "Xuất hàng", icon: ArrowUpFromLine, color: "bg-green-600", permission: "inventory.export.view" },
  { href: "/quy", label: "Quỹ", icon: Wallet, color: "bg-cyan-700", permission: "fund.view" },
  { href: "/kiem-ke", label: "Kiểm kê kho", icon: ClipboardCheck, color: "bg-amber-600", permission: "inventory.stocktake.view" },
  { href: "/lich-su", label: "Lịch sử", icon: Search, color: "bg-slate-500", permission: "inventory.history.view" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ wh?: string }>;
}) {
  const user = await requireUser();
  const permissions = await getUserPermissionSnapshot(user.id);
  const canViewReports = canAccessPermission(permissions, "inventory.report.view");
  const sp = await searchParams;
  const wh = sp.wh ?? "";
  const [stock, summary, warehouses] = await Promise.all([
    getCurrentStock(wh || undefined),
    canViewReports ? getDashboardSummary() : Promise.resolve(null),
    getWarehouses(),
  ]);
  const visibleActions = actions.filter((action) => canAccessPermission(permissions, action.permission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Xin chào, {user.name}</h1>
        <p className="text-sm text-slate-500">Chọn thao tác hoặc xem tồn kho bên dưới.</p>
      </div>

      {canViewReports && summary && (
        <Link
          href="/bao-cao"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Hao hụt tháng này
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {summary.lossThisMonth.toLocaleString("vi-VN")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-300">
            Xem báo cáo chi tiết
            <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visibleActions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl ${a.color} text-white shadow-sm transition hover:opacity-90`}
            >
              <Icon className="h-7 w-7" />
              <span className="text-base font-medium">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Vật liệu đang có trong kho</h2>
          <WarehouseFilter warehouses={warehouses} value={wh} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vật liệu</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead className="text-right">Tối thiểu</TableHead>
              <TableHead className="text-center">Tình trạng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((s) => (
              <TableRow key={s.material_id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.code}</div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {s.on_hand.toLocaleString("vi-VN")} {s.unit}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {s.min_stock.toLocaleString("vi-VN")} {s.unit}
                </TableCell>
                <TableCell className="text-center">
                  <StockStatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
            {stock.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400">
                  Chưa có vật liệu nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
