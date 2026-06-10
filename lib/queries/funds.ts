import { prisma } from "@/lib/prisma";
import {
  calculateFundPeriodSummary,
  fundKindLabel,
  fundStatusLabel,
  type FundDocumentKindValue,
  type FundDocumentStatusValue,
  type FundSignedEntry,
} from "@/lib/funds/report";
import { fundAuditActionLabel } from "@/lib/funds/audit";

export type { FundDocumentKindValue, FundDocumentStatusValue };
export { FUND_KIND_LABELS, FUND_STATUS_LABELS, fundKindLabel, fundStatusLabel } from "@/lib/funds/report";

export interface FundOption {
  id: string;
  code: string;
  name: string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
}

export interface FundProjectOption {
  id: string;
  code: string;
  name: string;
}

export interface FundDocumentListRow {
  id: string;
  code: string;
  kind: FundDocumentKindValue;
  kindLabel: string;
  status: FundDocumentStatusValue;
  statusLabel: string;
  documentDate: Date;
  fundName: string;
  fundCode: string;
  projectName: string | null;
  createdByName: string;
  lineCount: number;
  totalAmount: number;
  revisionNo: number;
  note: string | null;
}

export interface FundDocumentDetail {
  id: string;
  code: string;
  kind: FundDocumentKindValue;
  kindLabel: string;
  status: FundDocumentStatusValue;
  statusLabel: string;
  documentDate: Date;
  fundId: string;
  fundName: string;
  fundCode: string;
  projectName: string | null;
  projectCode: string | null;
  note: string | null;
  revisionNo: number;
  createdAt: Date;
  updatedAt: Date;
  postedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdByName: string;
  postedByName: string | null;
  voidedByName: string | null;
  totalAmount: number;
  lines: Array<{
    id: string;
    lineNo: number;
    amount: number;
    category: string;
    description: string;
    note: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    actionLabel: string;
    fromRevisionNo: number | null;
    toRevisionNo: number | null;
    reason: string | null;
    changedAt: Date;
    changedByName: string;
  }>;
}

export interface FundReportRow {
  fundId: string;
  fundCode: string;
  fundName: string;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  openingBalance: number;
  receiptAmount: number;
  paymentAmount: number;
  closingBalance: number;
}

export interface FundReportData {
  from: string;
  to: string;
  projectId: string;
  projects: FundProjectOption[];
  rows: FundReportRow[];
  total: {
    openingBalance: number;
    receiptAmount: number;
    paymentAmount: number;
    closingBalance: number;
  };
}

function normalizeStatus(status: string): FundDocumentStatusValue {
  if (status === "DRAFT" || status === "POSTED" || status === "VOIDED") return status;
  return "DRAFT";
}

function normalizeKind(kind: string): FundDocumentKindValue {
  if (kind === "RECEIPT" || kind === "PAYMENT") return kind;
  return "PAYMENT";
}

function dateStart(date: string): Date {
  return new Date(`${date}T00:00:00+07:00`);
}

function dateEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999+07:00`);
}

function toFundOption(fund: {
  id: string;
  code: string;
  name: string;
  projectId: string | null;
  project?: { code: string; name: string } | null;
}): FundOption {
  return {
    id: fund.id,
    code: fund.code,
    name: fund.name,
    projectId: fund.projectId,
    projectCode: fund.project?.code ?? null,
    projectName: fund.project?.name ?? null,
  };
}

export async function getFundOptions(): Promise<FundOption[]> {
  const funds = await prisma.fund.findMany({
    orderBy: { name: "asc" },
    include: { project: { select: { code: true, name: true } } },
  });
  return funds.map(toFundOption);
}

export async function getFundDocuments(): Promise<FundDocumentListRow[]> {
  const docs = await prisma.fundDocument.findMany({
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    include: {
      fund: {
        select: {
          code: true,
          name: true,
          project: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true } },
      lines: { select: { amount: true } },
    },
  });

  return docs.map((doc) => {
    const kind = normalizeKind(doc.kind);
    const status = normalizeStatus(doc.status);
    return {
      id: doc.id,
      code: doc.code,
      kind,
      kindLabel: fundKindLabel(kind),
      status,
      statusLabel: fundStatusLabel(status),
      documentDate: doc.documentDate,
      fundName: doc.fund.name,
      fundCode: doc.fund.code,
      projectName: doc.fund.project?.name ?? null,
      createdByName: doc.createdBy.name,
      lineCount: doc.lines.length,
      totalAmount: doc.lines.reduce((sum, line) => sum + line.amount, 0),
      revisionNo: doc.revisionNo,
      note: doc.note,
    };
  });
}

export async function getFundDocumentDetail(id: string): Promise<FundDocumentDetail | null> {
  const doc = await prisma.fundDocument.findUnique({
    where: { id },
    include: {
      fund: {
        select: {
          id: true,
          code: true,
          name: true,
          project: { select: { code: true, name: true } },
        },
      },
      createdBy: { select: { name: true } },
      postedBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
      lines: { orderBy: { lineNo: "asc" } },
      auditLogs: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!doc) return null;

  const kind = normalizeKind(doc.kind);
  const status = normalizeStatus(doc.status);
  const lines = doc.lines.map((line) => ({
    id: line.id,
    lineNo: line.lineNo,
    amount: line.amount,
    category: line.category,
    description: line.description,
    note: line.note,
  }));

  return {
    id: doc.id,
    code: doc.code,
    kind,
    kindLabel: fundKindLabel(kind),
    status,
    statusLabel: fundStatusLabel(status),
    documentDate: doc.documentDate,
    fundId: doc.fundId,
    fundName: doc.fund.name,
    fundCode: doc.fund.code,
    projectName: doc.fund.project?.name ?? null,
    projectCode: doc.fund.project?.code ?? null,
    note: doc.note,
    revisionNo: doc.revisionNo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    postedAt: doc.postedAt,
    voidedAt: doc.voidedAt,
    voidReason: doc.voidReason,
    createdByName: doc.createdBy.name,
    postedByName: doc.postedBy?.name ?? null,
    voidedByName: doc.voidedBy?.name ?? null,
    totalAmount: lines.reduce((sum, line) => sum + line.amount, 0),
    lines,
    auditLogs: doc.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actionLabel: fundAuditActionLabel(log.action),
      fromRevisionNo: log.fromRevisionNo,
      toRevisionNo: log.toRevisionNo,
      reason: log.reason,
      changedAt: log.changedAt,
      changedByName: log.changedBy.name,
    })),
  };
}

export async function getFundReport(args: {
  from: string;
  to: string;
  projectId?: string;
}): Promise<FundReportData> {
  const fromDate = dateStart(args.from);
  const toDate = dateEnd(args.to);
  const projectId = args.projectId ?? "";

  const [projects, funds] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.fund.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { name: "asc" },
      include: { project: { select: { id: true, code: true, name: true } } },
    }),
  ]);

  const fundIds = funds.map((fund) => fund.id);
  const documents = fundIds.length
    ? await prisma.fundDocument.findMany({
        where: {
          fundId: { in: fundIds },
          status: "POSTED",
          voidedAt: null,
          documentDate: { lte: toDate },
        },
        select: {
          fundId: true,
          kind: true,
          documentDate: true,
          lines: { select: { amount: true } },
        },
      })
    : [];

  const entriesByFund = new Map<string, FundSignedEntry[]>();
  for (const doc of documents) {
    const sign = doc.kind === "RECEIPT" ? 1 : -1;
    const amount = doc.lines.reduce((sum, line) => sum + line.amount, 0);
    const entries = entriesByFund.get(doc.fundId) ?? [];
    entries.push({ documentDate: doc.documentDate, signedAmount: sign * amount });
    entriesByFund.set(doc.fundId, entries);
  }

  const rows = funds.map((fund) => {
    const summary = calculateFundPeriodSummary(entriesByFund.get(fund.id) ?? [], fromDate, toDate);
    return {
      fundId: fund.id,
      fundCode: fund.code,
      fundName: fund.name,
      projectId: fund.projectId,
      projectCode: fund.project?.code ?? null,
      projectName: fund.project?.name ?? null,
      ...summary,
    };
  });

  return {
    from: args.from,
    to: args.to,
    projectId,
    projects,
    rows,
    total: rows.reduce(
      (total, row) => ({
        openingBalance: total.openingBalance + row.openingBalance,
        receiptAmount: total.receiptAmount + row.receiptAmount,
        paymentAmount: total.paymentAmount + row.paymentAmount,
        closingBalance: total.closingBalance + row.closingBalance,
      }),
      { openingBalance: 0, receiptAmount: 0, paymentAmount: 0, closingBalance: 0 }
    ),
  };
}
