import { prisma } from "@/lib/prisma";

/** Danh sách user (KHÔNG trả passwordHash). */
export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function getTransferApprovers() {
  return prisma.user.findMany({
    where: { role: "KEEPER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}
