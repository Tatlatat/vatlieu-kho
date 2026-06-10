"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { type PeriodLockScopeValue } from "@/lib/period-locks";

export interface PeriodLockActionResult {
  ok: boolean;
  error?: string;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseScope(formData: FormData): PeriodLockScopeValue {
  const scope = formString(formData, "scope");
  if (scope === "INVENTORY" || scope === "FUND" || scope === "ALL") return scope;
  throw new Error("Phạm vi khóa kỳ không hợp lệ");
}

function parseLockDate(formData: FormData, key: string, label: string): Date {
  const rawDate = formString(formData, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) throw new Error(`${label} không hợp lệ`);

  const date = new Date(`${rawDate}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} không hợp lệ`);
  return date;
}

export async function createAccountingPeriodLock(formData: FormData): Promise<PeriodLockActionResult> {
  const user = await requirePermission("period.lock.manage");

  let scope: PeriodLockScopeValue;
  let fromDate: Date;
  let toDate: Date;
  try {
    scope = parseScope(formData);
    fromDate = parseLockDate(formData, "fromDate", "Từ ngày");
    toDate = parseLockDate(formData, "toDate", "Đến ngày");
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (fromDate > toDate) return { ok: false, error: "Từ ngày phải nhỏ hơn hoặc bằng đến ngày" };

  await prisma.accountingPeriodLock.create({
    data: {
      scope,
      fromDate,
      toDate,
      reason: formString(formData, "reason") || null,
      createdById: user.id,
    },
  });

  revalidatePath("/khoa-ky");
  return { ok: true };
}

export async function deleteAccountingPeriodLock(formData: FormData): Promise<PeriodLockActionResult> {
  await requirePermission("period.lock.manage");
  const id = formString(formData, "id");
  if (!id) return { ok: false, error: "Thiếu khóa kỳ" };

  try {
    await prisma.accountingPeriodLock.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Không tìm thấy khóa kỳ hoặc khóa đã được xóa" };
  }

  revalidatePath("/khoa-ky");
  return { ok: true };
}
