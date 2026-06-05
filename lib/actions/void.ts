"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/actions/movements";

/** Hủy phiếu kiểm kê đã duyệt: đảo các STOCKTAKE_ADJUST nó sinh ra + đánh dấu phiếu VOIDED. */
export async function voidStocktake(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  const stocktakeId = formData.get("stocktakeId") as string;
  const reason = (formData.get("reason") as string)?.trim();
  if (!stocktakeId) return { ok: false, error: "Thiếu phiếu kiểm kê" };
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do hủy" };

  // Cheap pre-check outside transaction (TOCTOU-safe re-check happens inside tx below).
  const stPre = await prisma.stocktake.findUnique({ where: { id: stocktakeId } });
  if (!stPre) return { ok: false, error: "Không tìm thấy phiếu" };
  if (stPre.status === "VOIDED") return { ok: false, error: "Phiếu đã bị hủy" };
  if (stPre.status !== "APPROVED") return { ok: false, error: "Chỉ hủy được phiếu đã duyệt" };

  try {
    await prisma.$transaction(async (tx) => {
      // Re-read inside transaction to close TOCTOU: two concurrent OWNERs both passing
      // the pre-check would result in double reversal without this re-validation.
      const st = await tx.stocktake.findUnique({ where: { id: stocktakeId } });
      if (!st || st.status !== "APPROVED") {
        throw new Error("Phiếu kiểm kê không ở trạng thái có thể hủy (đã bị hủy hoặc thay đổi trạng thái)");
      }

      // Fetch the adjustments to reverse.
      const adjusts = await tx.stockMovement.findMany({
        where: { stocktakeId, reason: "STOCKTAKE_ADJUST", voidedAt: null },
      });

      // Acquire advisory lock for each distinct (materialId, warehouseId) slot
      // to prevent concurrent exports from driving stock negative.
      const slots = Array.from(
        new Map(adjusts.map((a) => [`${a.materialId}:${a.warehouseId}`, a])).keys()
      );
      for (const slot of slots) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot}))`;
      }

      // For each IN adjust (its reversal is OUT, reducing stock), re-check on-hand.
      for (const a of adjusts) {
        if (a.type === "IN") {
          const rows = await tx.$queryRaw<{ on_hand: number }[]>`
            SELECT on_hand FROM current_stock
            WHERE material_id = ${a.materialId} AND warehouse_id = ${a.warehouseId}`;
          const onHand = rows.length ? Number(rows[0].on_hand) : 0;
          if (onHand < a.quantity) {
            throw new Error(
              `Không thể hủy phiếu: kho không đủ tồn để đảo điều chỉnh (cần ${a.quantity}, còn ${onHand}).`
            );
          }
        }
      }

      await tx.stockMovement.updateMany({
        where: { id: { in: adjusts.map((a) => a.id) }, voidedAt: null },
        data: { voidedAt: new Date(), voidedById: user.id },
      });
      for (const a of adjusts) {
        await tx.stockMovement.create({ data: {
          materialId: a.materialId, warehouseId: a.warehouseId,
          type: a.type === "IN" ? "OUT" : "IN", quantity: a.quantity,
          reason: "VOID", note: `Hủy kiểm kê ${st.code}: ${reason}`,
          voidReversalOf: a.id, createdById: user.id,
        }});
      }
      await tx.stocktake.update({ where: { id: stocktakeId }, data: { status: "VOIDED" } });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi khi hủy phiếu kiểm kê";
    return { ok: false, error: msg };
  }

  revalidatePath("/"); revalidatePath("/kiem-ke"); revalidatePath(`/kiem-ke/${stocktakeId}`);
  return { ok: true };
}
