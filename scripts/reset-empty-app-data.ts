import { PrismaClient } from "@prisma/client";
import {
  buildTruncateSql,
  preservedEmptyAppTables,
  quotePostgresIdentifier,
  tablesToReset,
} from "../lib/reset-data/reset-plan";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");
const confirmReset = process.env.CONFIRM_RESET_EMPTY_APP === "YES";
const allowNonLocal = process.env.ALLOW_NON_LOCAL_RESET === "YES";

function isLocalDatabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local");
  } catch {
    return false;
  }
}

async function getPublicTableNames() {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  `);

  return rows.map((row) => row.table_name);
}

async function countRows(tableNames: string[]) {
  const counts: Array<{ table: string; rows: string; preserved: boolean }> = [];

  for (const tableName of tableNames) {
    const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM ${quotePostgresIdentifier(tableName)}`
    );
    counts.push({
      table: tableName,
      rows: count,
      preserved: preservedEmptyAppTables.includes(tableName as (typeof preservedEmptyAppTables)[number]),
    });
  }

  return counts;
}

function nonZeroRows(counts: Array<{ table: string; rows: string; preserved: boolean }>) {
  return counts.filter((row) => row.rows !== "0");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const isLocal = isLocalDatabaseUrl(databaseUrl);
  const publicTables = await getPublicTableNames();
  const resetTables = tablesToReset(publicTables);
  const before = await countRows(publicTables);

  console.log("Preserved tables:");
  console.table([...preservedEmptyAppTables].map((table) => ({ table })));
  console.log("Non-zero tables before reset:");
  console.table(nonZeroRows(before));

  if (isDryRun) {
    console.log("Dry run only. No data was deleted.");
    return;
  }

  if (!confirmReset) {
    throw new Error("Set CONFIRM_RESET_EMPTY_APP=YES to delete all non-user/permission data.");
  }
  if (!isLocal && !allowNonLocal) {
    throw new Error("DATABASE_URL is not local. Set ALLOW_NON_LOCAL_RESET=YES only after verifying the target DB.");
  }

  const truncateSql = buildTruncateSql(resetTables);
  if (truncateSql) await prisma.$executeRawUnsafe(truncateSql);

  const after = await countRows(publicTables);
  const remainingNonPreserved = nonZeroRows(after).filter((row) => !row.preserved);

  console.log("Non-zero tables after reset:");
  console.table(nonZeroRows(after));

  if (remainingNonPreserved.length > 0) {
    throw new Error(`Reset incomplete. Non-preserved tables still contain rows: ${remainingNonPreserved.map((row) => row.table).join(", ")}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
