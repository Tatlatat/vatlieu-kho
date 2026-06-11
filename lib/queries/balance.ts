import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  effectiveStockMovementJoinsSql,
  effectiveStockMovementWhereSql,
} from "@/lib/inventory/ledger-scope";

export interface BalanceRow {
  material_id: string;
  name: string;
  code: string;
  unit: string;
  opening: number;
  in_qty: number;
  out_qty: number;
  transfer_in: number;
  transfer_out: number;
  closing: number;
}

function buildQuery(from: string, to: string, whFilter: Prisma.Sql) {
  return Prisma.sql`
    WITH base AS (
      SELECT sm."materialId" AS material_id, m.name, m.code, m.unit, sm.reason, sm.type, sm.quantity,
        (sm."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') AS created_local,
        (CASE sm.type WHEN 'IN' THEN sm.quantity ELSE -sm.quantity END) AS signed,
        ((sm."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') >= ${from}::timestamp AND (sm."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') < ${to}::timestamp + INTERVAL '1 day') AS in_period
      FROM "StockMovement" sm
      JOIN "Material" m ON m.id = sm."materialId"
      ${effectiveStockMovementJoinsSql}
      WHERE ${effectiveStockMovementWhereSql} ${whFilter}
    )
    SELECT material_id, name, code, unit,
      COALESCE(SUM(CASE WHEN created_local < ${from}::timestamp THEN signed ELSE 0 END),0) AS opening,
      COALESCE(SUM(CASE WHEN in_period AND type='IN' AND reason <> 'TRANSFER_IN' THEN quantity ELSE 0 END),0) AS in_qty,
      COALESCE(SUM(CASE WHEN in_period AND type='OUT' AND reason <> 'TRANSFER_OUT' THEN quantity ELSE 0 END),0) AS out_qty,
      COALESCE(SUM(CASE WHEN in_period AND reason='TRANSFER_IN' THEN quantity ELSE 0 END),0) AS transfer_in,
      COALESCE(SUM(CASE WHEN in_period AND reason='TRANSFER_OUT' THEN quantity ELSE 0 END),0) AS transfer_out,
      COALESCE(SUM(CASE WHEN created_local < ${to}::timestamp + INTERVAL '1 day' THEN signed ELSE 0 END),0) AS closing
    FROM base
    GROUP BY material_id, name, code, unit
    HAVING COALESCE(SUM(CASE WHEN created_local < ${to}::timestamp + INTERVAL '1 day' THEN signed ELSE 0 END),0) <> 0
        OR COALESCE(SUM(CASE WHEN in_period THEN 1 ELSE 0 END),0) > 0
    ORDER BY name`;
}

export async function getBalanceReport(
  from: string,
  to: string,
  warehouseId?: string
): Promise<BalanceRow[]> {
  const whFilter = warehouseId
    ? Prisma.sql`AND sm."warehouseId" = ${warehouseId}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<BalanceRow[]>(buildQuery(from, to, whFilter));
  return rows.map((r) => ({
    ...r,
    opening: Number(r.opening),
    in_qty: Number(r.in_qty),
    out_qty: Number(r.out_qty),
    transfer_in: Number(r.transfer_in),
    transfer_out: Number(r.transfer_out),
    closing: Number(r.closing),
  }));
}

export async function getMaterialLedger(
  materialId: string,
  from: string,
  to: string,
  warehouseId?: string
) {
  const whFilter = warehouseId
    ? Prisma.sql`AND sm."warehouseId" = ${warehouseId}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<
    Array<{
      created_at: Date;
      type: string;
      reason: string;
      quantity: number;
      warehouse_name: string;
      note: string | null;
      voided: boolean;
    }>
  >(Prisma.sql`
    SELECT sm."createdAt" AS created_at, sm.type, sm.reason, sm.quantity,
           w.name AS warehouse_name, sm.note, (sm."voidedAt" IS NOT NULL) AS voided
    FROM "StockMovement" sm
    JOIN "Warehouse" w ON w.id = sm."warehouseId"
    ${effectiveStockMovementJoinsSql}
    WHERE sm."materialId" = ${materialId}
      AND ${effectiveStockMovementWhereSql}
      AND (sm."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') >= ${from}::timestamp AND (sm."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') < ${to}::timestamp + INTERVAL '1 day'
      ${whFilter}
    ORDER BY sm."createdAt"`);
  return rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
}
