import { prisma } from "@/lib/prisma";

/** Danh sách phiếu kiểm kê, kèm tổng hao hụt (tổng diff âm). */
export async function listStocktakes() {
  const takes = await prisma.stocktake.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      warehouse: { select: { name: true } },
      items: { select: { diff: true } },
    },
  });
  return takes.map((t) => {
    const totalLoss = t.items.reduce((sum, it) => sum + (it.diff < 0 ? -it.diff : 0), 0);
    const itemCount = t.items.length;
    return { ...t, totalLoss, itemCount };
  });
}

/** Chi tiết 1 phiếu kiểm kê kèm các item + tên vật liệu. */
export async function getStocktake(id: string) {
  return prisma.stocktake.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      warehouse: { select: { name: true } },
      items: {
        include: { material: { select: { name: true, code: true, unit: true } } },
        orderBy: { material: { name: "asc" } },
      },
    },
  });
}
