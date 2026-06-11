import assert from "node:assert/strict";

async function main() {
  const resetPlanModule = await import("../lib/reset-data/reset-plan").catch((error: unknown) => ({ error }));
  assert.ok(!("error" in resetPlanModule), "reset data plan helper must exist");

  const { buildTruncateSql, preservedEmptyAppTables, tablesToReset } = resetPlanModule;

  assert.deepEqual(
    preservedEmptyAppTables,
    ["Permission", "User", "_prisma_migrations"],
    "empty-app reset must preserve only users, permissions, and Prisma migration metadata"
  );

  assert.deepEqual(
    tablesToReset([
      "User",
      "Permission",
      "_prisma_migrations",
      "UserPosition",
      "PositionPermission",
      "UserPositionAssignment",
      "UserPermissionOverride",
      "Material",
      "Warehouse",
      "StockMovement",
      "FutureAppTable",
    ]),
    [
      "FutureAppTable",
      "Material",
      "PositionPermission",
      "StockMovement",
      "UserPermissionOverride",
      "UserPosition",
      "UserPositionAssignment",
      "Warehouse",
    ],
    "reset must delete every non-preserved app table, including dynamic permission tables and future tables"
  );

  assert.equal(
    buildTruncateSql(["User", "Permission", "_prisma_migrations"]),
    null,
    "no truncate SQL should be built when there are no resettable tables"
  );

  assert.equal(
    buildTruncateSql(["User", "Odd\"Table", "Material"]),
    'TRUNCATE TABLE "Material", "Odd""Table" RESTART IDENTITY CASCADE',
    "truncate SQL must quote identifiers safely and consistently"
  );

  console.log("reset-data-plan tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
