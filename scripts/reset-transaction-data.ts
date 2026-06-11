import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");
const confirmReset = process.env.CONFIRM_RESET_TRANSACTIONS === "YES";
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

async function countTransactionRows() {
  const [
    stockMovements,
    stocktakes,
    stocktakeItems,
    inventoryDocuments,
    inventoryDocumentLines,
    documentAuditLogs,
    fundDocuments,
    fundDocumentLines,
    fundDocumentAuditLogs,
  ] = await Promise.all([
    prisma.stockMovement.count(),
    prisma.stocktake.count(),
    prisma.stocktakeItem.count(),
    prisma.inventoryDocument.count(),
    prisma.inventoryDocumentLine.count(),
    prisma.documentAuditLog.count(),
    prisma.fundDocument.count(),
    prisma.fundDocumentLine.count(),
    prisma.fundDocumentAuditLog.count(),
  ]);

  return {
    stockMovements,
    stocktakes,
    stocktakeItems,
    inventoryDocuments,
    inventoryDocumentLines,
    documentAuditLogs,
    fundDocuments,
    fundDocumentLines,
    fundDocumentAuditLogs,
  };
}

async function resetTransactionRows() {
  await prisma.$transaction([
    prisma.stockMovement.deleteMany({}),
    prisma.stocktakeItem.deleteMany({}),
    prisma.stocktake.deleteMany({}),
    prisma.documentAuditLog.deleteMany({}),
    prisma.inventoryDocumentLine.deleteMany({}),
    prisma.inventoryDocument.deleteMany({}),
    prisma.fundDocumentAuditLog.deleteMany({}),
    prisma.fundDocumentLine.deleteMany({}),
    prisma.fundDocument.deleteMany({}),
  ]);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const isLocal = isLocalDatabaseUrl(databaseUrl);
  const before = await countTransactionRows();

  console.log("Transaction rows before reset:");
  console.table(before);

  if (isDryRun) {
    console.log("Dry run only. No data was deleted.");
    return;
  }

  if (!confirmReset) {
    throw new Error("Set CONFIRM_RESET_TRANSACTIONS=YES to delete transaction data.");
  }
  if (!isLocal && !allowNonLocal) {
    throw new Error("DATABASE_URL is not local. Set ALLOW_NON_LOCAL_RESET=YES only after verifying the target DB.");
  }

  await resetTransactionRows();

  const after = await countTransactionRows();
  console.log("Transaction rows after reset:");
  console.table(after);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
