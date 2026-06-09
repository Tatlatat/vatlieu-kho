import { prisma } from "@/lib/prisma";

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: [{ code: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, taxCode: true, address: true, contact: true, note: true },
  });
}
