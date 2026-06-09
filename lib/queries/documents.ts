import { prisma } from "@/lib/prisma";
import type { DocType } from "@prisma/client";

/** Danh sách phiếu theo loại, mới nhất trước. */
export async function listDocuments(type: DocType) {
  return prisma.document.findMany({
    where: { type },
    orderBy: { docDate: "desc" },
    include: {
      warehouse: { select: { name: true } },
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      supplier: { select: { name: true } },
      createdBy: { select: { name: true } },
      requestedApprover: { select: { id: true, name: true, email: true } },
      _count: { select: { lines: true, equipmentLines: true } },
    },
  });
}

/** Chi tiết 1 phiếu (kèm dòng + người liên quan). */
export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      warehouse: { select: { name: true, code: true } },
      fromWarehouse: { select: { name: true, code: true } },
      toWarehouse: { select: { name: true, code: true } },
      supplier: { select: { name: true, contact: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      requestedApprover: { select: { id: true, name: true, email: true } },
      voidedBy: { select: { name: true } },
      lines: { include: { material: { select: { name: true, code: true, unit: true } } } },
      equipmentLines: {
        include: {
          equipment: { select: { code: true, name: true, type: true, plateNo: true } },
          project: { select: { code: true, name: true } },
        },
      },
    },
  });
}
