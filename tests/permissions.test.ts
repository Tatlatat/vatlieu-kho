import assert from "node:assert/strict";
import { PERMISSION_DEFINITIONS, POSITION_PRESETS } from "../lib/permissions/catalog";
import {
  calculateEffectivePermissionCodes,
  canAccessPermission,
  normalizePermissionCodes,
} from "../lib/permissions/effective";
import { permissionForInventoryDocument } from "../lib/permissions/inventory-permissions";

assert.ok(PERMISSION_DEFINITIONS.some((permission) => permission.code === "permission.manage"));
assert.ok(PERMISSION_DEFINITIONS.some((permission) => permission.code === "inventory.opening.import"));
assert.ok(PERMISSION_DEFINITIONS.some((permission) => permission.code === "period.lock.manage"));
assert.ok(POSITION_PRESETS.THU_KHO.permissionCodes.includes("inventory.import.create"));
assert.equal(POSITION_PRESETS.THU_KHO.permissionCodes.includes("inventory.opening.import"), false);
assert.equal(POSITION_PRESETS.THU_KHO.permissionCodes.includes("permission.manage"), false);
assert.equal(POSITION_PRESETS.QUAN_LY.permissionCodes.includes("period.lock.manage"), true);
assert.equal(POSITION_PRESETS.THU_KHO.permissionCodes.includes("period.lock.manage"), false);

assert.deepEqual(
  calculateEffectivePermissionCodes({
    isOwner: false,
    positionPermissionCodes: ["inventory.import.create", "inventory.export.create"],
    allowOverrideCodes: ["fund.view"],
    denyOverrideCodes: ["inventory.export.create"],
  }),
  ["fund.view", "inventory.import.create"]
);

assert.deepEqual(
  normalizePermissionCodes(["catalog.view", "unknown.permission", "catalog.view", "inventory.import.create"]),
  ["catalog.view", "inventory.import.create"]
);

assert.equal(canAccessPermission({ isOwner: true, effectivePermissionCodes: [] }, "permission.manage"), true);
assert.equal(canAccessPermission({ isOwner: true, effectivePermissionCodes: [] }, "unknown.permission"), false);
assert.equal(
  canAccessPermission({ isOwner: false, effectivePermissionCodes: ["catalog.view"] }, "catalog.view"),
  true
);
assert.equal(
  canAccessPermission({ isOwner: false, effectivePermissionCodes: ["catalog.view"] }, "catalog.manage"),
  false
);

assert.equal(permissionForInventoryDocument("IMPORT", "create"), "inventory.import.create");
assert.equal(permissionForInventoryDocument("EXPORT", "edit_posted"), "inventory.export.edit_posted");
assert.equal(permissionForInventoryDocument("TRANSFER", "void"), "inventory.transfer.void");
assert.equal(permissionForInventoryDocument("OPENING", "view"), "inventory.report.view");
assert.equal(permissionForInventoryDocument("OPENING", "void"), "inventory.opening.import");

console.log("permissions tests passed");
