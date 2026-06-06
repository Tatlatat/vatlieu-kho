"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAtLeast } from "@/lib/auth-helpers";
import { cashEntrySchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

/** Parse ngày phiếu (YYYY-MM-DD). Chặn ngày tương lai/rác (kế toán). */
function parseEntryDate(raw: string): Date {
  // raw = "YYYY-MM-DD" từ input date → new Date() parse thành UTC-midnight. Nhất quán UTC.
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Ngày không hợp lệ");
  // Chặn ngày tương lai theo UTC (server Vercel chạy UTC). Mốc = đầu ngày MAI theo UTC.
  const now = new Date();
  const tomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  if (d >= tomorrowUtc) throw new Error("Ngày phiếu không được ở tương lai");
  return d;
}

/**
 * Lập phiếu Thu/Chi: ghi sổ NGAY (tạo CashEntry → đổi tồn quỹ).
 * Tồn quỹ âm: VẪN ghi nhưng trả về `warning` (không chặn).
 * Advisory lock theo fundId để 2 người cùng quỹ không đua nhau khi đọc tồn.
 */
export async function createCashEntry(input: {
  fundId: string;
  type: "THU" | "CHI";
  category: string;
  amount: number;
  entryDate: string;
  note?: string;
}): Promise<ActionResult & { warning?: string }> {
  const user = await requireAtLeast("MANAGER");
  const parsed = cashEntrySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  let entryDate: Date;
  try {
    entryDate = parseEntryDate(d.entryDate);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  try {
    const warning = await prisma.$transaction(async (tx) => {
      // Khóa theo quỹ để đọc tồn nhất quán (chống race khi nhiều phiếu cùng quỹ).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"fund:" + d.fundId}))`;

      const fund = await tx.fund.findUnique({ where: { id: d.fundId } });
      if (!fund) throw new Error("Không tìm thấy quỹ");
      if (!fund.isActive) throw new Error("Quỹ đã ngừng sử dụng");

      await tx.cashEntry.create({
        data: {
          fundId: d.fundId,
          type: d.type,
          category: d.category,
          amount: new Prisma.Decimal(d.amount),
          entryDate,
          note: d.note,
          createdById: user.id,
        },
      });

      // Sau khi ghi: nếu là CHI và tồn quỹ < 0 → cảnh báo (không chặn).
      if (d.type === "CHI") {
        const rows = await tx.$queryRaw<{ balance: number }[]>`
          SELECT balance FROM fund_balance WHERE fund_id = ${d.fundId}`;
        const balance = rows.length ? Number(rows[0].balance) : 0;
        if (balance < 0) {
          return `Quỹ "${fund.name}" hiện ÂM ${balance.toLocaleString("vi-VN")} đ sau phiếu chi này.`;
        }
      }
      return undefined;
    });

    revalidatePath("/quy");
    revalidatePath("/quy/danh-muc"); // tồn quỹ hiển thị ở trang danh mục cũng đổi
    return warning ? { ok: true, warning } : { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Hủy phiếu thu/chi: CHỈ đánh dấu void (voidedAt/voidedById/voidReason).
 * KHÔNG tạo bút toán đảo — view fund_balance đã loại voided, đảo sẽ trừ 2 lần.
 * Lịch sử giữ nguyên (entry gốc còn, hiển thị gạch mờ).
 */
export async function voidCashEntry(id: string, reason: string): Promise<ActionResult> {
  const user = await requireAtLeast("MANAGER");
  if (!reason?.trim()) return { ok: false, error: "Vui lòng nhập lý do hủy" };
  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.cashEntry.findUnique({ where: { id } });
      if (!entry) throw new Error("Không tìm thấy phiếu");
      if (entry.voidedAt) throw new Error("Phiếu này đã được hủy trước đó");
      // Khóa theo quỹ để nhất quán với các thao tác đồng thời.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"fund:" + entry.fundId}))`;
      // Re-check bên trong tx để chặn double-void race.
      const fresh = await tx.cashEntry.findUnique({ where: { id } });
      if (!fresh || fresh.voidedAt) throw new Error("Phiếu này đã được hủy trước đó");
      await tx.cashEntry.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: user.id, voidReason: reason.trim() },
      });
    });
    revalidatePath("/quy");
    revalidatePath("/quy/danh-muc"); // tồn quỹ hiển thị ở trang danh mục cũng đổi
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
