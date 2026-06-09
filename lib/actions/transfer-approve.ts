"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/actions/movements";
import { validateRequestedTransferApprover } from "@/lib/domain/transfer-approval";

async function postTransferDocument(
  tx: Prisma.TransactionClient,
  documentId: string,
  approverId: string
) {
  const doc = await tx.document.findUnique({
    where: { id: documentId },
    include: { lines: true },
  });
  if (!doc) throw new Error("Không tìm thấy phiếu");
  if (doc.type !== "TRANSFER") throw new Error("Không phải phiếu chuyển kho");
  if (doc.status !== "PENDING" && doc.status !== "DRAFT") throw new Error("Phiếu không ở trạng thái có thể lập");
  if (!doc.fromWarehouseId || !doc.toWarehouseId) throw new Error("Thiếu kho nguồn/đích");

  const transferId = randomUUID();
  const fromWh = doc.fromWarehouseId;
  const toWh = doc.toWarehouseId;

  const allSlots = [
    ...new Set([
      ...doc.lines.map((l) => `${l.materialId}:${fromWh}`),
      ...doc.lines.map((l) => `${l.materialId}:${toWh}`),
    ]),
  ].sort();
  for (const s of allSlots)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

  const need = new Map<string, number>();
  for (const l of doc.lines) need.set(l.materialId, (need.get(l.materialId) ?? 0) + l.quantity);
  for (const [materialId, qty] of need) {
    const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${fromWh}`;
    const onHand = rows.length ? Number(rows[0].on_hand) : 0;
    if (qty > onHand) throw new Error(`Kho nguồn không đủ tồn (cần ${qty}, còn ${onHand})`);
  }

  for (const l of doc.lines) {
    await tx.stockMovement.create({
      data: { materialId: l.materialId, warehouseId: fromWh, type: "OUT", reason: "TRANSFER_OUT", quantity: l.quantity, note: l.note ?? doc.note, transferId, documentId: doc.id, createdById: approverId },
    });
    await tx.stockMovement.create({
      data: { materialId: l.materialId, warehouseId: toWh, type: "IN", reason: "TRANSFER_IN", quantity: l.quantity, note: l.note ?? doc.note, transferId, documentId: doc.id, createdById: approverId },
    });
  }
  await tx.document.update({
    where: { id: doc.id },
    data: { status: "POSTED", approvedById: approverId, postedAt: new Date(), transferId },
  });
}

/** Gửi phiếu chuyển kho đi duyệt: DRAFT→PENDING. */
export async function submitTransferForApproval(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: documentId },
        include: { lines: true },
      });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Chỉ phiếu chuyển kho mới gửi duyệt");
      if (doc.status !== "DRAFT") throw new Error("Chỉ gửi duyệt phiếu đang Nháp");
      if (doc.lines.length === 0) throw new Error("Phiếu không có dòng nào");
      if (!doc.fromWarehouseId || !doc.toWarehouseId) throw new Error("Thiếu kho nguồn/đích");
      if (user.role === "ADMIN") {
        await postTransferDocument(tx, doc.id, user.id);
        return;
      }
      const approver = doc.requestedApproverId
        ? await tx.user.findUnique({
            where: { id: doc.requestedApproverId },
            select: { role: true },
          })
        : null;
      validateRequestedTransferApprover({
        currentUserId: user.id,
        requestedApproverId: doc.requestedApproverId,
        requestedApproverRole: approver?.role,
      });
      await tx.document.update({ where: { id: doc.id }, data: { status: "PENDING" } });
    });
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Duyệt phiếu chuyển kho: PENDING→POSTED, sinh cặp TRANSFER_OUT/IN cùng 1 transferId. */
export async function approveTransfer(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: documentId },
        include: { lines: true },
      });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Không phải phiếu chuyển kho");
      if (doc.status !== "PENDING") throw new Error("Chỉ duyệt phiếu đang Chờ duyệt");
      if (user.role !== "ADMIN" && user.role !== "KEEPER")
        throw new Error("Chỉ thủ kho được chỉ định hoặc quản trị viên mới được duyệt phiếu này.");
      if (user.role !== "ADMIN" && doc.requestedApproverId !== user.id)
        throw new Error("Chỉ thủ kho được chỉ định hoặc quản trị viên mới được duyệt phiếu này.");
      await postTransferDocument(tx, doc.id, user.id);
    });
    revalidatePath("/");
    revalidatePath("/lich-su");
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Từ chối phiếu chuyển kho: PENDING→DRAFT (để người lập sửa lại). */
export async function rejectTransfer(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.type !== "TRANSFER") throw new Error("Không phải phiếu chuyển kho");
      if (doc.status !== "PENDING") throw new Error("Chỉ từ chối phiếu đang Chờ duyệt");
      if (user.role !== "ADMIN" && user.role !== "KEEPER")
        throw new Error("Chỉ thủ kho được chỉ định hoặc quản trị viên mới được từ chối phiếu này.");
      if (user.role !== "ADMIN" && doc.requestedApproverId !== user.id)
        throw new Error("Chỉ thủ kho được chỉ định hoặc quản trị viên mới được từ chối phiếu này.");
      await tx.document.update({ where: { id: doc.id }, data: { status: "DRAFT" } });
    });
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
