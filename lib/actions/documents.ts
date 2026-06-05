"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { docHeaderSchema, type DocHeaderInput } from "@/lib/validation";
import { nextDocCode } from "@/lib/doc-codes";
import type { ActionResult } from "@/lib/actions/movements";
import type { MovementReason } from "@prisma/client";

const LOSS_OUT: MovementReason[] = ["DAMAGED", "EXPIRED", "NATURAL_LOSS"];

/** Map lý do XUẤT (nhãn phiếu) sang enum sổ cái để báo cáo hao hụt không sót (spec §3.4).
 *  "Kiểm kê thiếu" (STOCK_SHORTAGE) là hao hụt → quy về NATURAL_LOSS để vào báo cáo loss. */
function outReasonOf(reason?: string | null): MovementReason {
  if (reason === "STOCK_SHORTAGE") return "NATURAL_LOSS";
  if (reason && (LOSS_OUT as string[]).includes(reason)) return reason as MovementReason;
  return "PROJECT";
}

/** Parse docDate từ form (YYYY-MM-DD). Trống → hôm nay. Chặn ngày tương lai (kiểm toán). */
function parseDocDate(docDate?: string): Date {
  if (!docDate) return new Date();
  const d = new Date(docDate);
  if (Number.isNaN(d.getTime())) throw new Error("Ngày chứng từ không hợp lệ");
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d >= tomorrow) throw new Error("Ngày chứng từ không được ở tương lai");
  return d;
}

