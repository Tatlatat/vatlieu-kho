import type { Prisma, DocType } from "@prisma/client";

const PREFIX: Record<DocType, string> = {
  IN: "PN",
  OUT: "PX",
  TRANSFER: "PC",
  STOCKTAKE: "KK",
};

/**
 * Sinh mã phiếu kế tiếp cho loại `type`, dạng <PREFIX>-<số 5 chữ số>.
 * Phải gọi TRONG transaction (tx) để tránh trùng mã khi tạo song song.
 * Khóa theo prefix bằng advisory lock để 2 phiếu cùng loại không lấy trùng số.
 */
export async function nextDocCode(
  tx: Prisma.TransactionClient,
  type: DocType
): Promise<string> {
  const prefix = PREFIX[type];
  // Khóa theo loại phiếu để số tăng không bị đua.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"doccode:" + prefix}))`;
  const last = await tx.document.findFirst({
    where: { type },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let n = 1;
  if (last?.code) {
    const num = parseInt(last.code.split("-")[1] ?? "0", 10);
    if (!Number.isNaN(num)) n = num + 1;
  }
  return `${prefix}-${String(n).padStart(5, "0")}`;
}
