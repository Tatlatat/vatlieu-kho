"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { warehouseSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createWarehouse(formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), code: formData.get("code"), projectId: (formData.get("projectId") as string) || null });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const existing = await prisma.warehouse.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false, error: `Mã kho "${parsed.data.code}" đã tồn tại.` };
  await prisma.warehouse.create({ data: parsed.data });
  revalidatePath("/vat-lieu");
  return { ok: true };
}

export async function updateWarehouse(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = warehouseSchema.safeParse({ name: formData.get("name"), code: formData.get("code"), projectId: (formData.get("projectId") as string) || null });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const dup = await prisma.warehouse.findFirst({ where: { code: parsed.data.code, NOT: { id } } });
  if (dup) return { ok: false, error: `Mã kho "${parsed.data.code}" đã được dùng.` };
  await prisma.warehouse.update({ where: { id }, data: parsed.data });
  revalidatePath("/vat-lieu");
  return { ok: true };
}
