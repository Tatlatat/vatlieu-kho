import { prisma } from "@/lib/prisma";
import { REASON_LABELS } from "@/lib/validation";
import { getCurrentStock } from "@/lib/queries/stock";

export interface LossByMonthRow {
  month: string;
  reason: string;
  total_qty: number;
  movement_count: number;
}

/** Tổng quan dashboard: số liệu cho các card. */
export async function getDashboardSummary() {
  const stock = await getCurrentStock();
  const totalMaterials = stock.length;
  const lowCount = stock.filter((s) => s.status === "LOW").length;
  const outCount = stock.filter((s) => s.status === "OUT").length;

  // Hao hụt tháng hiện tại (tổng số lượng OUT lý do hao hụt)
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const rows = await prisma.$queryRaw<LossByMonthRow[]>`
    SELECT month, reason, total_qty, movement_count FROM loss_by_month
  `;
  const data = rows.map((r) => ({ ...r, total_qty: Number(r.total_qty), movement_count: Number(r.movement_count) }));
  const lossThisMonth = data
    .filter((r) => r.month === monthKey)
    .reduce((s, r) => s + r.total_qty, 0);

  return { totalMaterials, lowCount, outCount, lossThisMonth };
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
    JOIN "Material" m ON m.id = sm."materialId"
    WHERE sm.type = 'OUT'
      AND sm.reason IN ('DAMAGED','EXPIRED','NATURAL_LOSS','STOCKTAKE_ADJUST')
    GROUP BY m.name, m.unit
    ORDER BY total DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

/** Vật liệu cần chú ý (sắp hết / hết). */
export async function getAlerts() {
  const stock = await getCurrentStock();
  return stock.filter((s) => s.status !== "OK");
}
