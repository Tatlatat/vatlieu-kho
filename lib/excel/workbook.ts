import * as XLSX from "xlsx";
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

function workbookBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

function appendWorksheet(workbook: XLSX.WorkBook, sheetName: string, rows: Record<string, string | number>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
}

export function buildBalanceReportWorkbook(input: BalanceWorkbookInput): Buffer {
  const workbook = XLSX.utils.book_new();
  appendWorksheet(
    workbook,
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
  return workbookBuffer(workbook);
}

export function buildNormReportWorkbook(input: NormWorkbookInput): Buffer {
  const workbook = XLSX.utils.book_new();
  appendWorksheet(
    workbook,
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
  return workbookBuffer(workbook);
}
