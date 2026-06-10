"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { parseDocumentDate, parseDocumentLines } from "@/lib/inventory/document-form";
import { buildStockMovementInputs } from "@/lib/inventory/posting";
import type { ActionResult } from "@/lib/actions/movements";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function documentCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function aggregateLineQuantities(lines: Array<{ materialId: string; quantity: number }>) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.materialId, (totals.get(line.materialId) ?? 0) + line.quantity);
  }
  return totals;
}

export async function createTransfer(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("inventory.transfer.create");
  const fromWarehouseId = formString(formData, "fromWarehouseId");
  const toWarehouseId = formString(formData, "toWarehouseId");
  const note = formString(formData, "note") || undefined;
  if (!fromWarehouseId) return { ok: false, error: "Vui lòng chọn kho nguồn" };
  if (!toWarehouseId) return { ok: false, error: "Vui lòng chọn kho đích" };
  if (fromWarehouseId === toWarehouseId) return { ok: false, error: "Kho nguồn và kho đích phải khác nhau" };

  let lines;
  let documentDate;
  try {
    lines = parseDocumentLines(formData);
    documentDate = parseDocumentDate(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  // Bug D fix: advisory lock trên kho nguồn + re-check tồn trong transaction chống race condition.
  const transferId = randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      for (const [materialId, quantity] of aggregateLineQuantities(lines)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${materialId + ":" + fromWarehouseId}))`;
        const rows = await tx.$queryRaw<{ on_hand: number }[]>`
          SELECT on_hand FROM current_stock
          WHERE material_id = ${materialId} AND warehouse_id = ${fromWarehouseId}`;
        const onHand = rows.length ? Number(rows[0].on_hand) : 0;
        if (quantity > onHand) {
          throw new Error(`Kho nguồn không đủ tồn (còn ${onHand})`);
        }
      }

      const postedAt = new Date();
      const doc = await tx.inventoryDocument.create({
        data: {
          code: documentCode("CK"),
          kind: "TRANSFER",
          status: "POSTED",
          documentDate,
          fromWarehouseId,
          toWarehouseId,
          note,
          createdById: user.id,
          postedById: user.id,
          postedAt,
          lines: {
            create: lines.map((line, index) => ({
              lineNo: index + 1,
              materialId: line.materialId,
              quantity: line.quantity,
              note: line.note,
            })),
          },
          auditLogs: {
            create: {
              action: "POST",
              toRevisionNo: 1,
              changedById: user.id,
              reason: "Ghi sổ phiếu chuyển kho",
            },
          },
        },
        include: { lines: true },
      });

      const movements = buildStockMovementInputs(
        {
          id: doc.id,
          kind: "TRANSFER",
          revisionNo: doc.revisionNo,
          fromWarehouseId: doc.fromWarehouseId,
          toWarehouseId: doc.toWarehouseId,
          transferId,
          note: doc.note,
          lines: doc.lines,
        },
        user.id
      );
      await tx.stockMovement.createMany({ data: movements });
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/chuyen-kho");
  return { ok: true };
}
