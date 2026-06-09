"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAtLeast } from "@/lib/auth-helpers";
import { unitSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createUnit(input: {
  code: string;
  name: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.unit.create({
      data: {
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive ?? true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã đơn vị tính "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/danh-muc");
  revalidatePath("/vat-lieu");
  return { ok: true };
}

export async function updateUnit(
  id: string,
  input: { code: string; name: string; isActive?: boolean }
): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.unit.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy đơn vị tính" };
  try {
    await prisma.unit.update({
      where: { id },
      data: {
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        isActive: parsed.data.isActive ?? true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã đơn vị tính "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/danh-muc");
  revalidatePath("/vat-lieu");
  return { ok: true };
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const count = await prisma.material.count({ where: { unitId: id } });
  if (count > 0)
    return { ok: false, error: "Đơn vị tính đang được dùng — không thể xóa." };
  await prisma.unit.delete({ where: { id } });
  revalidatePath("/danh-muc");
  revalidatePath("/vat-lieu");
  return { ok: true };
}
