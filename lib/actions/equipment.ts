"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAtLeast, requireUser } from "@/lib/auth-helpers";
import { equipmentSchema, equipmentLogSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

export async function createEquipment(input: {
  code?: string;
  name: string;
  type?: string;
  plateNo?: string;
  note?: string;
}): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    const data = {
      ...parsed.data,
      code: parsed.data.code?.trim() || null,
    };
    await prisma.equipment.create({ data });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "Mã xe/máy đã tồn tại" };
    }
    throw e;
  }
  revalidatePath("/xe-may");
  return { ok: true };
}

export async function updateEquipment(
  id: string,
  input: { code?: string; name: string; type?: string; plateNo?: string; note?: string }
): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const exists = await prisma.equipment.findUnique({ where: { id } });
  if (!exists) return { ok: false, error: "Không tìm thấy xe/máy" };
  try {
    const data = {
      ...parsed.data,
      code: parsed.data.code?.trim() || null,
    };
    await prisma.equipment.update({ where: { id }, data });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "Mã xe/máy đã tồn tại" };
    }
    throw e;
  }
  revalidatePath("/xe-may");
  return { ok: true };
}

export async function deleteEquipment(id: string): Promise<ActionResult> {
  await requireAtLeast("MANAGER");
  // Không xóa nếu đã có nhật ký giờ chạy (cascade sẽ mất dữ liệu kiểm toán).
  const logs = await prisma.equipmentLog.count({ where: { equipmentId: id } });
  if (logs > 0)
    return { ok: false, error: "Xe/máy đã có nhật ký giờ chạy — không thể xóa (giữ lịch sử)." };
  await prisma.equipment.delete({ where: { id } });
  revalidatePath("/xe-may");
  return { ok: true };
}

/** Ghi nhật ký giờ chạy. STAFF cũng được ghi (requireUser), lưu người ghi. */
export async function logHours(input: {
  equipmentId: string;
  logDate: string;
  hours: number;
  projectId?: string | null;
  note?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = equipmentLogSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const eq = await prisma.equipment.findUnique({ where: { id: parsed.data.equipmentId } });
  if (!eq) return { ok: false, error: "Không tìm thấy xe/máy" };

  const logDate = new Date(parsed.data.logDate);
  if (Number.isNaN(logDate.getTime())) return { ok: false, error: "Ngày không hợp lệ" };
  // Chặn ghi giờ ở ngày tương lai (cộng 1 ngày để bao hết múi giờ hôm nay).
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (logDate >= tomorrow) return { ok: false, error: "Không thể ghi giờ cho ngày trong tương lai" };

  await prisma.equipmentLog.create({
    data: {
      equipmentId: parsed.data.equipmentId,
      logDate,
      hours: parsed.data.hours,
      projectId: parsed.data.projectId || null,
      note: parsed.data.note,
      createdById: user.id,
    },
  });
  revalidatePath("/xe-may");
  return { ok: true };
}
