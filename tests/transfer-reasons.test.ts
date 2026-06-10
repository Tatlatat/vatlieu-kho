import assert from "node:assert/strict";
import {
  TRANSFER_REASONS,
  isTransferReasonValue,
  transferReasonLabel,
} from "../lib/inventory/transfer-reasons";

assert.deepEqual(
  TRANSFER_REASONS.map((reason) => reason.value),
  ["INTERNAL_MOVE", "BORROW", "DIRECT_PROJECT", "RETURN", "OTHER"]
);

assert.equal(isTransferReasonValue("BORROW"), true);
assert.equal(isTransferReasonValue("UNKNOWN"), false);
assert.equal(transferReasonLabel("DIRECT_PROJECT"), "Xuất thẳng cho CT");
assert.equal(transferReasonLabel("Giao nội bộ theo chỉ đạo"), "Giao nội bộ theo chỉ đạo");
assert.equal(transferReasonLabel(null), null);

console.log("transfer-reasons tests passed");
