import assert from "node:assert/strict";
import { buildStockMovementInputs } from "../lib/inventory/posting";

const userId = "user-1";

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-import",
      kind: "IMPORT",
      revisionNo: 1,
      warehouseId: "wh-main",
      lines: [
        { id: "line-1", materialId: "mat-xm", quantity: 10 },
        { id: "line-2", materialId: "mat-thep", quantity: 5 },
      ],
    },
    userId
  );

  assert.deepEqual(
    movements.map((m) => ({
      materialId: m.materialId,
      warehouseId: m.warehouseId,
      type: m.type,
      reason: m.reason,
      quantity: m.quantity,
      documentId: m.documentId,
      documentLineId: m.documentLineId,
      documentRevisionNo: m.documentRevisionNo,
      createdById: m.createdById,
    })),
    [
      {
        materialId: "mat-xm",
        warehouseId: "wh-main",
        type: "IN",
        reason: "PURCHASE",
        quantity: 10,
        documentId: "doc-import",
        documentLineId: "line-1",
        documentRevisionNo: 1,
        createdById: userId,
      },
      {
        materialId: "mat-thep",
        warehouseId: "wh-main",
        type: "IN",
        reason: "PURCHASE",
        quantity: 5,
        documentId: "doc-import",
        documentLineId: "line-2",
        documentRevisionNo: 1,
        createdById: userId,
      },
    ]
  );
}

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-export",
      kind: "EXPORT",
      revisionNo: 1,
      warehouseId: "wh-main",
      reason: "PROJECT",
      lines: [{ id: "line-1", materialId: "mat-xm", quantity: 3 }],
    },
    userId
  );

  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, "OUT");
  assert.equal(movements[0].reason, "PROJECT");
  assert.equal(movements[0].warehouseId, "wh-main");
}

{
  const movements = buildStockMovementInputs(
    {
      id: "doc-transfer",
      kind: "TRANSFER",
      revisionNo: 2,
      fromWarehouseId: "wh-a",
      toWarehouseId: "wh-b",
      lines: [{ id: "line-1", materialId: "mat-da", quantity: 7 }],
    },
    userId
  );

  assert.deepEqual(
    movements.map((m) => ({
      type: m.type,
      reason: m.reason,
      warehouseId: m.warehouseId,
      quantity: m.quantity,
    })),
    [
      { type: "OUT", reason: "TRANSFER_OUT", warehouseId: "wh-a", quantity: 7 },
      { type: "IN", reason: "TRANSFER_IN", warehouseId: "wh-b", quantity: 7 },
    ]
  );
}

console.log("inventory-posting tests passed");
