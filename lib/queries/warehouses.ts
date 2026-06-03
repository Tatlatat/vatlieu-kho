import { prisma } from "@/lib/prisma";

export async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
}

export async function getDefaultWarehouse() {
  return prisma.warehouse.findFirst({ where: { isDefault: true } });
}
