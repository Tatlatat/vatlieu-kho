import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAtLeast } from "@/lib/auth-helpers";
import { getProjectCashSummary } from "@/lib/queries/cash";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAtLeast("MANAGER");

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const from = sp.get("from") ?? firstOfMonth;
  const to = sp.get("to") ?? todayStr;
  const rows = await getProjectCashSummary(from, to);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Vật Liệu";
  const ws = wb.addWorksheet("Tong hop quy");

  ws.addRow(["Mã công trình", "Tên công trình", "Số quỹ", "Tổng thu", "Tổng chi", "Tồn trong kỳ"]);
  rows.forEach((row) => {
    ws.addRow([
      row.project_code ?? "",
      row.project_name,
      row.fund_count,
      Math.round(row.total_in),
      Math.round(row.total_out),
      Math.round(row.balance),
    ]);
  });
  ws.columns.forEach((col, index) => {
    col.width = index === 1 ? 28 : 16;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tong-hop-quy_${from}_${to}.xlsx"`,
    },
  });
}
