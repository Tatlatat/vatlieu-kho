import { requirePermission } from "@/lib/auth-helpers";
import { getAccountingPeriodLocks } from "@/lib/queries/period-locks";
import { PeriodLockManager } from "@/components/period-lock-manager";

export default async function PeriodLockPage() {
  await requirePermission("period.lock.manage");
  const locks = await getAccountingPeriodLocks();
  return <PeriodLockManager locks={locks} />;
}
