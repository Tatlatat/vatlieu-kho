import { prisma } from "@/lib/prisma";
import { REASON_LABELS } from "@/lib/validation";
import type { InventoryDocumentKind, MovementReasonValue } from "@/lib/inventory/posting";

export type InventoryDocumentStatusValue = "DRAFT" | "POSTED" | "VOIDED";

export const DOCUMENT_KIND_LABELS: Record<InventoryDocumentKind, string> = {
  IMPORT: "Phiếu nhập",
  EXPORT: "Phiếu xuất",
  TRANSFER: "Phiếu chuyển kho",
  OPENING: "Phiếu đầu kỳ",
  ADJUSTMENT: "Phiếu điều chỉnh",
};

export const DOCUMENT_STATUS_LABELS: Record<InventoryDocumentStatusValue, string> = {
  DRAFT: "Nháp",
  POSTED: "Đã ghi sổ",
  VOIDED: "Đã hủy",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo phiếu",
  POST: "Ghi sổ",
  EDIT_DRAFT: "Sửa nháp",
  EDIT_POSTED: "Sửa phiếu đã ghi sổ",
  VOID: "Hủy phiếu",
  DELETE_DRAFT: "Xóa nháp",
};

export interface InventoryDocumentListRow {
  id: string;
  code: string;
  kind: InventoryDocumentKind;
  kindLabel: string;
  status: InventoryDocumentStatusValue;
  statusLabel: string;
  documentDate: Date;
  createdAt: Date;
  warehouseLabel: string;
  supplierName: string | null;
  supplierCode: string | null;
  createdByName: string;
  lineCount: number;
  totalQuantity: number;
  revisionNo: number;
  note: string | null;
}

export interface InventoryDocumentDetail {
  id: string;
  code: string;
  kind: InventoryDocumentKind;
  kindLabel: string;
  status: InventoryDocumentStatusValue;
  statusLabel: string;
  documentDate: Date;
  createdAt: Date;
  updatedAt: Date;
  postedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  warehouseId: string | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierCode: string | null;
  warehouseLabel: string;
  warehouseName: string | null;
  fromWarehouseName: string | null;
  toWarehouseName: string | null;
  reason: MovementReasonValue | null;
  reasonLabel: string | null;
  note: string | null;
  revisionNo: number;
  createdByName: string;
  postedByName: string | null;
  voidedByName: string | null;
  lines: Array<{
    id: string;
    lineNo: number;
    materialId: string;
    materialName: string;
    materialCode: string;
    materialUnit: string;
    projectId: string | null;
    projectName: string | null;
    workItemId: string | null;
    workItemName: string | null;
    quantity: number;
    note: string | null;
  }>;
  movements: Array<{
    id: string;
    createdAt: Date;
    materialName: string;
    warehouseName: string;
    type: "IN" | "OUT";
    quantity: number;
    reason: string;
    reasonLabel: string;
    revisionNo: number | null;
    isActive: boolean;
    isVoid: boolean;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    actionLabel: string;
    fromRevisionNo: number | null;
    toRevisionNo: number | null;
    reason: string | null;
    changedByName: string;
    changedAt: Date;
  }>;
}

function statusValue(status: string): InventoryDocumentStatusValue {
  if (status === "DRAFT" || status === "POSTED" || status === "VOIDED") return status;
  return "DRAFT";
}

function documentWarehouseLabel(doc: {
  warehouse?: { name: string; code: string } | null;
  fromWarehouse?: { name: string; code: string } | null;
  toWarehouse?: { name: string; code: string } | null;
}) {
  if (doc.fromWarehouse || doc.toWarehouse) {
    const from = doc.fromWarehouse ? `${doc.fromWarehouse.name} (${doc.fromWarehouse.code})` : "Chưa chọn";
    const to = doc.toWarehouse ? `${doc.toWarehouse.name} (${doc.toWarehouse.code})` : "Chưa chọn";
    return `${from} -> ${to}`;
  }

  return doc.warehouse ? `${doc.warehouse.name} (${doc.warehouse.code})` : "Chưa chọn kho";
}

export function reasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return REASON_LABELS[reason] ?? reason;
}

