import assert from "node:assert/strict";
import { sumFundPrintAmount, sumInventoryPrintQuantity } from "../lib/print/document-totals";

assert.equal(
  sumInventoryPrintQuantity([
    { quantity: 2.5 },
    { quantity: 7.5 },
  ]),
  10
);

assert.equal(
  sumFundPrintAmount([
    { amount: 120_000 },
    { amount: 30_000 },
  ]),
  150_000
);

console.log("print-document tests passed");
