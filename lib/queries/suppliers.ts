import { prisma } from "@/lib/prisma";

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, taxCode: true, address: true, contact: true, note: true },
  });
}
