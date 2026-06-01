"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth-helpers";
import { getCurrentStock } from "@/lib/queries/stock";
import type { ActionResult } from "@/lib/actions/movements";

/** Tạo phiếu kiểm kê mới: chốt systemQty hiện tại cho mọi vật liệu. */
export async function createStocktake(): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  const stock = await getCurrentStock();
  if (stock.length === 0) {
    return { ok: false, error: "Chưa có vật liệu nào để kiểm kê." };
  }

  const code = `KK-${new Date().toISOString().slice(0, 10)}-${Math.floor(
    Math.random() * 9000 + 1000
  )}`;

  const stocktake = await prisma.stocktake.create({
    data: {
      code,
      status: "DRAFT",
      createdById: user.id,
      items: {
        create: stock.map((s) => ({
          materialId: s.material_id,
          systemQty: s.on_hand,
          countedQty: s.on_hand, // mặc định = tồn sổ, người dùng sửa lại
          diff: 0,
        })),
      },
    },
  });

  revalidatePath("/kiem-ke");
  return { ok: true, id: stocktake.id };
}

/** Lưu số đếm thực tế cho 1 item; tự tính diff = counted − system. */
export async function updateStocktakeItem(
  itemId: string,
  countedQty: number
): Promise<ActionResult> {
  await requireUser();
  if (!Number.isFinite(countedQty) || countedQty < 0) {
    return { ok: false, error: "Số đếm không hợp lệ." };
  }

  const item = await prisma.stocktakeItem.findUnique({
    where: { id: itemId },
    include: { stocktake: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy dòng kiểm kê." };
  if (item.stocktake.status === "APPROVED") {
    return { ok: false, error: "Phiếu đã duyệt, không thể sửa." };
  }

  await prisma.stocktakeItem.update({
    where: { id: itemId },
    data: { countedQty, diff: countedQty - item.systemQty },
  });

  revalidatePath(`/kiem-ke/${item.stocktakeId}`);
  return { ok: true };
}

/** Duyệt phiếu (chỉ OWNER): set APPROVED → trigger DB sinh STOCKTAKE_ADJUST. */
export async function approveStocktake(stocktakeId: string): Promise<ActionResult> {
  const user = await requireRole("OWNER");

  const st = await prisma.stocktake.findUnique({ where: { id: stocktakeId } });
  if (!st) return { ok: false, error: "Không tìm thấy phiếu." };
  if (st.status === "APPROVED") {
    return { ok: false, error: "Phiếu đã được duyệt trước đó." };
  }

  // Chỉ cập nhật status/approver — trigger Postgres lo phần ghi nhận hao hụt.
  await prisma.stocktake.update({
    where: { id: stocktakeId },
    data: {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath(`/kiem-ke/${stocktakeId}`);
  revalidatePath("/kiem-ke");
  revalidatePath("/");
  revalidatePath("/bao-cao");
  return { ok: true };
}
