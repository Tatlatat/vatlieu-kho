"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/actions/movements";

/** Gửi phiếu chuyển kho đi duyệt: DRAFT→PENDING. */
export async function submitTransferForApproval(documentId: string): Promise<ActionResult> {
  await requireUser();
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
      if (!doc.fromWarehouseId || !doc.toWarehouseId) throw new Error("Thiếu kho nguồn/đích");
      // Segregation of duties: người tạo không tự duyệt, trừ Quản trị.
      if (doc.createdById === user.id && user.role !== "ADMIN")
        throw new Error("Người lập phiếu không được tự duyệt");

      const transferId = randomUUID(); // 1 transferId / phiếu (hoisted ngoài loop)
      const fromWh = doc.fromWarehouseId;
      const toWh = doc.toWarehouseId;

      // Khóa CẢ slot kho nguồn VÀ kho đích (TRANSFER_IN ghi vào đích) — gộp + sort
      // một lần để có thứ tự khóa toàn cục nhất quán (chống deadlock + chống race
      // với các OUT đồng thời ở kho đích).
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
          data: { materialId: l.materialId, warehouseId: fromWh, type: "OUT", reason: "TRANSFER_OUT", quantity: l.quantity, note: l.note ?? doc.note, transferId, documentId: doc.id, createdById: user.id },
        });
        await tx.stockMovement.create({
          data: { materialId: l.materialId, warehouseId: toWh, type: "IN", reason: "TRANSFER_IN", quantity: l.quantity, note: l.note ?? doc.note, transferId, documentId: doc.id, createdById: user.id },
        });
      }
      await tx.document.update({
        where: { id: doc.id },
        data: { status: "POSTED", approvedById: user.id, postedAt: new Date(), transferId },
      });
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
      // Đối xứng với duyệt: người lập không tự xử lý phiếu mình (trừ Quản trị).
      if (doc.createdById === user.id && user.role !== "ADMIN")
        throw new Error("Người lập phiếu không được tự từ chối");
      await tx.document.update({ where: { id: doc.id }, data: { status: "DRAFT" } });
    });
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
