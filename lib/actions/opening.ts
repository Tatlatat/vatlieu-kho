"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAtLeast } from "@/lib/auth-helpers";
import { nextDocCode } from "@/lib/doc-codes";
import type { ActionResult } from "@/lib/actions/movements";

export interface OpeningEntry {
  materialId: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Nhập TỒN ĐẦU KỲ (OWNER). Mỗi kho 1 phiếu Document type=IN, reason="Tồn đầu kỳ".
 * Sinh StockMovement reason=PURCHASE (đầu kỳ tính theo NGÀY trong balance, không theo
 * reason — Document.reason="Tồn đầu kỳ" để nhận dạng; KHÔNG thêm enum OPENING).
 *
 * An toàn kiểm toán: CHẶN ô (material×kho) đã có BẤT KỲ giao dịch nào — không cho
 * "đặt lại" đầu kỳ chồng lên dữ liệu thật. Kiểm tra này chạy SAU advisory lock,
 * dedup slot trùng + lock theo thứ tự xác định (chống race + deadlock).
 */
export async function createOpeningStock(entries: OpeningEntry[]): Promise<ActionResult> {
  const user = await requireAtLeast("MANAGER");

  // Lọc bỏ dòng trống / quantity<=0.
  const valid = entries.filter(
    (e) => e.materialId && e.warehouseId && Number(e.quantity) > 0
  );
  if (valid.length === 0) return { ok: false, error: "Chưa nhập dòng tồn đầu kỳ hợp lệ nào" };

  // Chặn trùng material×kho ngay trong 1 lần nhập (gộp sẽ sai).
  const seenKey = new Set<string>();
  for (const e of valid) {
    const k = `${e.materialId}:${e.warehouseId}`;
    if (seenKey.has(k)) return { ok: false, error: "Có vật tư bị lặp trong cùng một kho — mỗi vật tư/kho chỉ 1 dòng" };
    seenKey.add(k);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Khóa mọi slot theo thứ tự xác định (dedup đã đảm bảo ở trên, vẫn sort cho an toàn).
      const slots = [...new Set(valid.map((e) => `${e.materialId}:${e.warehouseId}`))].sort();
      for (const s of slots) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

      // SAU khi lock: chặn slot đã có giao dịch (không cho đầu kỳ đè dữ liệu thật).
      for (const e of valid) {
        const count = await tx.stockMovement.count({
          where: { materialId: e.materialId, warehouseId: e.warehouseId },
        });
        if (count > 0) {
          const m = await tx.material.findUnique({ where: { id: e.materialId }, select: { code: true } });
          throw new Error(`Vật tư ${m?.code ?? e.materialId} ở kho này đã có giao dịch — không thể đặt tồn đầu kỳ.`);
        }
      }

      // Gom theo kho → mỗi kho 1 phiếu "Tồn đầu kỳ".
      const byWarehouse = new Map<string, OpeningEntry[]>();
      for (const e of valid) {
        const arr = byWarehouse.get(e.warehouseId) ?? [];
        arr.push(e);
        byWarehouse.set(e.warehouseId, arr);
      }

      for (const [warehouseId, lines] of byWarehouse) {
        const code = await nextDocCode(tx, "IN");
        const doc = await tx.document.create({
          data: {
            code, type: "IN", status: "POSTED", reason: "Tồn đầu kỳ",
            note: "Nhập tồn đầu kỳ", warehouseId, createdById: user.id, postedAt: new Date(),
            lines: { create: lines.map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) })) },
          },
        });
        for (const l of lines) {
          await tx.stockMovement.create({
            data: {
              materialId: l.materialId, warehouseId, type: "IN", reason: "PURCHASE",
              quantity: Number(l.quantity), note: "Tồn đầu kỳ", documentId: doc.id, createdById: user.id,
            },
          });
        }
      }
    });
    revalidatePath("/");
    revalidatePath("/ton-dau-ky");
    revalidatePath("/bao-cao");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
