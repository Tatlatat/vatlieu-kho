"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { OUT_REASONS } from "@/lib/validation";
import { parseDocumentDate, parseDocumentLines } from "@/lib/inventory/document-form";
import { buildStockMovementInputs, type MovementReasonValue } from "@/lib/inventory/posting";
import { resolveProjectLineAssignments } from "@/lib/projects/resolve-line-projects";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

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

/** Nhập kho: tạo phiếu nhập POSTED nhiều dòng, rồi sinh movement IN/PURCHASE. */
export async function createImport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const warehouseId = formString(formData, "warehouseId");
  const supplierId = formString(formData, "supplierId") || null;
  const note = formString(formData, "note") || undefined;
  if (!warehouseId) return { ok: false, error: "Vui lòng chọn kho" };

  let lines;
  let documentDate;
  try {
    lines = parseDocumentLines(formData);
    documentDate = parseDocumentDate(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) return { ok: false, error: "Nhà cung cấp không tồn tại" };
  }

  await prisma.$transaction(async (tx) => {
    const postedAt = new Date();
    const doc = await tx.inventoryDocument.create({
      data: {
        code: documentCode("PN"),
        kind: "IMPORT",
        status: "POSTED",
        documentDate,
        warehouseId,
        supplierId,
        reason: "PURCHASE",
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
            reason: "Ghi sổ phiếu nhập",
          },
        },
      },
      include: { lines: true },
    });

    const movements = buildStockMovementInputs(
      {
        id: doc.id,
        kind: "IMPORT",
        revisionNo: doc.revisionNo,
        warehouseId: doc.warehouseId,
        note: doc.note,
        lines: doc.lines,
      },
      user.id
    );
    await tx.stockMovement.createMany({ data: movements });
  });

  revalidatePath("/");
  revalidatePath("/nhap");
  revalidatePath("/lich-su");
  return { ok: true };
}

/** Xuất kho: tạo phiếu xuất POSTED nhiều dòng, chặn xuất quá tồn, rồi sinh movement OUT/<reason>. */
export async function createExport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const warehouseId = formString(formData, "warehouseId");
  const reason = formString(formData, "reason") as MovementReasonValue;
  const note = formString(formData, "note") || undefined;
  if (!warehouseId) return { ok: false, error: "Vui lòng chọn kho" };
  if (!OUT_REASONS.some((r) => r.value === reason)) return { ok: false, error: "Vui lòng chọn lý do xuất" };

  let lines;
  let documentDate;
  try {
    lines = parseDocumentLines(formData);
    documentDate = parseDocumentDate(formData);
    lines = await resolveProjectLineAssignments(lines);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  // Bug D fix: advisory lock + in-transaction re-check chống race condition tồn âm.
  try {
    await prisma.$transaction(async (tx) => {
      for (const [materialId, quantity] of aggregateLineQuantities(lines)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${materialId + ":" + warehouseId}))`;
        const rows = await tx.$queryRaw<{ on_hand: number }[]>`
          SELECT on_hand FROM current_stock
          WHERE material_id = ${materialId} AND warehouse_id = ${warehouseId}`;
        const onHand = rows.length ? Number(rows[0].on_hand) : 0;
        if (quantity > onHand) {
          throw new Error(`Không đủ tồn tại kho này. Hiện còn ${onHand}.`);
        }
      }

      const postedAt = new Date();
      const doc = await tx.inventoryDocument.create({
        data: {
          code: documentCode("PX"),
          kind: "EXPORT",
          status: "POSTED",
          documentDate,
          warehouseId,
          reason,
          note,
          createdById: user.id,
          postedById: user.id,
          postedAt,
          lines: {
            create: lines.map((line, index) => ({
              lineNo: index + 1,
              materialId: line.materialId,
              quantity: line.quantity,
              projectId: line.projectId,
              workItemId: line.workItemId,
              note: line.note,
            })),
          },
          auditLogs: {
            create: {
              action: "POST",
              toRevisionNo: 1,
              changedById: user.id,
              reason: "Ghi sổ phiếu xuất",
            },
          },
        },
        include: { lines: true },
      });

      const movements = buildStockMovementInputs(
        {
          id: doc.id,
          kind: "EXPORT",
          revisionNo: doc.revisionNo,
          warehouseId: doc.warehouseId,
          reason,
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

  revalidatePath("/");
  revalidatePath("/xuat");
  revalidatePath("/lich-su");
  return { ok: true };
}
