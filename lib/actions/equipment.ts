"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth-helpers";
import { equipmentSchema, equipmentLogSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createEquipment(input: {
  name: string;
  type?: string;
  plateNo?: string;
  note?: string;
}): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  await prisma.equipment.create({ data: parsed.data });
  revalidatePath("/xe-may");
  return { ok: true };
}

export async function updateEquipment(
  id: string,
  input: { name: string; type?: string; plateNo?: string; note?: string }
): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.equipment.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy xe/máy" };
  await prisma.equipment.update({ where: { id }, data: parsed.data });
  revalidatePath("/xe-may");
  return { ok: true };
}

export async function deleteEquipment(id: string): Promise<ActionResult> {
  await requireRole("OWNER");
  await prisma.equipment.delete({ where: { id } }); // logs cascade
  revalidatePath("/xe-may");
  return { ok: true };
}

/** Ghi nhật ký giờ chạy. STAFF cũng được ghi (requireUser), lưu người ghi. */
export async function logHours(input: {
  equipmentId: string;
  logDate: string;
  hours: number;
  note?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = equipmentLogSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const eq = await prisma.equipment.findUnique({ where: { id: parsed.data.equipmentId } });
  if (!eq) return { ok: false, error: "Không tìm thấy xe/máy" };
  await prisma.equipmentLog.create({
    data: {
      equipmentId: parsed.data.equipmentId,
      logDate: new Date(parsed.data.logDate),
      hours: parsed.data.hours,
      note: parsed.data.note,
      createdById: user.id,
    },
  });
  revalidatePath("/xe-may");
  return { ok: true };
}
