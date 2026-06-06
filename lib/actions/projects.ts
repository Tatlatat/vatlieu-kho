"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAtLeast } from "@/lib/auth-helpers";
import { projectSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createProject(input: {
  name: string;
  code: string;
  note?: string;
}): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.project.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã công trình "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/cong-trinh");
  return { ok: true };
}

export async function updateProject(
  id: string,
  input: { name: string; code: string; note?: string }
): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.project.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy công trình" };
  try {
    await prisma.project.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã công trình "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/cong-trinh");
  return { ok: true };
}

/** Xóa công trình — CHẶN nếu còn kho/quỹ gắn vào (gỡ liên kết trước). */
export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const [nWh, nFund] = await Promise.all([
    prisma.warehouse.count({ where: { projectId: id } }),
    prisma.fund.count({ where: { projectId: id } }),
  ]);
  if (nWh + nFund > 0)
    return {
      ok: false,
      error: "Không thể xóa: công trình đang có kho hoặc quỹ. Hãy gỡ liên kết trước.",
    };
  await prisma.project.delete({ where: { id } });
  revalidatePath("/cong-trinh");
  return { ok: true };
}
