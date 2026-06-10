"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { parseFundDocumentDate, parseFundDocumentLines } from "@/lib/funds/document-form";
import type { FundDocumentKindValue } from "@/lib/funds/report";

export interface FundActionResult {
  ok: boolean;
  error?: string;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function documentCode(kind: FundDocumentKindValue): string {
  const prefix = kind === "RECEIPT" ? "PT" : "PC";
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function parseKind(formData: FormData): FundDocumentKindValue {
  const kind = formString(formData, "kind");
  if (kind === "RECEIPT" || kind === "PAYMENT") return kind;
  throw new Error("Loại phiếu quỹ không hợp lệ");
}

function requireDocumentId(formData: FormData): string {
  const documentId = formString(formData, "documentId");
  if (!documentId) throw new Error("Thiếu phiếu quỹ");
  return documentId;
}

function revalidateFundPaths(documentId?: string) {
  revalidatePath("/");
  revalidatePath("/quy");
  revalidatePath("/bao-cao");
  revalidatePath("/cong-trinh");
  if (documentId) {
    revalidatePath(`/quy/${documentId}`);
    revalidatePath(`/quy/${documentId}/sua`);
  }
}

export async function createFundDocument(formData: FormData): Promise<FundActionResult> {
  const user = await requirePermission("fund.create");

  let kind: FundDocumentKindValue;
  let documentDate: Date;
  let lines: ReturnType<typeof parseFundDocumentLines>;
  try {
    kind = parseKind(formData);
    documentDate = parseFundDocumentDate(formData);
    lines = parseFundDocumentLines(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const fundId = formString(formData, "fundId");
  const note = formString(formData, "note") || null;
  if (!fundId) return { ok: false, error: "Vui lòng chọn quỹ" };

  const fund = await prisma.fund.findUnique({ where: { id: fundId }, select: { id: true } });
  if (!fund) return { ok: false, error: "Quỹ không tồn tại" };

  await prisma.fundDocument.create({
    data: {
      code: documentCode(kind),
      fundId,
      kind,
      status: "POSTED",
      documentDate,
      note,
      createdById: user.id,
      postedById: user.id,
      postedAt: new Date(),
      lines: {
        create: lines.map((line, index) => ({
          lineNo: index + 1,
          amount: line.amount,
          category: line.category,
          description: line.description,
          note: line.note,
        })),
      },
    },
  });

  revalidateFundPaths();
  return { ok: true };
}

export async function updateFundDocument(formData: FormData): Promise<FundActionResult> {
  await requirePermission("fund.edit_posted");

  let documentId: string;
  let kind: FundDocumentKindValue;
  let documentDate: Date;
  let lines: ReturnType<typeof parseFundDocumentLines>;
  try {
    documentId = requireDocumentId(formData);
    kind = parseKind(formData);
    documentDate = parseFundDocumentDate(formData);
    lines = parseFundDocumentLines(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const fundId = formString(formData, "fundId");
  const note = formString(formData, "note") || null;
  if (!fundId) return { ok: false, error: "Vui lòng chọn quỹ" };

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.fundDocument.findUnique({
        where: { id: documentId },
        select: { id: true, status: true, revisionNo: true },
      });
      if (!existing) throw new Error("Không tìm thấy phiếu quỹ");
      if (existing.status === "VOIDED") throw new Error("Không thể sửa phiếu quỹ đã hủy");
      if (existing.status !== "POSTED") throw new Error("Hiện chỉ hỗ trợ sửa phiếu quỹ đã ghi sổ");

      const fund = await tx.fund.findUnique({ where: { id: fundId }, select: { id: true } });
      if (!fund) throw new Error("Quỹ không tồn tại");

      await tx.fundDocumentLine.deleteMany({ where: { documentId } });
      await tx.fundDocument.update({
        where: { id: documentId },
        data: {
          fundId,
          kind,
          documentDate,
          note,
          revisionNo: existing.revisionNo + 1,
          lines: {
            create: lines.map((line, index) => ({
              lineNo: index + 1,
              amount: line.amount,
              category: line.category,
              description: line.description,
              note: line.note,
            })),
          },
        },
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể cập nhật phiếu quỹ" };
  }

  revalidateFundPaths(documentId);
  return { ok: true };
}

export async function voidFundDocument(formData: FormData): Promise<FundActionResult> {
  const user = await requirePermission("fund.void");

  let documentId: string;
  try {
    documentId = requireDocumentId(formData);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const reason = formString(formData, "reason");
  if (!reason) return { ok: false, error: "Vui lòng nhập lý do hủy" };

  try {
    await prisma.fundDocument.update({
      where: { id: documentId, status: "POSTED" },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedById: user.id,
        voidReason: reason,
      },
    });
  } catch {
    return { ok: false, error: "Không thể hủy phiếu quỹ. Phiếu có thể không tồn tại hoặc đã bị hủy." };
  }

  revalidateFundPaths(documentId);
  return { ok: true };
}
