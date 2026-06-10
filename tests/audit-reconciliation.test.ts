import assert from "node:assert/strict";
import {
  calculateInventoryBalances,
  calculateSignedFundBalance,
} from "../lib/audit/reconciliation";

{
  const balances = calculateInventoryBalances([
    {
      materialId: "mat-xm",
      warehouseId: "wh-a",
      type: "IN",
      quantity: 60,
      reason: "PURCHASE",
    },
    {
      materialId: "mat-xm",
      warehouseId: "wh-a",
      type: "OUT",
      quantity: 55,
      reason: "PROJECT",
    },
    {
      materialId: "mat-xm",
      warehouseId: "wh-a",
      type: "OUT",
      quantity: 5,
      reason: "PROJECT",
      supersededAt: new Date("2026-06-11T00:00:00.000Z"),
    },
    {
      materialId: "mat-xm",
      warehouseId: "wh-a",
      type: "IN",
      quantity: 2,
      reason: "VOID",
    },
  ]);

  assert.deepEqual(balances, [
    {
      materialId: "mat-xm",
      warehouseId: "wh-a",
      onHand: 5,
    },
  ]);
}

{
  const balances = calculateInventoryBalances([
    { materialId: "mat-da", warehouseId: "wh-a", type: "IN", quantity: 10, reason: "PURCHASE" },
    { materialId: "mat-da", warehouseId: "wh-a", type: "OUT", quantity: 4, reason: "TRANSFER_OUT" },
    { materialId: "mat-da", warehouseId: "wh-b", type: "IN", quantity: 4, reason: "TRANSFER_IN" },
  ]);

  assert.deepEqual(balances, [
    { materialId: "mat-da", warehouseId: "wh-a", onHand: 6 },
    { materialId: "mat-da", warehouseId: "wh-b", onHand: 4 },
  ]);
}

assert.equal(calculateSignedFundBalance([
  { kind: "RECEIPT", amount: 2_000_000, status: "POSTED" },
  { kind: "PAYMENT", amount: 450_000, status: "POSTED" },
  { kind: "PAYMENT", amount: 50_000, status: "VOIDED" },
]), 1_550_000);

console.log("audit-reconciliation tests passed");
