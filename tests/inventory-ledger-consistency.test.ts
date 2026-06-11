import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function main() {
  const ledgerScopeModule = await import("../lib/inventory/ledger-scope").catch((error: unknown) => ({ error }));
  assert.ok(!("error" in ledgerScopeModule), "ledger scope helper must exist");

  const { isEffectiveStockMovementForReports } = ledgerScopeModule;

  assert.equal(
    isEffectiveStockMovementForReports({
      voidedAt: null,
      supersededAt: null,
      reason: "PURCHASE",
      documentStatus: "POSTED",
      stocktakeStatus: null,
    }),
    true,
    "posted document movements are reportable"
  );
  assert.equal(
    isEffectiveStockMovementForReports({
      voidedAt: null,
      supersededAt: null,
      reason: "PURCHASE",
      documentStatus: null,
      stocktakeStatus: null,
    }),
    false,
    "orphan movements must not appear in history or stock reports"
  );
  assert.equal(
    isEffectiveStockMovementForReports({
      voidedAt: null,
      supersededAt: null,
      reason: "STOCKTAKE_ADJUST",
      documentStatus: null,
      stocktakeStatus: "APPROVED",
    }),
    true,
    "approved stocktake adjustments remain reportable"
  );
  assert.equal(
    isEffectiveStockMovementForReports({
      voidedAt: null,
      supersededAt: null,
      reason: "VOID",
      documentStatus: "POSTED",
      stocktakeStatus: null,
    }),
    false,
    "void reversal rows are not counted as active stock"
  );

  const balanceSource = readFileSync("lib/queries/balance.ts", "utf8");
  assert.match(balanceSource, /effectiveStockMovementJoinsSql/);
  assert.match(balanceSource, /effectiveStockMovementWhereSql/);

  const historySource = readFileSync("lib/queries/history.ts", "utf8");
  assert.match(historySource, /effectiveStockMovementWhere/);

  const reportsSource = readFileSync("lib/queries/reports.ts", "utf8");
  assert.match(reportsSource, /effectiveStockMovementJoinsSql/);
  assert.match(reportsSource, /effectiveStockMovementWhereSql/);

  const postgresLogic = readFileSync("db/postgres-logic.sql", "utf8");
  assert.match(postgresLogic, /d\.status = 'POSTED'/);
  assert.match(postgresLogic, /st\.status = 'APPROVED'/);

  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /document\s+InventoryDocument\?\s+@relation\(fields: \[documentId\], references: \[id\], onDelete: Cascade\)/);

  const resetScript = readFileSync("scripts/reset-transaction-data.ts", "utf8");
  assert.match(resetScript, /CONFIRM_RESET_TRANSACTIONS/);
  assert.match(resetScript, /isLocalDatabaseUrl/);

  console.log("inventory-ledger-consistency tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
