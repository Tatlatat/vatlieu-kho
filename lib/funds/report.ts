export type FundDocumentKindValue = "RECEIPT" | "PAYMENT";
export type FundDocumentStatusValue = "DRAFT" | "POSTED" | "VOIDED";

export const FUND_KIND_LABELS: Record<FundDocumentKindValue, string> = {
  RECEIPT: "Phiếu thu",
  PAYMENT: "Phiếu chi",
};

export const FUND_STATUS_LABELS: Record<FundDocumentStatusValue, string> = {
  DRAFT: "Nháp",
  POSTED: "Đã ghi sổ",
  VOIDED: "Đã hủy",
};

export interface FundSignedEntry {
  documentDate: Date;
  signedAmount: number;
}

export interface FundPeriodSummary {
  openingBalance: number;
  receiptAmount: number;
  paymentAmount: number;
  closingBalance: number;
}

export function fundKindLabel(kind: string): string {
  return FUND_KIND_LABELS[kind as FundDocumentKindValue] ?? kind;
}

export function fundStatusLabel(status: string): string {
  return FUND_STATUS_LABELS[status as FundDocumentStatusValue] ?? status;
}

export function calculateFundPeriodSummary(
  entries: FundSignedEntry[],
  from: Date,
  to: Date
): FundPeriodSummary {
  let openingBalance = 0;
  let receiptAmount = 0;
  let paymentAmount = 0;

  for (const entry of entries) {
    if (entry.documentDate < from) {
      openingBalance += entry.signedAmount;
      continue;
    }
    if (entry.documentDate > to) continue;

    if (entry.signedAmount >= 0) {
      receiptAmount += entry.signedAmount;
    } else {
      paymentAmount += Math.abs(entry.signedAmount);
    }
  }

  return {
    openingBalance,
    receiptAmount,
    paymentAmount,
    closingBalance: openingBalance + receiptAmount - paymentAmount,
  };
}
