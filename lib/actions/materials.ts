"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { materialSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createMaterial(formData: FormData): Promise<ActionResult> {
  await requirePermission("catalog.manage");
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    unitId: formData.get("unitId"),
    minStock: formData.get("minStock"),
    kind: formData.get("kind") || "MATERIAL",
    trackingMode: formData.get("trackingMode") || "QUANTITY",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const existing = await prisma.material.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false, error: `Mã "${parsed.data.code}" đã tồn tại.` };

  const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitId } });
  if (!unit) return { ok: false, error: "Đơn vị tính không tồn tại" };

  await prisma.material.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      unitId: parsed.data.unitId,
      unit: unit.name,
      minStock: parsed.data.minStock,
      kind: parsed.data.kind,
      trackingMode: parsed.data.trackingMode,
    },
  });
  revalidatePath("/vat-lieu");
  revalidatePath("/");
  revalidatePath("/bao-cao");
  return { ok: true };
}

export async function updateMaterial(id: string, formData: FormData): Promise<ActionResult> {
  await requirePermission("catalog.manage");
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    unitId: formData.get("unitId"),
    minStock: formData.get("minStock"),
    kind: formData.get("kind") || "MATERIAL",
    trackingMode: formData.get("trackingMode") || "QUANTITY",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const dup = await prisma.material.findFirst({
    where: { code: parsed.data.code, NOT: { id } },
  });
  if (dup) return { ok: false, error: `Mã "${parsed.data.code}" đã được dùng cho vật liệu khác.` };

  const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitId } });
  if (!unit) return { ok: false, error: "Đơn vị tính không tồn tại" };

  await prisma.material.update({
    where: { id },
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      unitId: parsed.data.unitId,
      unit: unit.name,
      minStock: parsed.data.minStock,
      kind: parsed.data.kind,
      trackingMode: parsed.data.trackingMode,
    },
  });
  revalidatePath("/vat-lieu");
  revalidatePath("/");
  revalidatePath("/bao-cao");
  return { ok: true };
}
