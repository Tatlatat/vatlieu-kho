import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth-helpers";
import { getFunds, listCashEntries, getCashReport, getFundBalances } from "@/lib/queries/cash";
import { CASH_CATEGORY_LABELS } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Xuất sổ quỹ (bút toán + tổng theo hạng mục) ra .xlsx. */
export async function GET(req: NextRequest) {
  await requireUser();

  const sp = req.nextUrl.searchParams;
  const funds = await getFunds();
  const fundId = sp.get("fund") && funds.some((f) => f.id === sp.get("fund")) ? sp.get("fund")! : funds[0]?.id;
  if (!fundId) return new NextResponse("Chưa có quỹ", { status: 400 });

  const now = new Date();
  // Dựng chuỗi YYYY-MM-01 thủ công (không qua toISOString) để không lệch ngày theo timezone server.
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const from = sp.get("from") ?? firstOfMonth;
  const to = sp.get("to") ?? todayStr;

  const [entries, report, balances] = await Promise.all([
    listCashEntries(fundId, from, to),
    getCashReport(fundId, from, to),
    getFundBalances(fundId),
  ]);
  const fund = funds.find((f) => f.id === fundId)!;
  const balance = balances.length ? balances[0].balance : 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Vật Liệu";
  const ws = wb.addWorksheet("Sổ quỹ");

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = `SỔ QUỸ — ${fund.name}`;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = `Kỳ: ${from} → ${to}  |  Tồn quỹ hiện tại: ${Math.round(balance).toLocaleString("vi-VN")} đ`;
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.addRow([]);
  const sumRow = ws.addRow([`Tổng THU: ${Math.round(report.totalIn).toLocaleString("vi-VN")} đ`, "", `Tổng CHI: ${Math.round(report.totalOut).toLocaleString("vi-VN")} đ`]);
  sumRow.font = { bold: true };
  ws.addRow([]);

  const header = ws.addRow(["Ngày", "Loại", "Hạng mục", "Số tiền", "Diễn giải", "Người lập", "Trạng thái"]);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  for (const e of entries) {
    const d = new Date(e.entryDate);
    const dateStr = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    ws.addRow([
      dateStr,
      e.type === "THU" ? "Thu" : "Chi",
      CASH_CATEGORY_LABELS[e.category] ?? e.category,
      Math.round(e.amount),
      e.note ?? "",
      e.createdByName ?? "",
      e.voidedAt ? "Đã hủy" : "",
    ]);
  }

  ws.columns.forEach((col, i) => {
    col.width = i === 4 ? 30 : i === 2 ? 20 : 14;
  });

  const buf = await wb.xlsx.writeBuffer();
  const filename = `so-quy_${fund.code}_${from}_${to}.xlsx`;
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
