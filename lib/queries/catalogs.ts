import { prisma } from "@/lib/prisma";

export async function getUnits() {
  return prisma.unit.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      note: true,
    },
  });
}

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      taxCode: true,
      name: true,
      address: true,
      note: true,
    },
  });
}

export async function getSupplierOptions() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      taxCode: true,
    },
  });
}

export type UnitOption = Awaited<ReturnType<typeof getUnits>>[number];
export type SupplierOption = Awaited<ReturnType<typeof getSupplierOptions>>[number];
export type SupplierCatalogRow = Awaited<ReturnType<typeof getSuppliers>>[number];
