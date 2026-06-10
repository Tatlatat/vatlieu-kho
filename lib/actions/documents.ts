"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/auth-helpers";
import { OUT_REASONS } from "@/lib/validation";
import { parseDocumentDate, parseDocumentLines } from "@/lib/inventory/document-form";
import {
  buildStockMovementInputs,
  type InventoryDocumentKind,
  type MovementReasonValue,
  type StockMovementInput,
} from "@/lib/inventory/posting";
import { buildRevisionSlotDeltas } from "@/lib/inventory/revision";
import { resolveProjectLineAssignments } from "@/lib/projects/resolve-line-projects";
import { stripLineProjectAssignment } from "@/lib/projects/line-projects";
import { getProjectNormWarnings, shouldRequireOverNormConfirmation } from "@/lib/projects/norm-warnings";
import { permissionForInventoryDocument } from "@/lib/permissions/inventory-permissions";
import { assertAccountingPeriodUnlocked } from "@/lib/period-locks";
import type { ActionResult } from "@/lib/actions/movements";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requireDocumentId(formData: FormData): string {
  const documentId = formString(formData, "documentId");
  if (!documentId) throw new Error("Thiếu phiếu");
  return documentId;
}

function activeMovementWhere(documentId: string): Prisma.StockMovementWhereInput {
  return {
    documentId,
    voidedAt: null,
    supersededAt: null,
    reason: { not: "VOID" },
  };
}

function snapshotDocument(doc: {
  id: string;
  code: string;
  kind: InventoryDocumentKind;
  status: string;
  documentDate: Date;
  warehouseId: string | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  supplierId?: string | null;
  reason: MovementReasonValue | null;
  note: string | null;
  revisionNo: number;
  lines: Array<{
    lineNo: number;
    materialId: string;
    projectId?: string | null;
    workItemId?: string | null;
    quantity: number;
    note: string | null;
  }>;
}) {
  return {
    id: doc.id,
    code: doc.code,
    kind: doc.kind,
    status: doc.status,
    documentDate: doc.documentDate.toISOString(),
      warehouseId: doc.warehouseId,
      fromWarehouseId: doc.fromWarehouseId,
      toWarehouseId: doc.toWarehouseId,
      supplierId: doc.supplierId ?? null,
      reason: doc.reason,
      note: doc.note,
    revisionNo: doc.revisionNo,
    lines: doc.lines.map((line) => ({
      lineNo: line.lineNo,
      materialId: line.materialId,
      projectId: line.projectId ?? null,
      workItemId: line.workItemId ?? null,
      quantity: line.quantity,
      note: line.note,
    })),
  };
}

function revalidateDocumentPaths(documentId: string) {
  revalidatePath("/");
  revalidatePath("/nhap");
  revalidatePath("/xuat");
  revalidatePath("/chuyen-kho");
  revalidatePath("/lich-su");
  revalidatePath("/bao-cao");
  revalidatePath("/cong-trinh");
  revalidatePath(`/phieu/${documentId}`);
  revalidatePath(`/phieu/${documentId}/sua`);
}

function isOverNormConfirmed(formData: FormData): boolean {
  return formString(formData, "allowOverNorm") === "true";
}

