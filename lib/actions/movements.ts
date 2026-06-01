"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { importSchema, exportSchema } from "@/lib/validation";
import { getOnHand } from "@/lib/queries/stock";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Nhập kho: ghi 1 dòng IN/PURCHASE vào sổ cái. */
export async function createImport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = importSchema.safeParse({
    materialId: formData.get("materialId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  await prisma.stockMovement.create({
    data: {
      materialId: parsed.data.materialId,
      type: "IN",
      reason: "PURCHASE",
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      createdById: user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true };
}

/** Xuất kho: chặn xuất quá tồn, ghi 1 dòng OUT/<reason> vào sổ cái. */
export async function createExport(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = exportSchema.safeParse({
    materialId: formData.get("materialId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Kiểm tra tồn kho — lớp bảo vệ thân thiện trước khi chạm DB constraint.
  const onHand = await getOnHand(parsed.data.materialId);
  if (parsed.data.quantity > onHand) {
    return {
      ok: false,
      error: `Không đủ tồn kho. Hiện chỉ còn ${onHand}, không thể xuất ${parsed.data.quantity}.`,
    };
  }

  await prisma.stockMovement.create({
    data: {
      materialId: parsed.data.materialId,
      type: "OUT",
      reason: parsed.data.reason,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      createdById: user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/lich-su");
  return { ok: true };
}
