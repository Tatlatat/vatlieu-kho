"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { parseFundDocumentDate, parseFundDocumentLines } from "@/lib/funds/document-form";
import { snapshotFundDocument } from "@/lib/funds/audit";
import type { FundDocumentKindValue } from "@/lib/funds/report";
import { assertAccountingPeriodUnlocked } from "@/lib/period-locks";

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

  try {
    await prisma.$transaction(async (tx) => {
      await assertAccountingPeriodUnlocked(tx, { documentDate, scope: "FUND" });

      await tx.fundDocument.create({
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
          auditLogs: {
            create: {
              action: "POST",
              toRevisionNo: 1,
              changedById: user.id,
              reason: "Ghi sổ phiếu quỹ",
            },
          },
        },
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể tạo phiếu quỹ" };
  }

  revalidateFundPaths();
  return { ok: true };
}

export async function updateFundDocument(formData: FormData): Promise<FundActionResult> {
  const user = await requirePermission("fund.edit_posted");

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
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });
      if (!existing) throw new Error("Không tìm thấy phiếu quỹ");
      if (existing.status === "VOIDED") throw new Error("Không thể sửa phiếu quỹ đã hủy");
      if (existing.status !== "POSTED") throw new Error("Hiện chỉ hỗ trợ sửa phiếu quỹ đã ghi sổ");

      await assertAccountingPeriodUnlocked(tx, { documentDate: existing.documentDate, scope: "FUND" });
      await assertAccountingPeriodUnlocked(tx, { documentDate, scope: "FUND" });

      const fund = await tx.fund.findUnique({ where: { id: fundId }, select: { id: true } });
      if (!fund) throw new Error("Quỹ không tồn tại");

      const snapshotBefore = snapshotFundDocument(existing);
      const nextRevisionNo = existing.revisionNo + 1;

      await tx.fundDocumentLine.deleteMany({ where: { documentId } });
      const updated = await tx.fundDocument.update({
        where: { id: documentId },
        data: {
          fundId,
          kind,
          documentDate,
          note,
          revisionNo: nextRevisionNo,
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
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });

      await tx.fundDocumentAuditLog.create({
        data: {
          documentId,
          action: "EDIT_POSTED",
          fromRevisionNo: existing.revisionNo,
          toRevisionNo: nextRevisionNo,
          changedById: user.id,
          reason: "Sửa phiếu quỹ đã ghi sổ",
          snapshotBefore,
          snapshotAfter: snapshotFundDocument(updated),
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
    await prisma.$transaction(async (tx) => {
      const existing = await tx.fundDocument.findUnique({
        where: { id: documentId },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      });
      if (!existing) throw new Error("Không tìm thấy phiếu quỹ");
      if (existing.status !== "POSTED") throw new Error("Phiếu có thể đã bị hủy hoặc chưa ghi sổ");

      await assertAccountingPeriodUnlocked(tx, { documentDate: existing.documentDate, scope: "FUND" });

      await tx.fundDocument.update({
        where: { id: documentId },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidedById: user.id,
          voidReason: reason,
        },
      });

      await tx.fundDocumentAuditLog.create({
        data: {
          documentId,
          action: "VOID",
          fromRevisionNo: existing.revisionNo,
          toRevisionNo: existing.revisionNo,
          changedById: user.id,
          reason,
          snapshotBefore: snapshotFundDocument(existing),
        },
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể hủy phiếu quỹ" };
  }

  revalidateFundPaths(documentId);
  return { ok: true };
}
