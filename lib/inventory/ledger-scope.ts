import { Prisma } from "@prisma/client";

export type InventoryLedgerDocumentStatus = "DRAFT" | "POSTED" | "VOIDED";
export type InventoryLedgerStocktakeStatus = "DRAFT" | "APPROVED" | "VOIDED";

export function isEffectiveStockMovementForReports(movement: {
  voidedAt: Date | null;
  supersededAt: Date | null;
  reason: string;
  documentStatus: InventoryLedgerDocumentStatus | null;
  stocktakeStatus: InventoryLedgerStocktakeStatus | null;
}) {
  if (movement.voidedAt || movement.supersededAt || movement.reason === "VOID") return false;
  return movement.documentStatus === "POSTED" || movement.stocktakeStatus === "APPROVED";
}

export const effectiveStockMovementWhere: Prisma.StockMovementWhereInput = {
  voidedAt: null,
  supersededAt: null,
  reason: { not: "VOID" },
  OR: [
    { documentId: { not: null }, document: { status: "POSTED" } },
    { stocktakeId: { not: null }, stocktake: { status: "APPROVED" } },
  ],
};

export const effectiveStockMovementJoinsSql = Prisma.sql`
  LEFT JOIN "InventoryDocument" d ON d.id = sm."documentId"
  LEFT JOIN "Stocktake" st ON st.id = sm."stocktakeId"
`;

export const effectiveStockMovementWhereSql = Prisma.sql`
  sm."voidedAt" IS NULL
  AND sm."supersededAt" IS NULL
  AND sm.reason <> 'VOID'
  AND (
    (sm."documentId" IS NOT NULL AND d.status = 'POSTED')
    OR (sm."stocktakeId" IS NOT NULL AND st.status = 'APPROVED')
  )
`;
