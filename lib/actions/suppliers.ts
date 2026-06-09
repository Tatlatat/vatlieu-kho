"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAtLeast } from "@/lib/auth-helpers";
import { supplierSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createSupplier(input: {
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
  contact?: string;
  note?: string;
}): Promise<ActionResult> {
  await requireAtLeast("KEEPER");
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    await prisma.supplier.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã NCC "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/nha-cung-cap");
  revalidatePath("/danh-muc");
  return { ok: true };
}

export async function updateSupplier(
  id: string,
  input: { code: string; name: string; taxCode?: string; address?: string; contact?: string; note?: string }
): Promise<ActionResult> {
  await requireAtLeast("KEEPER");
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.supplier.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy nhà cung cấp" };
  try {
    await prisma.supplier.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: `Mã NCC "${parsed.data.code}" đã được dùng.` };
    throw e;
  }
  revalidatePath("/nha-cung-cap");
  revalidatePath("/danh-muc");
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  await requireAtLeast("KEEPER");
  // Không xóa nếu đã gắn với phiếu nhập (giữ toàn vẹn dữ liệu lịch sử).
  const used = await prisma.document.count({ where: { supplierId: id } });
  if (used > 0)
    return { ok: false, error: "Nhà cung cấp đã gắn với phiếu nhập — không thể xóa." };
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/nha-cung-cap");
  revalidatePath("/danh-muc");
  return { ok: true };
}
