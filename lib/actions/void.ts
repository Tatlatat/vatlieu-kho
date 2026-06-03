"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { voidSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

/** Hủy 1 chứng từ (hoặc cả cặp chuyển kho) bằng bút toán đảo. */
export async function voidMovement(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  const parsed = voidSchema.safeParse({ movementId: formData.get("movementId"), reason: formData.get("reason") });
  if (!parsed.success || !parsed.data.movementId) {
    return { ok: false, error: parsed.success ? "Thiếu chứng từ" : parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const mv = await prisma.stockMovement.findUnique({ where: { id: parsed.data.movementId } });
  if (!mv) return { ok: false, error: "Không tìm thấy chứng từ" };
  if (mv.voidedAt) return { ok: false, error: "Chứng từ này đã được hủy trước đó" };
  if (mv.reason === "VOID") return { ok: false, error: "Không thể hủy một bút toán hủy" };

  // Nếu là chuyển kho → hủy cả cặp (cùng transferId); ngược lại chỉ dòng này.
  const targets = mv.transferId
    ? await prisma.stockMovement.findMany({ where: { transferId: mv.transferId, voidedAt: null } })
    : [mv];

  await prisma.$transaction([
    prisma.stockMovement.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { voidedAt: new Date(), voidedById: user.id },
    }),
    ...targets.map((t) => prisma.stockMovement.create({ data: {
      materialId: t.materialId, warehouseId: t.warehouseId,
      type: t.type === "IN" ? "OUT" : "IN", quantity: t.quantity,
      reason: "VOID", note: `Hủy chứng từ: ${parsed.data.reason}`,
      voidReversalOf: t.id, createdById: user.id,
    }})),
  ]);
  revalidatePath("/"); revalidatePath("/lich-su");
  return { ok: true };
}