async function assertStockAfterDelta(
  tx: Prisma.TransactionClient,
  deltas: ReturnType<typeof buildRevisionSlotDeltas>
) {
  for (const slot of deltas) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot.materialId + ":" + slot.warehouseId}))`;
  }

  for (const slot of deltas) {
    if (slot.delta >= 0) continue;
    const rows = await tx.$queryRaw<{ on_hand: number }[]>`
      SELECT on_hand FROM current_stock
      WHERE material_id = ${slot.materialId} AND warehouse_id = ${slot.warehouseId}`;
    const onHand = rows.length ? Number(rows[0].on_hand) : 0;
    if (onHand + slot.delta < 0) {
      throw new Error(
        `Không thể lưu phiếu: tồn kho sẽ bị âm (cần ${Math.abs(slot.delta)}, còn ${onHand}).`
      );
    }
  }
}

function plannedDocumentForKind(args: {
  kind: InventoryDocumentKind;
  documentId: string;
  revisionNo: number;
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  transferId?: string | null;
  reason?: MovementReasonValue | null;
  note?: string | null;
  lines: Array<{ id: string; materialId: string; quantity: number; note?: string | null }>;
}) {
  return {
    id: args.documentId,
    kind: args.kind,
    revisionNo: args.revisionNo,
    warehouseId: args.warehouseId,
    fromWarehouseId: args.fromWarehouseId,
    toWarehouseId: args.toWarehouseId,
    transferId: args.transferId,
    reason: args.reason,
    note: args.note,
    lines: args.lines,
  };
}

function buildVoidReversals(args: {
  movements: Array<{
    id: string;
    materialId: string;
    warehouseId: string;
    type: "IN" | "OUT";
    quantity: number;
    documentId: string | null;
    documentLineId: string | null;
    documentRevisionNo: number | null;
    transferId: string | null;
  }>;
  reason: string;
  createdById: string;
}): Prisma.StockMovementCreateManyInput[] {
  return args.movements.map((movement) => {
    const reversalType = movement.type === "IN" ? "OUT" : "IN";
    return {
      materialId: movement.materialId,
      warehouseId: movement.warehouseId,
      type: reversalType,
      quantity: movement.quantity,
      reason: "VOID",
      note: `Hủy phiếu: ${args.reason}`,
      voidReversalOf: movement.id,
      documentId: movement.documentId,
      documentLineId: movement.documentLineId,
      documentRevisionNo: movement.documentRevisionNo,
      transferId: movement.transferId,
      createdById: args.createdById,
    };
  });
}

export async function voidInventoryDocument(formData: FormData): Promise<ActionResult> {
  await requireUser();

  let documentId: string;
  try {
    documentId = requireDocumentId(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const reason = formString(formData, "reason");
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do hủy" };

  const existingKind = await prisma.inventoryDocument.findUnique({
    where: { id: documentId },
    select: { kind: true },
  });
  if (!existingKind) return { ok: false, error: "Không tìm thấy phiếu" };

  const user = await requirePermission(permissionForInventoryDocument(existingKind.kind, "void"));

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.status === "VOIDED") throw new Error("Phiếu đã bị hủy");
      if (doc.status !== "POSTED") throw new Error("Chỉ hủy được phiếu đã ghi sổ");
      await assertAccountingPeriodUnlocked(tx, { documentDate: doc.documentDate, scope: "INVENTORY" });

      const activeMovements = await tx.stockMovement.findMany({
        where: activeMovementWhere(documentId),
      });
      if (activeMovements.length === 0) throw new Error("Phiếu không có bút toán còn hiệu lực");

      const deltas = buildRevisionSlotDeltas(activeMovements, []);
      await assertStockAfterDelta(tx, deltas);

      const voidedAt = new Date();
      const updated = await tx.stockMovement.updateMany({
        where: { id: { in: activeMovements.map((movement) => movement.id) }, voidedAt: null },
        data: { voidedAt, voidedById: user.id },
      });
      if (updated.count !== activeMovements.length) {
        throw new Error("Phiếu đã bị thay đổi bởi thao tác khác");
      }

      await tx.stockMovement.createMany({
        data: buildVoidReversals({
          movements: activeMovements,
          reason,
          createdById: user.id,
        }),
      });

      await tx.inventoryDocument.update({
        where: { id: documentId },
        data: {
          status: "VOIDED",
          voidedAt,
          voidedById: user.id,
          voidReason: reason,
          updatedById: user.id,
        },
      });

      await tx.documentAuditLog.create({
        data: {
          documentId,
          action: "VOID",
          fromRevisionNo: doc.revisionNo,
          toRevisionNo: doc.revisionNo,
          changedById: user.id,
          reason,
          snapshotBefore: snapshotDocument(doc),
        },
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi khi hủy phiếu" };
  }

  revalidateDocumentPaths(documentId);
  return { ok: true };
}

export async function updateInventoryDocument(formData: FormData): Promise<ActionResult> {
  await requireUser();

  let documentId: string;
  let lines: ReturnType<typeof parseDocumentLines>;
  let documentDate: Date;
  try {
    documentId = requireDocumentId(formData);
    lines = parseDocumentLines(formData);
    documentDate = parseDocumentDate(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const note = formString(formData, "note") || undefined;
  const warehouseId = formString(formData, "warehouseId") || null;
  const fromWarehouseId = formString(formData, "fromWarehouseId") || null;
  const toWarehouseId = formString(formData, "toWarehouseId") || null;
  const supplierId = formString(formData, "supplierId") || null;
  const reason = (formString(formData, "reason") || null) as MovementReasonValue | null;

  try {
    const existingKind = await prisma.inventoryDocument.findUnique({
      where: { id: documentId },
      select: { kind: true },
    });
    if (!existingKind) return { ok: false, error: "Không tìm thấy phiếu" };
    const user = await requirePermission(permissionForInventoryDocument(existingKind.kind, "edit_posted"));

    if (existingKind.kind === "EXPORT") {
      lines = await resolveProjectLineAssignments(lines);
      const normWarnings = await getProjectNormWarnings({ lines, excludeDocumentId: documentId });
      if (shouldRequireOverNormConfirmation(normWarnings, isOverNormConfirmed(formData))) {
        return {
          ok: false,
          code: "OVER_NORM_WARNING",
          error: "Phiếu xuất vượt định mức",
          normWarnings,
        };
      }
    } else {
      lines = lines.map(stripLineProjectAssignment);
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryDocument.findUnique({
        where: { id: documentId },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });
      if (!existing) throw new Error("Không tìm thấy phiếu");
      if (existing.status === "VOIDED") throw new Error("Không thể sửa phiếu đã hủy");
      if (existing.status !== "POSTED") throw new Error("Hiện chỉ hỗ trợ sửa phiếu đã ghi sổ");
      await assertAccountingPeriodUnlocked(tx, { documentDate: existing.documentDate, scope: "INVENTORY" });
      await assertAccountingPeriodUnlocked(tx, { documentDate, scope: "INVENTORY" });

      let nextWarehouseId: string | null = existing.warehouseId;
      let nextFromWarehouseId: string | null = existing.fromWarehouseId;
      let nextToWarehouseId: string | null = existing.toWarehouseId;
      let nextSupplierId: string | null = null;
      let nextReason: MovementReasonValue | null = existing.reason as MovementReasonValue | null;

      if (existing.kind === "IMPORT") {
        if (!warehouseId) throw new Error("Vui lòng chọn kho");
        if (supplierId) {
          const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
          if (!supplier) throw new Error("Nhà cung cấp không tồn tại");
        }
        nextWarehouseId = warehouseId;
        nextFromWarehouseId = null;
        nextToWarehouseId = null;
        nextSupplierId = supplierId;
        nextReason = "PURCHASE";
      } else if (existing.kind === "EXPORT") {
        if (!warehouseId) throw new Error("Vui lòng chọn kho");
        if (!reason || !OUT_REASONS.some((item) => item.value === reason)) {
          throw new Error("Vui lòng chọn lý do xuất");
        }
        nextWarehouseId = warehouseId;
        nextFromWarehouseId = null;
        nextToWarehouseId = null;
        nextReason = reason;
      } else if (existing.kind === "TRANSFER") {
        if (!fromWarehouseId) throw new Error("Vui lòng chọn kho nguồn");
        if (!toWarehouseId) throw new Error("Vui lòng chọn kho đích");
        if (fromWarehouseId === toWarehouseId) throw new Error("Kho nguồn và kho đích phải khác nhau");
        nextWarehouseId = null;
        nextFromWarehouseId = fromWarehouseId;
        nextToWarehouseId = toWarehouseId;
        nextReason = null;
      } else {
        throw new Error("Loại phiếu này chưa hỗ trợ sửa ở màn này");
      }

      const activeMovements = await tx.stockMovement.findMany({
        where: activeMovementWhere(documentId),
      });
      if (activeMovements.length === 0) throw new Error("Phiếu không có bút toán còn hiệu lực");

      const nextRevisionNo = existing.revisionNo + 1;
      const plannedLines = lines.map((line, index) => ({
        id: `planned-line-${index + 1}`,
        materialId: line.materialId,
        quantity: line.quantity,
        note: line.note,
      }));
      const plannedMovements = buildStockMovementInputs(
        plannedDocumentForKind({
          kind: existing.kind,
          documentId,
          revisionNo: nextRevisionNo,
          warehouseId: nextWarehouseId,
          fromWarehouseId: nextFromWarehouseId,
          toWarehouseId: nextToWarehouseId,
          transferId: activeMovements.find((movement) => movement.transferId)?.transferId ?? documentId,
          reason: nextReason,
          note,
          lines: plannedLines,
        }),
        user.id
      );

      const deltas = buildRevisionSlotDeltas(activeMovements, plannedMovements);
      await assertStockAfterDelta(tx, deltas);

      const supersededAt = new Date();
      await tx.stockMovement.updateMany({
        where: activeMovementWhere(documentId),
        data: {
          supersededAt,
          supersededByRevisionNo: nextRevisionNo,
        },
      });

      await tx.inventoryDocumentLine.deleteMany({ where: { documentId } });
      const updated = await tx.inventoryDocument.update({
        where: { id: documentId },
        data: {
          documentDate,
          warehouseId: nextWarehouseId,
          fromWarehouseId: nextFromWarehouseId,
          toWarehouseId: nextToWarehouseId,
          supplierId: nextSupplierId,
          reason: nextReason,
          note,
          revisionNo: nextRevisionNo,
          updatedById: user.id,
          lines: {
            create: lines.map((line, index) => ({
              lineNo: index + 1,
              materialId: line.materialId,
              quantity: line.quantity,
              projectId: existing.kind === "EXPORT" ? line.projectId : null,
              workItemId: existing.kind === "EXPORT" ? line.workItemId : null,
              note: line.note,
            })),
          },
        },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });

      const movements = buildStockMovementInputs(
        plannedDocumentForKind({
          kind: updated.kind,
          documentId: updated.id,
          revisionNo: updated.revisionNo,
          warehouseId: updated.warehouseId,
          fromWarehouseId: updated.fromWarehouseId,
          toWarehouseId: updated.toWarehouseId,
          transferId: activeMovements.find((movement) => movement.transferId)?.transferId ?? updated.id,
          reason: updated.reason as MovementReasonValue | null,
          note: updated.note,
          lines: updated.lines,
        }),
        user.id
      );
      await tx.stockMovement.createMany({ data: movements as StockMovementInput[] });

      await tx.documentAuditLog.create({
        data: {
          documentId,
          action: "EDIT_POSTED",
          fromRevisionNo: existing.revisionNo,
          toRevisionNo: nextRevisionNo,
          changedById: user.id,
          reason: "Sửa phiếu đã ghi sổ",
          snapshotBefore: snapshotDocument(existing),
          snapshotAfter: snapshotDocument(updated),
        },
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi khi cập nhật phiếu" };
  }

  revalidateDocumentPaths(documentId);
  return { ok: true };
}
