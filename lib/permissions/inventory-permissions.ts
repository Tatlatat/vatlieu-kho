import type { PermissionCode } from "@/lib/permissions/catalog";

export type InventoryPermissionKind = "IMPORT" | "EXPORT" | "TRANSFER" | "OPENING" | "ADJUSTMENT";
export type InventoryPermissionAction = "view" | "create" | "edit_posted" | "void";

const DOCUMENT_PERMISSION_PREFIX: Record<Exclude<InventoryPermissionKind, "OPENING" | "ADJUSTMENT">, string> = {
  IMPORT: "inventory.import",
  EXPORT: "inventory.export",
  TRANSFER: "inventory.transfer",
};

export function permissionForInventoryDocument(
  kind: InventoryPermissionKind,
  action: InventoryPermissionAction
): PermissionCode {
  if (kind === "OPENING") {
    return action === "view" ? "inventory.report.view" : "inventory.opening.import";
  }
  if (kind === "ADJUSTMENT") return "catalog.manage";
  const prefix = DOCUMENT_PERMISSION_PREFIX[kind];
  return `${prefix}.${action}` as PermissionCode;
}
