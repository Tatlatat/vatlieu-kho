"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { importSchema, exportSchema } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Nhập kho: ghi 1 dòng IN/PURCHASE vào sổ cái. */
export async function createImport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = importSchema.safeParse({
    materialId: formData.get("materialId"),
    warehouseId: formData.get("warehouseId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  await prisma.stockMovement.create({
    data: {
      materialId: parsed.data.materialId,
      warehouseId: parsed.data.warehouseId,
      type: "IN",
      reason: "PURCHASE",
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      createdById: user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true };
}

/** Xuất kho: chặn xuất quá tồn, ghi 1 dòng OUT/<reason> vào sổ cái. */
export async function createExport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = exportSchema.safeParse({
    materialId: formData.get("materialId"),
    warehouseId: formData.get("warehouseId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Bug D fix: advisory lock + in-transaction re-check chống race condition tồn âm.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${parsed.data.materialId + ":" + parsed.data.warehouseId}))`;
      const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${parsed.data.materialId} AND warehouse_id = ${parsed.data.warehouseId}`;
      const onHand = rows.length ? Number(rows[0].on_hand) : 0;
      if (parsed.data.quantity > onHand) {
        throw new Error(`Không đủ tồn tại kho này. Hiện còn ${onHand}.`);
      }
      await tx.stockMovement.create({ data: { materialId: parsed.data.materialId, warehouseId: parsed.data.warehouseId, type: "OUT", reason: parsed.data.reason, quantity: parsed.data.quantity, note: parsed.data.note, createdById: user.id } });
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true };
}
