import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export interface OpeningImportRow {
  rowNumber: number;
  warehouseCode: string;
  materialCode: string;
  quantity: number;
}

export interface OpeningImportValidationError {
  rowNumber: number;
  message: string;
}

export interface OpeningImportValidationResult {
  entries: { warehouseId: string; materialId: string; quantity: number }[];
  errors: OpeningImportValidationError[];
}

export async function parseOpeningStockWorkbook(buffer: ArrayBuffer): Promise<OpeningImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  const loadInput = Buffer.from(buffer) as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await workbook.xlsx.load(loadInput);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: OpeningImportRow[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const warehouseCode = String(row.getCell(1).value ?? "").trim();
    const materialCode = String(row.getCell(2).value ?? "").trim();
    const quantityRaw = row.getCell(3).value;
    const quantity = typeof quantityRaw === "object" && quantityRaw !== null && "result" in quantityRaw
      ? Number(quantityRaw.result)
      : Number(quantityRaw ?? 0);
    if (!warehouseCode && !materialCode && !quantityRaw) return;
    rows.push({ rowNumber: index, warehouseCode, materialCode, quantity });
  });
  return rows;
}

export async function validateOpeningRows(rows: OpeningImportRow[]): Promise<OpeningImportValidationResult> {
  const errors: OpeningImportValidationError[] = [];
  const entries: { warehouseId: string; materialId: string; quantity: number }[] = [];

  const warehouseCodes = [...new Set(rows.map((r) => r.warehouseCode).filter(Boolean))];
  const materialCodes = [...new Set(rows.map((r) => r.materialCode).filter(Boolean))];

  const [warehouses, materials] = await Promise.all([
    prisma.warehouse.findMany({ where: { code: { in: warehouseCodes } }, select: { id: true, code: true } }),
    prisma.material.findMany({ where: { code: { in: materialCodes } }, select: { id: true, code: true } }),
  ]);
  const warehouseByCode = new Map(warehouses.map((w) => [w.code, w.id]));
  const materialByCode = new Map(materials.map((m) => [m.code, m.id]));
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.warehouseCode) {
      errors.push({ rowNumber: row.rowNumber, message: "Thiếu ma_kho" });
      continue;
    }
    if (!row.materialCode) {
      errors.push({ rowNumber: row.rowNumber, message: "Thiếu ma_vat_tu" });
      continue;
    }
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
      errors.push({ rowNumber: row.rowNumber, message: "so_luong phải là số dương" });
      continue;
    }
    const warehouseId = warehouseByCode.get(row.warehouseCode);
    if (!warehouseId) {
      errors.push({ rowNumber: row.rowNumber, message: `Không tìm thấy kho "${row.warehouseCode}"` });
      continue;
    }
    const materialId = materialByCode.get(row.materialCode);
    if (!materialId) {
      errors.push({ rowNumber: row.rowNumber, message: `Không tìm thấy vật tư "${row.materialCode}"` });
      continue;
    }
    const pair = `${warehouseId}:${materialId}`;
    if (seen.has(pair)) {
      errors.push({ rowNumber: row.rowNumber, message: "Trùng cặp kho + vật tư trong file" });
      continue;
    }
    seen.add(pair);
    entries.push({ warehouseId, materialId, quantity: row.quantity });
  }

  const movementCounts = entries.length
    ? await Promise.all(
        entries.map((entry) =>
          prisma.stockMovement.count({
            where: { warehouseId: entry.warehouseId, materialId: entry.materialId },
          })
        )
      )
    : [];

  const filteredEntries: typeof entries = [];
  entries.forEach((entry, index) => {
    const row = rows.find((r) => warehouseByCode.get(r.warehouseCode) === entry.warehouseId && materialByCode.get(r.materialCode) === entry.materialId);
    if ((movementCounts[index] ?? 0) > 0) {
      errors.push({
        rowNumber: row?.rowNumber ?? index + 2,
        message: "Ô vật tư/kho này đã có giao dịch — không thể nhập tồn đầu kỳ",
      });
      return;
    }
    filteredEntries.push(entry);
  });

  return { entries: filteredEntries, errors };
}
