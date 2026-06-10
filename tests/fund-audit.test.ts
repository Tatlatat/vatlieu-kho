import assert from "node:assert/strict";
import { fundAuditActionLabel, snapshotFundDocument } from "../lib/funds/audit";

const snapshot = snapshotFundDocument({
  id: "fund-doc-1",
  code: "PT-001",
  kind: "RECEIPT",
  status: "POSTED",
  documentDate: new Date("2026-06-10T00:00:00+07:00"),
  fundId: "fund-1",
  note: "Thu tạm ứng",
  revisionNo: 2,
  lines: [
    {
      lineNo: 1,
      amount: 1_000_000,
      category: "Tạm ứng",
      description: "Nhận tiền từ văn phòng",
      note: null,
    },
  ],
});

assert.deepEqual(snapshot, {
  id: "fund-doc-1",
  code: "PT-001",
  kind: "RECEIPT",
  status: "POSTED",
  documentDate: "2026-06-09T17:00:00.000Z",
  fundId: "fund-1",
  note: "Thu tạm ứng",
  revisionNo: 2,
  lines: [
    {
      lineNo: 1,
      amount: 1_000_000,
      category: "Tạm ứng",
      description: "Nhận tiền từ văn phòng",
      note: null,
    },
  ],
});

assert.equal(fundAuditActionLabel("POST"), "Ghi sổ");
assert.equal(fundAuditActionLabel("EDIT_POSTED"), "Sửa phiếu đã ghi sổ");
assert.equal(fundAuditActionLabel("VOID"), "Hủy phiếu");
assert.equal(fundAuditActionLabel("UNKNOWN"), "UNKNOWN");

console.log("fund-audit tests passed");
