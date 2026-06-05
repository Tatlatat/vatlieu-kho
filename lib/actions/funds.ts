"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { fundSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createFund(input: {
  name: string;
  code: string;
  note?: string;
}): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = fundSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.fund.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã quỹ "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/quy");
  revalidatePath("/quy/danh-muc");
  return { ok: true };
}

export async function updateFund(
  id: string,
  input: { name: string; code: string; note?: string }
): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = fundSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.fund.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy quỹ" };
  try {
    await prisma.fund.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã quỹ "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/quy");
  revalidatePath("/quy/danh-muc");
  return { ok: true };
}

/** Xóa quỹ — CHẶN nếu đã có bút toán (giữ toàn vẹn lịch sử, giống deleteSupplier). */
export async function deleteFund(id: string): Promise<ActionResult> {
  await requireRole("OWNER");
  const count = await prisma.cashEntry.count({ where: { fundId: id } });
  if (count > 0)
    return { ok: false, error: "Quỹ đã có giao dịch — không thể xóa (giữ lịch sử). Có thể ngừng dùng thay vì xóa." };
  await prisma.fund.delete({ where: { id } });
  revalidatePath("/quy");
  revalidatePath("/quy/danh-muc");
  return { ok: true };
}
