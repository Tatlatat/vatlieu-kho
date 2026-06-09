import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAtLeast } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAtLeast("MANAGER");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ton dau ky");
  ws.addRow(["ma_kho", "ma_vat_tu", "so_luong"]);
  ws.addRow(["KHO-CHINH", "XM-PCB40", 100]);
  ws.addRow(["KHO-CHINH", "THEP-D10", 50]);
  ws.columns.forEach((col, index) => {
    col.width = index === 2 ? 14 : 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-ton-dau-ky.xlsx"',
    },
  });
}
