import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "@/lib/queries/stock";

const MAP: Record<StockStatus, { label: string; className: string }> = {
  OK: { label: "✅ Đủ", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  LOW: { label: "⚠️ Sắp hết", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  OUT: { label: "🔴 Hết hàng", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const s = MAP[status] ?? MAP.OK;
  return (
    <Badge variant="secondary" className={s.className}>
      {s.label}
    </Badge>
  );
}
