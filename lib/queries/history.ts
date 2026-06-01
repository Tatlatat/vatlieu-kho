import { prisma } from "@/lib/prisma";

export interface HistoryRow {
  id: string;
  createdAt: Date;
  materialName: string;
  materialUnit: string;
  type: "IN" | "OUT";
  reason: string;
  quantity: number;
  createdByName: string;
  note: string | null;
}

/** Toàn bộ lịch sử giao dịch (sổ cái), mới nhất trước. */
export async function getHistory(): Promise<HistoryRow[]> {
  const rows = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      material: { select: { name: true, unit: true } },
      createdBy: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    materialName: r.material.name,
    materialUnit: r.material.unit,
    type: r.type,
    reason: r.reason,
    quantity: r.quantity,
    createdByName: r.createdBy.name,
    note: r.note,
  }));
}
