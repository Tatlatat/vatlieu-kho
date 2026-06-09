import { prisma } from "@/lib/prisma";

export async function getEquipment() {
  return prisma.equipment.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, type: true, plateNo: true, note: true,
      _count: { select: { logs: { where: { voidedAt: null } } } },
    },
  });
}

export async function getActiveEquipmentForSelect() {
  return prisma.equipment.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, type: true, plateNo: true },
  });
}

/** Nhật ký giờ của 1 xe/máy (mới nhất trước). */
export async function getEquipmentLogs(equipmentId: string) {
  return prisma.equipmentLog.findMany({
    where: { equipmentId, voidedAt: null },
    orderBy: { logDate: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
