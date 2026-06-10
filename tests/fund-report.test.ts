import assert from "node:assert/strict";
import {
  calculateFundPeriodSummary,
  fundKindLabel,
  fundStatusLabel,
  type FundSignedEntry,
} from "../lib/funds/report";

function entry(date: string, signedAmount: number): FundSignedEntry {
  return {
    documentDate: new Date(`${date}T00:00:00+07:00`),
    signedAmount,
  };
}

{
  const summary = calculateFundPeriodSummary(
    [
      entry("2026-05-30", 2_000_000),
      entry("2026-06-01", 1_500_000),
      entry("2026-06-02", -300_000),
      entry("2026-06-30", -200_000),
      entry("2026-07-01", 9_000_000),
    ],
    new Date("2026-05-31T17:00:00.000Z"),
    new Date("2026-06-30T16:59:59.999Z")
  );

  assert.deepEqual(summary, {
    openingBalance: 2_000_000,
    receiptAmount: 1_500_000,
    paymentAmount: 500_000,
    closingBalance: 3_000_000,
  });
}

{
  const summary = calculateFundPeriodSummary(
    [entry("2026-06-10", 500_000), entry("2026-06-11", -125_000)],
    new Date("2026-06-09T17:00:00.000Z"),
    new Date("2026-06-11T16:59:59.999Z")
  );

  assert.equal(summary.openingBalance, 0);
  assert.equal(summary.closingBalance, 375_000);
}

{
  assert.equal(fundKindLabel("RECEIPT"), "Phiếu thu");
  assert.equal(fundKindLabel("PAYMENT"), "Phiếu chi");
  assert.equal(fundStatusLabel("POSTED"), "Đã ghi sổ");
  assert.equal(fundStatusLabel("VOIDED"), "Đã hủy");
}

console.log("fund-report tests passed");
