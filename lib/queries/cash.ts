import { prisma } from "@/lib/prisma";

export interface FundBalanceRow {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  balance: number;
}

export interface CashEntryRow {
  id: string;
  type: "THU" | "CHI";
  category: string;
  amount: number;
  entryDate: Date;
  note: string | null;
  voidedAt: Date | null;
  createdByName: string | null;
}

export interface CashReport {
  totalIn: number;
  totalOut: number;
  balance: number;
  byCategory: { category: string; type: "THU" | "CHI"; total: number }[];
}

export interface ProjectCashSummaryRow {
  project_id: string | null;
  project_code: string | null;
  project_name: string;
  fund_count: number;
  total_in: number;
  total_out: number;
  balance: number;
}

/** Danh sách quỹ đang dùng. */
export async function getFunds() {
  return prisma.fund.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, code: true, note: true },
  });
}

/** Tất cả quỹ (gồm ngừng dùng) — cho trang danh mục. _count để biết có giao dịch chưa. */
export async function getAllFunds() {
  return prisma.fund.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      note: true,
      isActive: true,
      projectId: true,
      _count: { select: { entries: true } },
    },
  });
}

/** Tồn quỹ từ view fund_balance. fundId rỗng = tất cả quỹ. */
export async function getFundBalances(fundId?: string): Promise<FundBalanceRow[]> {
  const rows = fundId
    ? await prisma.$queryRaw<FundBalanceRow[]>`SELECT fund_id, fund_name, fund_code, balance::float8 AS balance FROM fund_balance WHERE fund_id = ${fundId}`
    : await prisma.$queryRaw<FundBalanceRow[]>`SELECT fund_id, fund_name, fund_code, balance::float8 AS balance FROM fund_balance ORDER BY fund_name`;
  return rows.map((r) => ({ ...r, balance: Number(r.balance) }));
}

/** Bút toán quỹ theo quỹ + khoảng ngày (orderBy ngày giảm dần). */
export async function listCashEntries(
  fundId: string,
  from: string,
  to: string
): Promise<CashEntryRow[]> {
  const entries = await prisma.cashEntry.findMany({
    where: {
      fundId,
      // Mốc ngày parse theo UTC nhất quán (thêm Z) — entryDate lưu UTC-midnight.
      entryDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) },
    },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });
  return entries.map((e) => ({
    id: e.id,
    type: e.type,
    category: e.category,
    amount: Number(e.amount),
    entryDate: e.entryDate,
    note: e.note,
    voidedAt: e.voidedAt,
    createdByName: e.createdBy?.name ?? null,
  }));
}

/** Báo cáo quỹ: tổng Thu/Chi/Tồn + nhóm theo hạng mục (loại bút toán đã void). */
export async function getCashReport(
  fundId: string,
  from: string,
  to: string
): Promise<CashReport> {
  const grouped = await prisma.$queryRaw<
    { type: "THU" | "CHI"; category: string; total: number }[]
  >`
    SELECT type, category, SUM(amount)::float8 AS total
    FROM "CashEntry"
    WHERE "fundId" = ${fundId}
      AND "voidedAt" IS NULL
      AND "entryDate" >= ${new Date(`${from}T00:00:00.000Z`)}
      AND "entryDate" <= ${new Date(`${to}T23:59:59.999Z`)}
    GROUP BY type, category
    ORDER BY type, total DESC`;

  let totalIn = 0;
  let totalOut = 0;
  const byCategory = grouped.map((g) => {
    const total = Number(g.total);
    if (g.type === "THU") totalIn += total;
    else totalOut += total;
    return { category: g.category, type: g.type, total };
  });
  return { totalIn, totalOut, balance: totalIn - totalOut, byCategory };
}

export async function getProjectCashSummary(from: string, to: string): Promise<ProjectCashSummaryRow[]> {
  const rows = await prisma.$queryRaw<ProjectCashSummaryRow[]>`
    WITH fund_scope AS (
      SELECT f.id AS fund_id, f."projectId", p.code AS project_code, p.name AS project_name
      FROM "Fund" f
      LEFT JOIN "Project" p ON p.id = f."projectId"
      WHERE f."isActive" = true
    ),
    period AS (
      SELECT ce."fundId", ce.type, SUM(ce.amount)::float8 AS total
      FROM "CashEntry" ce
      WHERE ce."voidedAt" IS NULL
        AND ce."entryDate" >= ${new Date(`${from}T00:00:00.000Z`)}
        AND ce."entryDate" <= ${new Date(`${to}T23:59:59.999Z`)}
      GROUP BY ce."fundId", ce.type
    )
    SELECT
      fs."projectId" AS project_id,
      fs.project_code,
      COALESCE(fs.project_name, 'Chưa gắn công trình') AS project_name,
      COUNT(DISTINCT fs.fund_id)::int AS fund_count,
      COALESCE(SUM(CASE WHEN p.type = 'THU' THEN p.total ELSE 0 END), 0)::float8 AS total_in,
      COALESCE(SUM(CASE WHEN p.type = 'CHI' THEN p.total ELSE 0 END), 0)::float8 AS total_out,
      (
        COALESCE(SUM(CASE WHEN p.type = 'THU' THEN p.total ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN p.type = 'CHI' THEN p.total ELSE 0 END), 0)
      )::float8 AS balance
    FROM fund_scope fs
    LEFT JOIN period p ON p."fundId" = fs.fund_id
    GROUP BY fs."projectId", fs.project_code, fs.project_name
    ORDER BY fs.project_name NULLS LAST
  `;

  return rows.map((r) => ({
    ...r,
    fund_count: Number(r.fund_count),
    total_in: Number(r.total_in),
    total_out: Number(r.total_out),
    balance: Number(r.balance),
  }));
}
