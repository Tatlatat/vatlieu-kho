import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { getCurrentStock } from "@/lib/queries/stock";
import { StockStatusBadge } from "@/components/stock-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Search } from "lucide-react";

const actions = [
  { href: "/nhap", label: "Nhập hàng", icon: ArrowDownToLine, color: "bg-blue-600" },
  { href: "/xuat", label: "Xuất hàng", icon: ArrowUpFromLine, color: "bg-green-600" },
  { href: "/kiem-ke", label: "Kiểm kê kho", icon: ClipboardCheck, color: "bg-amber-600" },
  { href: "/lich-su", label: "Lịch sử", icon: Search, color: "bg-slate-500" },
];

export default async function HomePage() {
  const user = await requireUser();
  const stock = await getCurrentStock();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Xin chào, {user.name}</h1>
        <p className="text-sm text-slate-500">Chọn thao tác hoặc xem tồn kho bên dưới.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => {
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
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Vật liệu đang có trong kho</h2>
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
