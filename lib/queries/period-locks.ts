import { prisma } from "@/lib/prisma";
import {
  periodLockScopeLabel,
  type PeriodLockScopeValue,
} from "@/lib/period-locks";

export interface PeriodLockRow {
  id: string;
  scope: PeriodLockScopeValue;
  scopeLabel: string;
  fromDate: Date;
  toDate: Date;
  reason: string | null;
  createdAt: Date;
  createdByName: string;
}

export async function getAccountingPeriodLocks(): Promise<PeriodLockRow[]> {
  const locks = await prisma.accountingPeriodLock.findMany({
    orderBy: [{ fromDate: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
    },
  });

  return locks.map((lock) => ({
    id: lock.id,
    scope: lock.scope,
    scopeLabel: periodLockScopeLabel(lock.scope),
    fromDate: lock.fromDate,
    toDate: lock.toDate,
    reason: lock.reason,
    createdAt: lock.createdAt,
    createdByName: lock.createdBy.name,
  }));
}
