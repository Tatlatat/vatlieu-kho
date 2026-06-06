import { prisma } from "@/lib/prisma";

export interface ProjectStockRow {
  materialName: string;
  unit: string;
  totalIn: number;
  totalOut: number;
  balance: number;
}

export interface ProjectCash {
  totalIn: number;
  totalOut: number;
  balance: number;
}

export interface ProjectEquipmentRow {
  equipmentName: string;
  plateNo: string | null;
  totalHours: number;
}

export interface ProjectSummary {
  project: { id: string; code: string; name: string; isActive: boolean; note: string | null };
  stock: ProjectStockRow[];
  cash: ProjectCash;
  equipment: ProjectEquipmentRow[];
  totalCostVnd: number;
}

/** Danh sách công trình + đếm kho/quỹ (cho trang danh mục + nút xóa). */
export async function getAllProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      note: true,
      _count: { select: { warehouses: true, funds: true } },
    },
  });
}

/**
 * Tổng hợp 1 công trình: tồn vật tư (qua kho của CT, đơn vị gốc) +
 * dòng tiền quỹ (qua quỹ của CT, VND). Mỗi sổ GIỮ ĐƠN VỊ RIÊNG.
 * Tổng chi phí = cộng-dồn-nguồn-có-tiền (hôm nay chỉ quỹ).
 */
export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, name: true, isActive: true, note: true },
  });
  if (!project) return null;

  const [whs, funds] = await Promise.all([
    prisma.warehouse.findMany({ where: { projectId }, select: { id: true } }),
    prisma.fund.findMany({ where: { projectId }, select: { id: true } }),
  ]);
  const whIds = whs.map((w) => w.id);
  const fundIds = funds.map((f) => f.id);

  // Tồn vật tư: nhập cộng / xuất trừ, loại voided. Đơn vị gốc (m³, viên…).
  const stock: ProjectStockRow[] = whIds.length
    ? await prisma.$queryRaw<ProjectStockRow[]>`
        SELECT m.name AS "materialName", m.unit AS unit,
          COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE 0 END), 0)::float8 AS "totalIn",
          COALESCE(SUM(CASE WHEN sm.type = 'OUT' THEN sm.quantity ELSE 0 END), 0)::float8 AS "totalOut",
          COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0)::float8 AS balance
        FROM "StockMovement" sm
        JOIN "Material" m ON m.id = sm."materialId"
        WHERE sm."warehouseId" = ANY(${whIds}) AND sm."voidedAt" IS NULL
        GROUP BY m.name, m.unit
        ORDER BY m.name`
    : [];

  // Giờ xe: group EquipmentLog theo xe qua projectId, tổng giờ.
  const equipment: ProjectEquipmentRow[] = await prisma.$queryRaw<ProjectEquipmentRow[]>`
    SELECT e.name AS "equipmentName", e."plateNo" AS "plateNo",
      ROUND(COALESCE(SUM(el.hours), 0)::numeric, 1)::float8 AS "totalHours"
    FROM "EquipmentLog" el
    JOIN "Equipment" e ON e.id = el."equipmentId"
    WHERE el."projectId" = ${projectId}
    GROUP BY e.name, e."plateNo"
    ORDER BY e.name`;

  // Dòng tiền quỹ: tổng Thu/Chi loại voided. Đơn vị VND.
  const cashRows = fundIds.length
    ? await prisma.$queryRaw<{ totalIn: number; totalOut: number }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'THU' THEN amount ELSE 0 END), 0)::float8 AS "totalIn",
          COALESCE(SUM(CASE WHEN type = 'CHI' THEN amount ELSE 0 END), 0)::float8 AS "totalOut"
        FROM "CashEntry"
        WHERE "fundId" = ANY(${fundIds}) AND "voidedAt" IS NULL`
    : [{ totalIn: 0, totalOut: 0 }];
  const totalIn = Number(cashRows[0]?.totalIn ?? 0);
  const totalOut = Number(cashRows[0]?.totalOut ?? 0);
  const cash: ProjectCash = { totalIn, totalOut, balance: totalIn - totalOut };

  // Cộng-dồn-nguồn: hôm nay chỉ quỹ có giá trị tiền. Thêm nguồn (đơn giá vật tư,
  // giờ xe) sau = cộng thêm dòng, KHÔNG sửa khung.
  const totalCostVnd = cash.totalOut;

  return { project, stock, cash, equipment, totalCostVnd };
}

export interface ProjectSummaryRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  cashBalance: number;
  totalIn: number;
  totalOut: number;
  totalCostVnd: number;
}

/** Bảng tổng hợp TẤT CẢ công trình (cho trang danh sách đa-CT). */
export async function getAllProjectsSummary(): Promise<ProjectSummaryRow[]> {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true } });
  const out: ProjectSummaryRow[] = [];
  for (const p of projects) {
    const s = await getProjectSummary(p.id);
    if (!s) continue;
    out.push({
      id: s.project.id,
      name: s.project.name,
      code: s.project.code,
      isActive: s.project.isActive,
      cashBalance: s.cash.balance,
      totalIn: s.cash.totalIn,
      totalOut: s.cash.totalOut,
      totalCostVnd: s.totalCostVnd,
    });
  }
  return out;
}
