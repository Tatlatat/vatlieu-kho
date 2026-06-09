import { prisma } from "@/lib/prisma";

export async function getActiveUnits() {
  return prisma.unit.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, code: true, name: true },
  });
}

export async function getAllUnits() {
  return prisma.unit.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: { select: { materials: true } },
    },
  });
}
