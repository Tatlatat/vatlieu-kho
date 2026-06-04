import { prisma } from "@/lib/prisma";

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, contact: true, note: true },
  });
}