export async function getInventoryDocuments(
  kind: InventoryDocumentKind
): Promise<InventoryDocumentListRow[]> {
  const docs = await prisma.inventoryDocument.findMany({
    where: { kind },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    include: {
      warehouse: { select: { name: true, code: true } },
      fromWarehouse: { select: { name: true, code: true } },
      toWarehouse: { select: { name: true, code: true } },
      supplier: { select: { name: true, code: true } },
      createdBy: { select: { name: true } },
      lines: { select: { quantity: true } },
    },
  });

  return docs.map((doc) => {
    const status = statusValue(doc.status);
    return {
      id: doc.id,
      code: doc.code,
      kind: doc.kind,
      kindLabel: DOCUMENT_KIND_LABELS[doc.kind],
      status,
      statusLabel: DOCUMENT_STATUS_LABELS[status],
      documentDate: doc.documentDate,
      createdAt: doc.createdAt,
      warehouseLabel: documentWarehouseLabel(doc),
      supplierName: doc.supplier?.name ?? null,
      supplierCode: doc.supplier?.code ?? null,
      createdByName: doc.createdBy.name,
      lineCount: doc.lines.length,
      totalQuantity: doc.lines.reduce((sum, line) => sum + line.quantity, 0),
      revisionNo: doc.revisionNo,
      note: doc.note,
    };
  });
}

export async function getInventoryDocumentDetail(
  id: string
): Promise<InventoryDocumentDetail | null> {
  const doc = await prisma.inventoryDocument.findUnique({
    where: { id },
    include: {
      warehouse: { select: { name: true, code: true } },
      fromWarehouse: { select: { name: true, code: true } },
      toWarehouse: { select: { name: true, code: true } },
      supplier: { select: { name: true, code: true } },
      createdBy: { select: { name: true } },
      postedBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          material: { select: { name: true, code: true, unit: true } },
          project: { select: { name: true } },
          workItem: { select: { name: true } },
        },
      },
      movements: {
        orderBy: { createdAt: "asc" },
        include: {
          material: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      },
      auditLogs: {
        orderBy: { changedAt: "desc" },
        include: {
          changedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!doc) return null;

  const status = statusValue(doc.status);
  return {
    id: doc.id,
    code: doc.code,
    kind: doc.kind,
    kindLabel: DOCUMENT_KIND_LABELS[doc.kind],
    status,
    statusLabel: DOCUMENT_STATUS_LABELS[status],
    documentDate: doc.documentDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    postedAt: doc.postedAt,
    voidedAt: doc.voidedAt,
    voidReason: doc.voidReason,
    warehouseId: doc.warehouseId,
    fromWarehouseId: doc.fromWarehouseId,
    toWarehouseId: doc.toWarehouseId,
    supplierId: doc.supplierId,
    supplierName: doc.supplier?.name ?? null,
    supplierCode: doc.supplier?.code ?? null,
    warehouseLabel: documentWarehouseLabel(doc),
    warehouseName: doc.warehouse?.name ?? null,
    fromWarehouseName: doc.fromWarehouse?.name ?? null,
    toWarehouseName: doc.toWarehouse?.name ?? null,
    reason: doc.reason,
    reasonLabel: reasonLabel(doc.reason),
    note: doc.note,
    revisionNo: doc.revisionNo,
    createdByName: doc.createdBy.name,
    postedByName: doc.postedBy?.name ?? null,
    voidedByName: doc.voidedBy?.name ?? null,
    lines: doc.lines.map((line) => ({
      id: line.id,
      lineNo: line.lineNo,
      materialId: line.materialId,
      materialName: line.material.name,
      materialCode: line.material.code,
      materialUnit: line.material.unit,
      projectId: line.projectId,
      projectName: line.project?.name ?? null,
      workItemId: line.workItemId,
      workItemName: line.workItem?.name ?? null,
      quantity: line.quantity,
      note: line.note,
    })),
    movements: doc.movements.map((movement) => {
      const isVoid = movement.reason === "VOID";
      return {
        id: movement.id,
        createdAt: movement.createdAt,
        materialName: movement.material.name,
        warehouseName: movement.warehouse.name,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        reasonLabel: reasonLabel(movement.reason) ?? movement.reason,
        revisionNo: movement.documentRevisionNo,
        isActive: movement.voidedAt == null && movement.supersededAt == null && !isVoid,
        isVoid,
      };
    }),
    auditLogs: doc.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actionLabel: AUDIT_ACTION_LABELS[log.action] ?? log.action,
      fromRevisionNo: log.fromRevisionNo,
      toRevisionNo: log.toRevisionNo,
      reason: log.reason,
      changedByName: log.changedBy.name,
      changedAt: log.changedAt,
    })),
  };
}
