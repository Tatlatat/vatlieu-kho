export type PeriodLockScopeValue = "INVENTORY" | "FUND" | "ALL";

export interface PeriodLockLike {
  scope: PeriodLockScopeValue;
  fromDate: Date;
  toDate: Date;
  reason: string | null;
}

export function periodLockScopeLabel(scope: string): string {
  if (scope === "INVENTORY") return "Kho";
  if (scope === "FUND") return "Quỹ";
  if (scope === "ALL") return "Kho và quỹ";
  return scope;
}

function startOfVietnamDate(date: Date): Date {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return new Date(`${formatted}T00:00:00+07:00`);
}

export function dateOnlyInVietnam(date: Date): Date {
  return startOfVietnamDate(date);
}

function scopeMatches(lockScope: PeriodLockScopeValue, requestedScope: PeriodLockScopeValue): boolean {
  return lockScope === "ALL" || lockScope === requestedScope;
}

export function findMatchingPeriodLock(
  documentDate: Date,
  scope: PeriodLockScopeValue,
  locks: PeriodLockLike[]
): PeriodLockLike | null {
  const target = dateOnlyInVietnam(documentDate).getTime();
  return (
    locks.find((lock) => {
      if (!scopeMatches(lock.scope, scope)) return false;
      const from = dateOnlyInVietnam(lock.fromDate).getTime();
      const to = dateOnlyInVietnam(lock.toDate).getTime();
      return from <= target && target <= to;
    }) ?? null
  );
}

export function isPeriodLocked(
  documentDate: Date,
  scope: PeriodLockScopeValue,
  locks: PeriodLockLike[]
): boolean {
  return findMatchingPeriodLock(documentDate, scope, locks) !== null;
}

export function periodLockBlockedMessage(lock: PeriodLockLike): string {
  const from = dateOnlyInVietnam(lock.fromDate).toLocaleDateString("vi-VN");
  const to = dateOnlyInVietnam(lock.toDate).toLocaleDateString("vi-VN");
  const scope = periodLockScopeLabel(lock.scope);
  const reason = lock.reason ? ` Lý do: ${lock.reason}` : "";
  return `Kỳ ${scope} từ ${from} đến ${to} đã khóa, không thể thay đổi chứng từ.${reason}`;
}

interface PeriodLockClient {
  accountingPeriodLock: {
    findMany(args: {
      where: {
        fromDate: { lte: Date };
        toDate: { gte: Date };
        scope: { in: PeriodLockScopeValue[] };
      };
      orderBy: { createdAt: "desc" };
      take: number;
    }): Promise<PeriodLockLike[]>;
  };
}

export async function assertAccountingPeriodUnlocked(
  tx: PeriodLockClient,
  args: { documentDate: Date; scope: PeriodLockScopeValue }
): Promise<void> {
  const locks = await tx.accountingPeriodLock.findMany({
    where: {
      fromDate: { lte: args.documentDate },
      toDate: { gte: args.documentDate },
      scope: { in: [args.scope, "ALL"] },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const lock = locks[0] as PeriodLockLike | undefined;
  if (lock) throw new Error(periodLockBlockedMessage(lock));
}