/** Lưu nháp: KHÔNG động tồn. Tạo Document(DRAFT) + lines. */
export async function saveDraft(
  input: DocHeaderInput
): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  const parsed = docHeaderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  // Kiểm tra kho theo loại phiếu.
  if (d.type === "TRANSFER") {
    if (!d.fromWarehouseId || !d.toWarehouseId)
      return { ok: false, error: "Phiếu chuyển kho cần cả kho nguồn và kho đích" };
    if (d.fromWarehouseId === d.toWarehouseId)
      return { ok: false, error: "Kho nguồn và kho đích phải khác nhau" };
  } else if (!d.warehouseId) {
    return { ok: false, error: "Vui lòng chọn kho" };
  }

  let docDate: Date;
  try {
    docDate = parseDocDate(d.docDate);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  try {
    const id = await prisma.$transaction(async (tx) => {
      const code = await nextDocCode(tx, d.type);
      const doc = await tx.document.create({
        data: {
          code,
          type: d.type,
          status: "DRAFT",
          reason: d.reason,
          docDate,
          note: d.note,
          warehouseId: d.type === "TRANSFER" ? null : d.warehouseId,
          fromWarehouseId: d.type === "TRANSFER" ? d.fromWarehouseId : null,
          toWarehouseId: d.type === "TRANSFER" ? d.toWarehouseId : null,
          supplierId: d.type === "IN" ? d.supplierId ?? null : null,
          createdById: user.id,
          lines: {
            create: d.lines.map((l) => ({
              materialId: l.materialId,
              quantity: l.quantity,
              note: l.note,
            })),
          },
        },
      });
      return doc.id;
    });
    revalidatePath("/nhap");
    revalidatePath("/xuat");
    revalidatePath("/chuyen-kho");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Lập phiếu IN/OUT: DRAFT→POSTED, sinh StockMovement gắn documentId. */
export async function postDocument(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: documentId },
        include: { lines: true },
      });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.status !== "DRAFT") throw new Error("Chỉ lập được phiếu đang ở trạng thái Nháp");
      if (doc.lines.length === 0) throw new Error("Phiếu không có dòng nào");
      if (doc.type === "TRANSFER")
        throw new Error("Phiếu chuyển kho phải gửi duyệt, không lập trực tiếp");
      if (doc.type === "STOCKTAKE")
        throw new Error("Phiếu kiểm kê dùng quy trình kiểm kê riêng");
      const warehouseId = doc.warehouseId;
      if (!warehouseId) throw new Error("Phiếu thiếu kho");
      for (const l of doc.lines) if (l.quantity <= 0) throw new Error("Số lượng phải lớn hơn 0");

      // Khóa các slot theo thứ tự xác định, dedup slot trùng (advisory lock re-entrant).
      const slots = [...new Set(doc.lines.map((l) => `${l.materialId}:${warehouseId}`))].sort();
      for (const s of slots)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

      if (doc.type === "OUT") {
        // Gộp số lượng theo vật tư rồi recheck tồn (chống tồn âm, gồm cả dòng trùng vật tư).
        const need = new Map<string, number>();
        for (const l of doc.lines) need.set(l.materialId, (need.get(l.materialId) ?? 0) + l.quantity);
        for (const [materialId, qty] of need) {
          const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${warehouseId}`;
          const onHand = rows.length ? Number(rows[0].on_hand) : 0;
          if (qty > onHand)
            throw new Error(`Không đủ tồn cho 1 vật tư (cần ${qty}, còn ${onHand})`);
        }
      }

      for (const l of doc.lines) {
        await tx.stockMovement.create({
          data: {
            materialId: l.materialId,
            warehouseId,
            type: doc.type === "IN" ? "IN" : "OUT",
            reason: doc.type === "IN" ? "PURCHASE" : outReasonOf(doc.reason),
            quantity: l.quantity,
            note: l.note ?? doc.note,
            documentId: doc.id,
            createdById: user.id,
          },
        });
      }
      await tx.document.update({
        where: { id: doc.id },
        data: { status: "POSTED", postedAt: new Date() },
      });
    });
    revalidatePath("/");
    revalidatePath("/lich-su");
    revalidatePath("/nhap");
    revalidatePath("/xuat");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Hủy phiếu đã lập: bút toán đảo, KHÔNG xóa. */
export async function voidDocument(documentId: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!reason?.trim()) return { ok: false, error: "Vui lòng nhập lý do hủy" };
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: documentId },
        include: { movements: { where: { voidedAt: null, reason: { not: "VOID" } } } },
      });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      if (doc.status !== "POSTED") throw new Error("Chỉ hủy được phiếu đã lập");

      // Khóa slot của các movement bị đảo (dedup + sort).
      const slots = [...new Set(doc.movements.map((m) => `${m.materialId}:${m.warehouseId}`))].sort();
      for (const s of slots)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s}))`;

      // Recheck on-hand SAU khi lock: đảo một movement IN sẽ sinh OUT (giảm tồn).
      // Nếu hàng đã xuất/chuyển đi, đảo sẽ làm tồn ÂM → chặn (chính xác kiểm toán).
      // Gộp nhu cầu giảm theo slot (gồm cả TRANSFER_IN ở kho đích khi hủy phiếu chuyển).
      const needReduce = new Map<string, { materialId: string; warehouseId: string; qty: number }>();
      for (const m of doc.movements) {
        if (m.type === "IN") {
          const slot = `${m.materialId}:${m.warehouseId}`;
          const cur = needReduce.get(slot);
          if (cur) cur.qty += m.quantity;
          else needReduce.set(slot, { materialId: m.materialId, warehouseId: m.warehouseId, qty: m.quantity });
        }
      }
      for (const { materialId, warehouseId, qty } of needReduce.values()) {
        const rows = await tx.$queryRaw<{ on_hand: number }[]>`SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${warehouseId}`;
        const onHand = rows.length ? Number(rows[0].on_hand) : 0;
        if (qty > onHand)
          throw new Error(`Không thể hủy: kho không đủ tồn để đảo (cần ${qty}, còn ${onHand}). Có thể hàng đã được xuất/chuyển đi.`);
      }

      for (const m of doc.movements) {
        await tx.stockMovement.create({
          data: {
            materialId: m.materialId,
            warehouseId: m.warehouseId,
            type: m.type === "IN" ? "OUT" : "IN",
            reason: "VOID",
            quantity: m.quantity,
            note: `Hủy phiếu ${doc.code}: ${reason}`,
            documentId: doc.id,
            voidReversalOf: m.id,
            createdById: user.id,
          },
        });
        await tx.stockMovement.update({
          where: { id: m.id },
          data: { voidedAt: new Date(), voidedById: user.id },
        });
      }
      await tx.document.update({
        where: { id: doc.id },
        data: { status: "VOIDED", voidedById: user.id, voidedAt: new Date() },
      });
    });
    revalidatePath("/");
    revalidatePath("/lich-su");
    revalidatePath("/nhap");
    revalidatePath("/xuat");
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Xóa HẲN phiếu NHÁP (do nhập sai/nhập trùng). Chỉ DRAFT — chưa ghi sổ, chưa
 *  sinh bút toán, chưa động tồn → xóa không phá audit trail. Phiếu đã lập (POSTED)
 *  KHÔNG bao giờ xóa, chỉ Hủy (voidDocument). Đây là ranh giới kế toán: bảo vệ cái
 *  đã ghi sổ, cho phép dọn cái chưa ghi sổ. */
export async function deleteDraftDocument(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error("Không tìm thấy phiếu");
      // Chặn cứng: chỉ DRAFT mới xóa được. POSTED/PENDING/VOIDED phải qua Hủy.
      if (doc.status !== "DRAFT")
        throw new Error("Chỉ xóa được phiếu Nháp. Phiếu đã lập phải dùng chức năng Hủy (giữ lịch sử).");
      // Người lập hoặc OWNER mới được xóa nháp của mình.
      if (doc.createdById !== user.id && user.role !== "OWNER")
        throw new Error("Chỉ người lập phiếu hoặc chủ tài khoản được xóa phiếu nháp này");
      // Nháp chưa sinh StockMovement — chỉ cần xóa lines rồi document (an toàn FK).
      await tx.documentLine.deleteMany({ where: { documentId: doc.id } });
      await tx.document.delete({ where: { id: doc.id } });
    });
    revalidatePath("/nhap");
    revalidatePath("/xuat");
    revalidatePath("/chuyen-kho");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
