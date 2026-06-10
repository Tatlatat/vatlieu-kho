export type InventoryDocumentKind =
  | "IMPORT"
  | "EXPORT"
  | "TRANSFER"
  | "OPENING"
  | "ADJUSTMENT";

export type MovementTypeValue = "IN" | "OUT";

export type MovementReasonValue =
  | "PURCHASE"
  | "PROJECT"
  | "DAMAGED"
  | "EXPIRED"
  | "NATURAL_LOSS"
  | "STOCKTAKE_ADJUST"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "VOID";

export interface PostingLine {
  id: string;
  materialId: string;
  quantity: number;
  note?: string | null;
}

export interface PostingDocument {
  id: string;
  kind: InventoryDocumentKind;
  revisionNo: number;
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  reason?: MovementReasonValue | null;
  note?: string | null;
  lines: PostingLine[];
}

export interface StockMovementInput {
  materialId: string;
  warehouseId: string;
  type: MovementTypeValue;
  quantity: number;
  reason: MovementReasonValue;
  note?: string | null;
  documentId: string;
  documentLineId: string;
  documentRevisionNo: number;
  createdById: string;
}

function requireWarehouse(value: string | null | undefined, label: string): string {
  if (!value) throw new Error(`Thiếu ${label}`);
  return value;
}

export function buildStockMovementInputs(
  doc: PostingDocument,
  createdById: string
): StockMovementInput[] {
  if (doc.lines.length === 0) throw new Error("Phiếu phải có ít nhất một dòng");

  if (doc.kind === "TRANSFER") {
    const fromWarehouseId = requireWarehouse(doc.fromWarehouseId, "kho nguồn");
    const toWarehouseId = requireWarehouse(doc.toWarehouseId, "kho nhận");

    return doc.lines.flatMap((line) => [
      {
        materialId: line.materialId,
        warehouseId: fromWarehouseId,
        type: "OUT",
        quantity: line.quantity,
        reason: "TRANSFER_OUT",
        note: line.note ?? doc.note ?? null,
        documentId: doc.id,
        documentLineId: line.id,
        documentRevisionNo: doc.revisionNo,
        createdById,
      },
      {
        materialId: line.materialId,
        warehouseId: toWarehouseId,
        type: "IN",
        quantity: line.quantity,
        reason: "TRANSFER_IN",
        note: line.note ?? doc.note ?? null,
        documentId: doc.id,
        documentLineId: line.id,
        documentRevisionNo: doc.revisionNo,
        createdById,
      },
    ]);
  }

  const warehouseId = requireWarehouse(doc.warehouseId, "kho");
  const isIn = doc.kind === "IMPORT" || doc.kind === "OPENING";
  const reason =
    doc.kind === "IMPORT" || doc.kind === "OPENING"
      ? "PURCHASE"
      : doc.reason ?? "PROJECT";

  return doc.lines.map((line) => ({
    materialId: line.materialId,
    warehouseId,
    type: isIn ? "IN" : "OUT",
    quantity: line.quantity,
    reason,
    note: line.note ?? doc.note ?? null,
    documentId: doc.id,
    documentLineId: line.id,
    documentRevisionNo: doc.revisionNo,
    createdById,
  }));
}
