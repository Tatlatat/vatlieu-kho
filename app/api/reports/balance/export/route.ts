import { requirePermission } from "@/lib/auth-helpers";
import { buildBalanceReportWorkbook } from "@/lib/excel/workbook";
import { getBalanceReport } from "@/lib/queries/balance";
import { getWarehouses } from "@/lib/queries/warehouses";

export const dynamic = "force-dynamic";

function todayInputValue() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function firstOfMonthInputValue() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(req: Request) {
  await requirePermission("inventory.report.view");
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || firstOfMonthInputValue();
  const to = searchParams.get("to") || todayInputValue();
  const warehouseId = searchParams.get("wh") || undefined;
  const [rows, warehouses] = await Promise.all([
    getBalanceReport(from, to, warehouseId),
    warehouseId ? getWarehouses() : Promise.resolve([]),
  ]);
  const warehouse = warehouseId ? warehouses.find((item) => item.id === warehouseId) : null;
  const buffer = buildBalanceReportWorkbook({
    from,
    to,
    warehouseLabel: warehouse ? `${warehouse.name} (${warehouse.code})` : "Tất cả kho",
    rows,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-nxt-${from}-${to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
