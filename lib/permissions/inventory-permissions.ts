import type { PermissionCode } from "@/lib/permissions/catalog";

export type InventoryPermissionKind = "IMPORT" | "EXPORT" | "TRANSFER" | "OPENING" | "ADJUSTMENT";
export type InventoryPermissionAction = "view" | "create" | "edit_posted" | "void";

const DOCUMENT_PERMISSION_PREFIX: Record<InventoryPermissionKind, string> = {
  IMPORT: "inventory.import",
  EXPORT: "inventory.export",
  TRANSFER: "inventory.transfer",
  OPENING: "catalog",
  ADJUSTMENT: "catalog",
};

export function permissionForInventoryDocument(
  kind: InventoryPermissionKind,
  action: InventoryPermissionAction
): PermissionCode {
  const prefix = DOCUMENT_PERMISSION_PREFIX[kind];
  if (prefix === "catalog") return "catalog.manage";
  return `${prefix}.${action}` as PermissionCode;
}
