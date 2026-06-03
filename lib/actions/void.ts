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

/** Hủy phiếu kiểm kê đã duyệt: đảo các STOCKTAKE_ADJUST nó sinh ra + đánh dấu phiếu VOIDED. */
export async function voidStocktake(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  const stocktakeId = formData.get("stocktakeId") as string;
  const reason = (formData.get("reason") as string)?.trim();
  if (!stocktakeId) return { ok: false, error: "Thiếu phiếu kiểm kê" };
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do hủy" };

  const st = await prisma.stocktake.findUnique({ where: { id: stocktakeId } });
  if (!st) return { ok: false, error: "Không tìm thấy phiếu" };
  if (st.status === "VOIDED") return { ok: false, error: "Phiếu đã bị hủy" };
  if (st.status !== "APPROVED") return { ok: false, error: "Chỉ hủy được phiếu đã duyệt" };

  const adjusts = await prisma.stockMovement.findMany({
    where: { reason: "STOCKTAKE_ADJUST", note: { contains: st.code }, voidedAt: null },
  });
  await prisma.$transaction([
    prisma.stockMovement.updateMany({
      where: { id: { in: adjusts.map((a) => a.id) } },
      data: { voidedAt: new Date(), voidedById: user.id },
    }),
    ...adjusts.map((a) => prisma.stockMovement.create({ data: {
      materialId: a.materialId, warehouseId: a.warehouseId,
      type: a.type === "IN" ? "OUT" : "IN", quantity: a.quantity,
      reason: "VOID", note: `Hủy kiểm kê ${st.code}: ${reason}`, voidReversalOf: a.id, createdById: user.id,
    }})),
    prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: "VOIDED" } }),
  ]);
  revalidatePath("/"); revalidatePath("/kiem-ke"); revalidatePath(`/kiem-ke/${stocktakeId}`);
  return { ok: true };
}
