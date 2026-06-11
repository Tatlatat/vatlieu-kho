import { prisma } from "@/lib/prisma";
import { REASON_LABELS } from "@/lib/validation";
import {
  effectiveStockMovementJoinsSql,
  effectiveStockMovementWhereSql,
} from "@/lib/inventory/ledger-scope";
import { getCurrentStock, type StockStatus } from "@/lib/queries/stock";

export interface LossByMonthRow {
  month: string;
  reason: string;
  total_qty: number;
  movement_count: number;
}

export interface DashboardSummary {
  totalMaterials: number;
  lowCount: number;
  outCount: number;
  lossThisMonth: number;
}

export function buildDashboardSummary({
  stockRows,
  lossRows,
  monthKey,
}: {
  stockRows: Array<{ status: StockStatus }>;
  lossRows: Array<{ month: string; total_qty: number }>;
  monthKey: string;
}): DashboardSummary {
  return {
    totalMaterials: stockRows.length,
    lowCount: stockRows.filter((s) => s.status === "LOW").length,
    outCount: stockRows.filter((s) => s.status === "OUT").length,
    lossThisMonth: lossRows
      .filter((r) => r.month === monthKey)
      .reduce((sum, row) => sum + Number(row.total_qty), 0),
  };
}

function numberFromDb(value: unknown): number {
  return value == null ? 0 : Number(value);
}

/** Tổng quan dashboard: số liệu cho các card. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [row] = await prisma.$queryRaw<
    {
      total_materials: number;
      low_count: number;
      out_count: number;
      loss_this_month: number;
    }[]
  >`
    SELECT
      COUNT(*)::int AS total_materials,
      COUNT(*) FILTER (WHERE total_on_hand > 0 AND total_on_hand <= min_stock)::int AS low_count,
      COUNT(*) FILTER (WHERE total_on_hand <= 0)::int AS out_count,
      COALESCE(
        (SELECT SUM(total_qty) FROM loss_by_month WHERE month = ${monthKey}),
        0
      ) AS loss_this_month
    FROM stock_by_material
  `;

  return {
    totalMaterials: numberFromDb(row?.total_materials),
    lowCount: numberFromDb(row?.low_count),
    outCount: numberFromDb(row?.out_count),
    lossThisMonth: numberFromDb(row?.loss_this_month),
  };
}

/** Hao hụt theo tháng (gộp tất cả nguyên nhân) — cho BarChart. */
export async function getLossByMonth() {
  const rows = await prisma.$queryRaw<LossByMonthRow[]>`
    SELECT month, reason, total_qty FROM loss_by_month ORDER BY month
  `;
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + Number(r.total_qty));
  }
  return Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }));
}

/** Hao hụt theo nguyên nhân — cho PieChart. */
export async function getLossByReason() {
  const rows = await prisma.$queryRaw<LossByMonthRow[]>`
    SELECT reason, total_qty FROM loss_by_month
  `;
  const byReason = new Map<string, number>();
  for (const r of rows) {
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + Number(r.total_qty));
  }
  return Array.from(byReason.entries()).map(([reason, total]) => ({
    reason,
    label: REASON_LABELS[reason] ?? reason,
    total,
  }));
}

/** Top vật liệu hao hụt nhiều nhất. */
export async function getTopLossMaterials(limit = 5) {
  const rows = await prisma.$queryRaw<{ name: string; unit: string; total: number }[]>`
    SELECT m.name, m.unit, SUM(sm.quantity) AS total
    FROM "StockMovement" sm
    ${effectiveStockMovementJoinsSql}
    JOIN "Material" m ON m.id = sm."materialId"
    WHERE sm.type = 'OUT'
      AND ${effectiveStockMovementWhereSql}
      AND sm.reason IN ('DAMAGED','EXPIRED','NATURAL_LOSS','STOCKTAKE_ADJUST')
    GROUP BY m.name, m.unit
    ORDER BY total DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

/** Vật liệu cần chú ý (sắp hết / hết). */
export async function getAlerts() {
  const stock = await getCurrentStock(undefined, { includeZero: true });
  return stock.filter((s) => s.status !== "OK");
}
