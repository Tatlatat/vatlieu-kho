"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { supplierSchema, unitSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

function cleanOptional(value: string | undefined): string | undefined {
  const text = value?.trim() ?? "";
  return text || undefined;
}

function revalidateCatalogPaths() {
  revalidatePath("/");
  revalidatePath("/vat-lieu");
  revalidatePath("/nhap");
  revalidatePath("/nhap/moi");
  revalidatePath("/bao-cao");
}

export async function createUnit(formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = unitSchema.safeParse({
    name: formData.get("name"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const existing = await prisma.unit.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { ok: false, error: `Đơn vị "${parsed.data.name}" đã tồn tại.` };

  await prisma.unit.create({
    data: {
      name: parsed.data.name,
      note: cleanOptional(parsed.data.note),
    },
  });
  revalidateCatalogPaths();
  return { ok: true };
}

export async function updateUnit(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = unitSchema.safeParse({
    name: formData.get("name"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const duplicate = await prisma.unit.findFirst({
    where: { name: parsed.data.name, NOT: { id } },
  });
  if (duplicate) return { ok: false, error: `Đơn vị "${parsed.data.name}" đã tồn tại.` };

  await prisma.$transaction(async (tx) => {
    await tx.unit.update({
      where: { id },
      data: {
        name: parsed.data.name,
        note: cleanOptional(parsed.data.note),
      },
    });
    await tx.material.updateMany({
      where: { unitId: id },
      data: { unit: parsed.data.name },
    });
  });

  revalidateCatalogPaths();
  return { ok: true };
}

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = supplierSchema.safeParse({
    code: formData.get("code"),
    taxCode: formData.get("taxCode"),
    name: formData.get("name"),
    address: formData.get("address"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const existing = await prisma.supplier.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false, error: `Mã NCC "${parsed.data.code}" đã tồn tại.` };

  await prisma.supplier.create({
    data: {
      code: parsed.data.code,
      taxCode: cleanOptional(parsed.data.taxCode),
      name: parsed.data.name,
      address: cleanOptional(parsed.data.address),
      note: cleanOptional(parsed.data.note),
    },
  });
  revalidateCatalogPaths();
  return { ok: true };
}

export async function updateSupplier(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = supplierSchema.safeParse({
    code: formData.get("code"),
    taxCode: formData.get("taxCode"),
    name: formData.get("name"),
    address: formData.get("address"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const duplicate = await prisma.supplier.findFirst({
    where: { code: parsed.data.code, NOT: { id } },
  });
  if (duplicate) return { ok: false, error: `Mã NCC "${parsed.data.code}" đã được dùng.` };

  await prisma.supplier.update({
    where: { id },
    data: {
      code: parsed.data.code,
      taxCode: cleanOptional(parsed.data.taxCode),
      name: parsed.data.name,
      address: cleanOptional(parsed.data.address),
      note: cleanOptional(parsed.data.note),
    },
  });
  revalidateCatalogPaths();
  return { ok: true };
}
