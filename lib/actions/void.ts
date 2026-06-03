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

  // Pre-transaction guards (cheap reads, no lock needed yet).
  const mv = await prisma.stockMovement.findUnique({ where: { id: parsed.data.movementId } });
  if (!mv) return { ok: false, error: "Không tìm thấy chứng từ" };
  if (mv.voidedAt) return { ok: false, error: "Chứng từ này đã được hủy trước đó" };
  if (mv.reason === "VOID") return { ok: false, error: "Không thể hủy một bút toán hủy" };

  try {
    await prisma.$transaction(async (tx) => {
      // Nếu là chuyển kho → hủy cả cặp (cùng transferId); ngược lại chỉ dòng này.
      const targets = mv.transferId
        ? await tx.stockMovement.findMany({ where: { transferId: mv.transferId, voidedAt: null } })
        : [mv];

      // Acquire advisory locks for each distinct (materialId, warehouseId) slot
      // to prevent concurrent exports from driving stock negative.
      const slots = Array.from(
        new Map(targets.map((t) => [`${t.materialId}:${t.warehouseId}`, t])).keys()
      );
      for (const slot of slots) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot}))`;
      }

      // Re-check on-hand INSIDE the transaction for IN-leg targets.
      for (const t of targets) {
        if (t.type === "IN") {
          const rows = await tx.$queryRaw<{ on_hand: number }[]>`
            SELECT on_hand FROM current_stock
            WHERE material_id = ${t.materialId} AND warehouse_id = ${t.warehouseId}`;
          const onHand = rows.length ? Number(rows[0].on_hand) : 0;
          if (onHand < t.quantity) {
            throw new Error(
              `Không thể hủy: kho không đủ tồn để đảo (cần ${t.quantity}, còn ${onHand}). Có thể hàng đã được xuất/chuyển đi.`
            );
          }
        }
      }

      await tx.stockMovement.updateMany({
        where: { id: { in: targets.map((t) => t.id) } },
        data: { voidedAt: new Date(), voidedById: user.id },
      });
      for (const t of targets) {
        await tx.stockMovement.create({ data: {
          materialId: t.materialId, warehouseId: t.warehouseId,
          type: t.type === "IN" ? "OUT" : "IN", quantity: t.quantity,
          reason: "VOID", note: `Hủy chứng từ: ${parsed.data.reason}`,
          voidReversalOf: t.id, createdById: user.id,
        }});
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi khi hủy chứng từ";
    return { ok: false, error: msg };
  }

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
    where: { stocktakeId: stocktakeId, reason: "STOCKTAKE_ADJUST", voidedAt: null },
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
