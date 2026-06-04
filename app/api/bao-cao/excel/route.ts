import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth-helpers";
import { getBalanceReport } from "@/lib/queries/balance";
import { getWarehouses } from "@/lib/queries/warehouses";

export const dynamic = "force-dynamic";

/** Xuất báo cáo cân đối Đầu kỳ–Nhập–Xuất–Tồn ra file .xlsx (chỉ OWNER). */
export async function GET(req: NextRequest) {
  await requireRole("OWNER");

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  const from = sp.get("from") ?? firstOfMonth;
  const to = sp.get("to") ?? todayStr;
  const wh = sp.get("wh") ?? undefined;

  const [rows, warehouses] = await Promise.all([
    getBalanceReport(from, to, wh),
    getWarehouses(),
  ]);
  const whName = wh ? warehouses.find((w) => w.id === wh)?.name ?? "" : "Tất cả kho";

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Vật Liệu";
  const ws = wb.addWorksheet("Cân đối kho");

  // Tiêu đề
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "BÁO CÁO CÂN ĐỐI KHO";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Kỳ: ${from} → ${to}  |  Kho: ${whName}`;
  ws.getCell("A2").alignment = { horizontal: "center" };

  // Header bảng
  const headerRow = ws.addRow([
    "Mã vật tư", "Tên vật tư", "ĐVT",
    "Đầu kỳ", "Nhập", "Xuất", "Chuyển kho (ròng)", "Tồn cuối",
  ]);
  headerRow.font = { bold: true };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  for (const r of rows) {
    const transferNet = r.transfer_in - r.transfer_out;
    ws.addRow([
      r.code, r.name, r.unit,
      r.opening, r.in_qty, r.out_qty, transferNet, r.closing,
    ]);
  }

  // Độ rộng cột
  ws.columns.forEach((col, i) => {
    col.width = i === 1 ? 28 : i === 0 ? 14 : 14;
  });

  const buf = await wb.xlsx.writeBuffer();
  const filename = `bao-cao-kho_${from}_${to}.xlsx`;
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
