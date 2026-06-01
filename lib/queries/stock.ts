import { prisma } from "@/lib/prisma";

export type StockStatus = "OK" | "LOW" | "OUT";

export interface CurrentStockRow {
  material_id: string;
  name: string;
  code: string;
  unit: string;
  min_stock: number;
  on_hand: number;
  status: StockStatus;
}

/** Đọc tồn kho hiện tại từ view Postgres `current_stock`. */
export async function getCurrentStock(): Promise<CurrentStockRow[]> {
  const rows = await prisma.$queryRaw<CurrentStockRow[]>`
    SELECT material_id, name, code, unit, min_stock, on_hand, status
    FROM current_stock
    ORDER BY
      CASE status WHEN 'OUT' THEN 0 WHEN 'LOW' THEN 1 ELSE 2 END,
      name
  `;
  // $queryRaw trả numeric dạng số; ép kiểu để chắc chắn là number.
  return rows.map((r) => ({
    ...r,
    min_stock: Number(r.min_stock),
    on_hand: Number(r.on_hand),
  }));
}

/** Tồn kho hiện tại của 1 vật liệu (để kiểm tra trước khi xuất). */
export async function getOnHand(materialId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ on_hand: number }[]>`
    SELECT on_hand FROM current_stock WHERE material_id = ${materialId}
  `;
  return rows.length ? Number(rows[0].on_hand) : 0;
}

/** Danh sách vật liệu cho dropdown. */
export async function getMaterials() {
  return prisma.material.findMany({ orderBy: { name: "asc" } });
}
