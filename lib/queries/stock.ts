import { prisma } from "@/lib/prisma";

export type StockStatus = "OK" | "LOW" | "OUT";

export interface CurrentStockRow {
  material_id: string;
  name: string;
  code: string;
  unit: string;
  min_stock: number;
  warehouse_id: string;
  warehouse_name: string;
  on_hand: number;
  status: StockStatus;
}

/** Tồn hiện tại. Nếu truyền warehouseId thì lọc theo kho; không thì gộp mọi kho theo mã. */
export async function getCurrentStock(warehouseId?: string, opts?: { includeZero?: boolean }): Promise<CurrentStockRow[]> {
  if (warehouseId) {
    const rows = opts?.includeZero
      ? await prisma.$queryRaw<CurrentStockRow[]>`
          SELECT material_id, name, code, unit, min_stock, warehouse_id, warehouse_name, on_hand, status
          FROM current_stock
          WHERE warehouse_id = ${warehouseId}
          ORDER BY CASE status WHEN 'OUT' THEN 0 WHEN 'LOW' THEN 1 ELSE 2 END, name`
      : await prisma.$queryRaw<CurrentStockRow[]>`
          SELECT material_id, name, code, unit, min_stock, warehouse_id, warehouse_name, on_hand, status
          FROM current_stock
          WHERE warehouse_id = ${warehouseId} AND on_hand <> 0
          ORDER BY CASE status WHEN 'OUT' THEN 0 WHEN 'LOW' THEN 1 ELSE 2 END, name`;
    return rows.map((r) => ({ ...r, min_stock: Number(r.min_stock), on_hand: Number(r.on_hand) }));
  }
  type StockByMaterialRow = { material_id: string; name: string; code: string; unit: string; min_stock: number; total_on_hand: number };
  const rows = opts?.includeZero
    ? await prisma.$queryRaw<StockByMaterialRow[]>`
        SELECT material_id, name, code, unit, min_stock, total_on_hand FROM stock_by_material
        ORDER BY name`
    : await prisma.$queryRaw<StockByMaterialRow[]>`
        SELECT material_id, name, code, unit, min_stock, total_on_hand FROM stock_by_material
        WHERE total_on_hand <> 0 ORDER BY name`;
  return rows.map((r) => ({
    material_id: r.material_id, name: r.name, code: r.code, unit: r.unit,
    min_stock: Number(r.min_stock), warehouse_id: "", warehouse_name: "Tất cả kho",
    on_hand: Number(r.total_on_hand),
    status: (Number(r.total_on_hand) <= 0 ? "OUT" : Number(r.total_on_hand) <= Number(r.min_stock) ? "LOW" : "OK") as StockStatus,
  }));
}

/** Tồn của 1 vật liệu tại 1 kho cụ thể (kiểm tra trước khi xuất/chuyển). */
export async function getOnHand(materialId: string, warehouseId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ on_hand: number }[]>`
    SELECT on_hand FROM current_stock WHERE material_id = ${materialId} AND warehouse_id = ${warehouseId}`;
  return rows.length ? Number(rows[0].on_hand) : 0;
}

/** Danh sách vật liệu cho dropdown. */
export async function getMaterials() {
  return prisma.material.findMany({ orderBy: { name: "asc" } });
}
