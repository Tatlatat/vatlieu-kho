import { prisma } from "@/lib/prisma";

export async function getEquipment() {
  return prisma.equipment.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, type: true, plateNo: true, note: true,
      _count: { select: { logs: true } },
    },
  });
}

/** Nhật ký giờ của 1 xe/máy (mới nhất trước). */
export async function getEquipmentLogs(equipmentId: string) {
  return prisma.equipmentLog.findMany({
    where: { equipmentId },
    orderBy: { logDate: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
