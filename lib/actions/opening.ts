"use server";

import { revalidatePath } from "next/cache";
import { readSheet } from "read-excel-file/node";
import { requirePermission } from "@/lib/auth-helpers";
import { parseDocumentDate } from "@/lib/inventory/document-form";
import { buildStockMovementInputs } from "@/lib/inventory/posting";
import { groupOpeningRowsByWarehouse, parseOpeningBalanceRows } from "@/lib/opening/import";
import { assertAccountingPeriodUnlocked } from "@/lib/period-locks";
import { prisma } from "@/lib/prisma";

export interface OpeningImportResult {
  ok: boolean;
  error?: string;
  documentCount?: number;
  lineCount?: number;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function documentCode(index: number): string {
  return `TDK-${Date.now().toString(36).toUpperCase()}-${index + 1}`;
}

function fileFromFormData(formData: FormData): File | null {
  const file = formData.get("file");
  if (!(file instanceof File)) return null;
  if (file.size <= 0) return null;
  return file;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function readWorkbookRows(file: File): Promise<unknown[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sheetRows = await readSheet(buffer as unknown as Parameters<typeof readSheet>[0]);
  const headerRow = sheetRows[0];
  if (!headerRow) throw new Error("File Excel không có sheet dữ liệu");
  const headers = headerRow.map((cell) => String(cell ?? "").trim());
  return sheetRows.slice(1).map((row) => {
    const record: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      record[header] = value == null ? "" : typeof value === "number" ? value : value instanceof Date ? value.toISOString() : String(value);
    });
    return record;
  });
}

/** Import tồn đầu kỳ: mỗi kho trong file trở thành một phiếu OPENING đã ghi sổ. */
export async function createOpeningBalanceDocument(formData: FormData): Promise<OpeningImportResult> {
  const user = await requirePermission("inventory.opening.import");
  const file = fileFromFormData(formData);
  if (!file) return { ok: false, error: "Vui lòng chọn file Excel tồn đầu kỳ" };

  let rows;
  let documentDate;
  try {
    rows = parseOpeningBalanceRows(await readWorkbookRows(file));
    documentDate = parseDocumentDate(formData);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "File tồn đầu kỳ không hợp lệ" };
  }

  const warehouseCodes = unique(rows.map((row) => row.warehouseCode));
  const materialCodes = unique(rows.map((row) => row.materialCode));
  const [warehouses, materials] = await Promise.all([
    prisma.warehouse.findMany({
      where: { code: { in: warehouseCodes } },
      select: { id: true, code: true },
    }),
    prisma.material.findMany({
      where: { code: { in: materialCodes } },
      select: { id: true, code: true },
    }),
  ]);

  const warehouseByCode = new Map(warehouses.map((warehouse) => [warehouse.code, warehouse]));
  const materialByCode = new Map(materials.map((material) => [material.code, material]));
  const missingWarehouses = warehouseCodes.filter((code) => !warehouseByCode.has(code));
  const missingMaterials = materialCodes.filter((code) => !materialByCode.has(code));
  if (missingWarehouses.length > 0) {
    return { ok: false, error: `Không tìm thấy kho: ${missingWarehouses.join(", ")}` };
  }
  if (missingMaterials.length > 0) {
    return { ok: false, error: `Không tìm thấy vật tư: ${missingMaterials.join(", ")}` };
  }

  const note = formString(formData, "note") || null;
  const groups = groupOpeningRowsByWarehouse(rows);
  try {
    await prisma.$transaction(async (tx) => {
      await assertAccountingPeriodUnlocked(tx, { documentDate, scope: "INVENTORY" });

      const postedAt = new Date();
      for (const [index, group] of groups.entries()) {
        const warehouse = warehouseByCode.get(group.warehouseCode);
        if (!warehouse) throw new Error(`Không tìm thấy kho: ${group.warehouseCode}`);

        const doc = await tx.inventoryDocument.create({
          data: {
            code: documentCode(index),
            kind: "OPENING",
            status: "POSTED",
            documentDate,
            warehouseId: warehouse.id,
            reason: "PURCHASE",
            note,
            createdById: user.id,
            postedById: user.id,
            postedAt,
            lines: {
              create: group.rows.map((row, lineIndex) => {
                const material = materialByCode.get(row.materialCode);
                if (!material) throw new Error(`Không tìm thấy vật tư: ${row.materialCode}`);
                return {
                  lineNo: lineIndex + 1,
                  materialId: material.id,
                  quantity: row.quantity,
                  note: row.note,
                };
              }),
            },
            auditLogs: {
              create: {
                action: "POST",
                toRevisionNo: 1,
                changedById: user.id,
                reason: "Import tồn đầu kỳ từ Excel",
              },
            },
          },
          include: { lines: true },
        });

        const movements = buildStockMovementInputs(
          {
            id: doc.id,
            kind: "OPENING",
            revisionNo: doc.revisionNo,
            warehouseId: doc.warehouseId,
            note: doc.note,
            lines: doc.lines,
          },
          user.id
        );
        await tx.stockMovement.createMany({ data: movements });
      }
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể import tồn đầu kỳ" };
  }

  revalidatePath("/");
  revalidatePath("/bao-cao");
  revalidatePath("/lich-su");
  revalidatePath("/ton-dau-ky");
  return { ok: true, documentCount: groups.length, lineCount: rows.length };
}
