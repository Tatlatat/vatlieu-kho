"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { transferSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createTransfer(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = transferSchema.safeParse({
    materialId: formData.get("materialId"),
    fromWarehouseId: formData.get("fromWarehouseId"),
    toWarehouseId: formData.get("toWarehouseId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  // Bug D fix: advisory lock trên kho nguồn + re-check tồn trong transaction chống race condition.
  const transferId = randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${parsed.data.materialId + ":" + parsed.data.fromWarehouseId}))`;
      const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${parsed.data.materialId} AND warehouse_id = ${parsed.data.fromWarehouseId}`;
      const onHand = rows.length ? Number(rows[0].on_hand) : 0;
      if (parsed.data.quantity > onHand) {
        throw new Error(`Kho nguồn không đủ tồn (còn ${onHand})`);
      }
      await tx.stockMovement.create({ data: {
        materialId: parsed.data.materialId, warehouseId: parsed.data.fromWarehouseId,
        type: "OUT", quantity: parsed.data.quantity, reason: "TRANSFER_OUT",
        note: parsed.data.note, transferId, createdById: user.id,
      }});
      await tx.stockMovement.create({ data: {
        materialId: parsed.data.materialId, warehouseId: parsed.data.toWarehouseId,
        type: "IN", quantity: parsed.data.quantity, reason: "TRANSFER_IN",
        note: parsed.data.note, transferId, createdById: user.id,
      }});
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/chuyen-kho");
  return { ok: true };
}
