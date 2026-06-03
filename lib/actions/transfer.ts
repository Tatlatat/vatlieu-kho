"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { transferSchema } from "@/lib/validation";
import { getOnHand } from "@/lib/queries/stock";
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

  const onHand = await getOnHand(parsed.data.materialId, parsed.data.fromWarehouseId);
  if (parsed.data.quantity > onHand) return { ok: false, error: `Kho nguồn không đủ tồn (còn ${onHand})` };

  const transferId = randomUUID();
  await prisma.$transaction([
    prisma.stockMovement.create({ data: {
      materialId: parsed.data.materialId, warehouseId: parsed.data.fromWarehouseId,
      type: "OUT", quantity: parsed.data.quantity, reason: "TRANSFER_OUT",
      note: parsed.data.note, transferId, createdById: user.id,
    }}),
    prisma.stockMovement.create({ data: {
      materialId: parsed.data.materialId, warehouseId: parsed.data.toWarehouseId,
      type: "IN", quantity: parsed.data.quantity, reason: "TRANSFER_IN",
      note: parsed.data.note, transferId, createdById: user.id,
    }}),
  ]);
  revalidatePath("/"); revalidatePath("/lich-su"); revalidatePath("/chuyen-kho");
  return { ok: true };
}
