export interface ParsedOpeningBalanceRow {
  rowNumber: number;
  warehouseCode: string;
  materialCode: string;
  quantity: number;
  note?: string;
}

export interface OpeningRowsByWarehouse {
  warehouseCode: string;
  rows: ParsedOpeningBalanceRow[];
}

const WAREHOUSE_KEYS = ["warehouseCode", "Mã kho", "Ma kho", "Kho"];
const MATERIAL_KEYS = ["materialCode", "Mã vật tư", "Ma vat tu", "Mã hàng", "Ma hang"];
const QUANTITY_KEYS = ["quantity", "Số lượng", "So luong", "SL"];
const NOTE_KEYS = ["note", "Ghi chú", "Ghi chu"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cellString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function cellValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function parseQuantity(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const trimmed = value.trim();
  const decimalNormalized = trimmed.includes(",") && !trimmed.includes(".") ? trimmed.replace(",", ".") : trimmed;
  return Number(decimalNormalized);
}

function isBlankRow(row: Record<string, unknown>): boolean {
  return [...WAREHOUSE_KEYS, ...MATERIAL_KEYS, ...QUANTITY_KEYS, ...NOTE_KEYS].every((key) => {
    const value = row[key];
    return value == null || String(value).trim() === "";
  });
}

export function parseOpeningBalanceRows(inputRows: unknown[]): ParsedOpeningBalanceRow[] {
  const parsedRows: ParsedOpeningBalanceRow[] = [];

  inputRows.forEach((inputRow, index) => {
    const rowNumber = index + 2;
    const row = asRecord(inputRow);
    if (isBlankRow(row)) return;

    const warehouseCode = cellString(row, WAREHOUSE_KEYS);
    if (!warehouseCode) throw new Error(`Dòng ${rowNumber}: thiếu mã kho`);

    const materialCode = cellString(row, MATERIAL_KEYS);
    if (!materialCode) throw new Error(`Dòng ${rowNumber}: thiếu mã vật tư`);

    const quantity = parseQuantity(cellValue(row, QUANTITY_KEYS));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Dòng ${rowNumber}: số lượng phải lớn hơn 0`);
    }

    const note = cellString(row, NOTE_KEYS);
    parsedRows.push({
      rowNumber,
      warehouseCode,
      materialCode,
      quantity,
      note: note || undefined,
    });
  });

  if (parsedRows.length === 0) {
    throw new Error("File tồn đầu kỳ không có dòng dữ liệu");
  }

  return parsedRows;
}

export function groupOpeningRowsByWarehouse(rows: ParsedOpeningBalanceRow[]): OpeningRowsByWarehouse[] {
  const grouped = new Map<string, ParsedOpeningBalanceRow[]>();
  for (const row of rows) {
    const currentRows = grouped.get(row.warehouseCode) ?? [];
    currentRows.push(row);
    grouped.set(row.warehouseCode, currentRows);
  }

  return Array.from(grouped.entries()).map(([warehouseCode, groupRows]) => ({
    warehouseCode,
    rows: groupRows,
  }));
}
