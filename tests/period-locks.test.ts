import assert from "node:assert/strict";
import {
  findMatchingPeriodLock,
  isPeriodLocked,
  periodLockScopeLabel,
  type PeriodLockLike,
} from "../lib/period-locks";

function date(value: string): Date {
  return new Date(`${value}T00:00:00+07:00`);
}

const juneInventoryLock: PeriodLockLike = {
  scope: "INVENTORY",
  fromDate: date("2026-06-01"),
  toDate: date("2026-06-30"),
  reason: "Chốt kỳ tháng 06/2026",
};

assert.equal(isPeriodLocked(date("2026-06-01"), "INVENTORY", [juneInventoryLock]), true);
assert.equal(isPeriodLocked(date("2026-06-30"), "INVENTORY", [juneInventoryLock]), true);
assert.equal(isPeriodLocked(date("2026-07-01"), "INVENTORY", [juneInventoryLock]), false);
assert.equal(isPeriodLocked(date("2026-06-15"), "FUND", [juneInventoryLock]), false);

const allScopeLock: PeriodLockLike = {
  scope: "ALL",
  fromDate: date("2026-05-01"),
  toDate: date("2026-05-31"),
  reason: "Chốt toàn bộ tháng 05/2026",
};

assert.equal(isPeriodLocked(date("2026-05-10"), "FUND", [allScopeLock]), true);
assert.equal(isPeriodLocked(date("2026-05-10"), "INVENTORY", [allScopeLock]), true);

assert.deepEqual(findMatchingPeriodLock(date("2026-06-15"), "INVENTORY", [juneInventoryLock]), juneInventoryLock);
assert.equal(findMatchingPeriodLock(date("2026-06-15"), "FUND", [juneInventoryLock]), null);
assert.equal(periodLockScopeLabel("INVENTORY"), "Kho");
assert.equal(periodLockScopeLabel("FUND"), "Quỹ");
assert.equal(periodLockScopeLabel("ALL"), "Kho và quỹ");

console.log("period-locks tests passed");
