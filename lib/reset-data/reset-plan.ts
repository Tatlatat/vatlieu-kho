export const preservedEmptyAppTables = ["Permission", "User", "_prisma_migrations"] as const;

const preservedEmptyAppTableSet = new Set<string>(preservedEmptyAppTables);

export function tablesToReset(tableNames: Iterable<string>): string[] {
  return Array.from(new Set(tableNames))
    .filter((tableName) => !preservedEmptyAppTableSet.has(tableName))
    .sort((left, right) => left.localeCompare(right));
}

export function quotePostgresIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function buildTruncateSql(tableNames: Iterable<string>): string | null {
  const resettableTables = tablesToReset(tableNames);
  if (resettableTables.length === 0) return null;

  return `TRUNCATE TABLE ${resettableTables.map(quotePostgresIdentifier).join(", ")} RESTART IDENTITY CASCADE`;
}
