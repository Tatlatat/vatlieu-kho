"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { materialSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createMaterial(formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    unit: formData.get("unit"),
    minStock: formData.get("minStock"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const existing = await prisma.material.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false, error: `Mã "${parsed.data.code}" đã tồn tại.` };

  await prisma.material.create({ data: parsed.data });
  revalidatePath("/vat-lieu");
  revalidatePath("/");
  return { ok: true };
}

export async function updateMaterial(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    unit: formData.get("unit"),
    minStock: formData.get("minStock"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const dup = await prisma.material.findFirst({
    where: { code: parsed.data.code, NOT: { id } },
  });
  if (dup) return { ok: false, error: `Mã "${parsed.data.code}" đã được dùng cho vật liệu khác.` };

  await prisma.material.update({ where: { id }, data: parsed.data });
  revalidatePath("/vat-lieu");
  revalidatePath("/");
  return { ok: true };
}
