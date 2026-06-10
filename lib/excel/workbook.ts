import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import type { BalanceRow } from "@/lib/queries/balance";
import type { ProjectNormReportRow } from "@/lib/queries/projects";

export interface BalanceWorkbookInput {
  from: string;
  to: string;
  warehouseLabel: string;
  rows: BalanceRow[];
}

export interface NormWorkbookInput {
  rows: ProjectNormReportRow[];
}

async function workbookBuffer(sheetName: string, rows: Record<string, string | number>[]): Promise<Buffer> {
  const headers = Object.keys(rows[0] ?? {});
  const sheetData: SheetData = [
    headers.map((header) => ({ value: header, type: String, fontWeight: "bold" })),
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ];
  const writer = writeXlsxFile(
    sheetData,
    {
      sheet: sheetName,
      columns: headers.map((header) => ({ width: Math.max(12, Math.min(32, header.length + 4)) })),
    },
    { fontFamily: "Arial", fontSize: 11 }
  );
  return writer.toBuffer();
}

export async function buildBalanceReportWorkbook(input: BalanceWorkbookInput): Promise<Buffer> {
  return workbookBuffer(
    "NXT",
    input.rows.map((row) => ({
      "Từ ngày": input.from,
      "Đến ngày": input.to,
      Kho: input.warehouseLabel,
      "Mã vật tư": row.code,
      "Tên vật tư": row.name,
      "Đơn vị": row.unit,
      "Đầu kỳ": row.opening,
      Nhập: row.in_qty,
      Xuất: row.out_qty,
      "Chuyển đến": row.transfer_in,
      "Chuyển đi": row.transfer_out,
      "Tồn cuối": row.closing,
    }))
  );
}

export async function buildNormReportWorkbook(input: NormWorkbookInput): Promise<Buffer> {
  return workbookBuffer(
    "Dinh muc",
    input.rows.map((row) => ({
      "Mã công trình": row.projectCode,
      "Công trình": row.projectName,
      "Hạng mục": row.workItemName,
      "Mã vật tư": row.materialCode,
      "Tên vật tư": row.materialName,
      "Đơn vị": row.materialUnit,
      "Định mức": row.normQty ?? "",
      "Đã xuất": row.actualQty,
      "Chênh lệch": row.varianceQty ?? "",
      "Trạng thái": row.statusLabel,
    }))
  );
}
