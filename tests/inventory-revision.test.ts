import assert from "node:assert/strict";
import {
  buildRevisionSlotDeltas,
  stockChecksForNegativeDeltas,
  movementSignedQuantity,
  type RevisionMovement,
} from "../lib/inventory/revision";

function mv(
  id: string,
  materialId: string,
  warehouseId: string,
  type: "IN" | "OUT",
  quantity: number
): RevisionMovement {
  return { id, materialId, warehouseId, type, quantity };
}

{
  assert.equal(movementSignedQuantity(mv("m1", "mat-xm", "wh-main", "IN", 10)), 10);
  assert.equal(movementSignedQuantity(mv("m2", "mat-xm", "wh-main", "OUT", 4)), -4);
}

{
  const deltas = buildRevisionSlotDeltas(
    [mv("old-import", "mat-xm", "wh-main", "IN", 10)],
    [mv("new-import", "mat-xm", "wh-main", "IN", 6)]
  );

  assert.deepEqual(deltas, [
    { materialId: "mat-xm", warehouseId: "wh-main", delta: -4 },
  ]);
  assert.deepEqual(stockChecksForNegativeDeltas(deltas), [
    { materialId: "mat-xm", warehouseId: "wh-main", requiredAvailable: 4 },
  ]);
}

{
  const deltas = buildRevisionSlotDeltas(
    [mv("old-export", "mat-thep", "wh-main", "OUT", 3)],
    [mv("new-export", "mat-thep", "wh-main", "OUT", 8)]
  );

  assert.deepEqual(deltas, [
    { materialId: "mat-thep", warehouseId: "wh-main", delta: -5 },
  ]);
  assert.deepEqual(stockChecksForNegativeDeltas(deltas), [
    { materialId: "mat-thep", warehouseId: "wh-main", requiredAvailable: 5 },
  ]);
}

{
  const deltas = buildRevisionSlotDeltas(
    [
      mv("old-transfer-out", "mat-da", "wh-a", "OUT", 10),
      mv("old-transfer-in", "mat-da", "wh-b", "IN", 10),
    ],
    [
      mv("new-transfer-out", "mat-da", "wh-a", "OUT", 14),
      mv("new-transfer-in", "mat-da", "wh-c", "IN", 14),
    ]
  );

  assert.deepEqual(deltas, [
    { materialId: "mat-da", warehouseId: "wh-a", delta: -4 },
    { materialId: "mat-da", warehouseId: "wh-b", delta: -10 },
    { materialId: "mat-da", warehouseId: "wh-c", delta: 14 },
  ]);
  assert.deepEqual(stockChecksForNegativeDeltas(deltas), [
    { materialId: "mat-da", warehouseId: "wh-a", requiredAvailable: 4 },
    { materialId: "mat-da", warehouseId: "wh-b", requiredAvailable: 10 },
  ]);
}

console.log("inventory-revision tests passed");
