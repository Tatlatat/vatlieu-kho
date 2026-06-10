import assert from "node:assert/strict";
import { parsePermissionUpdateForm } from "../lib/permissions/forms";

const formData = new FormData();
formData.set("targetUserId", "user-1");
formData.append("positionCodes", "THU_KHO");
formData.append("positionCodes", "INVALID");
formData.append("allowCodes", "fund.view");
formData.append("allowCodes", "fund.view");
formData.append("allowCodes", "unknown.permission");
formData.append("denyCodes", "inventory.export.create");

assert.deepEqual(parsePermissionUpdateForm(formData), {
  targetUserId: "user-1",
  positionCodes: ["THU_KHO"],
  allowCodes: ["fund.view"],
  denyCodes: ["inventory.export.create"],
});

const missingUser = new FormData();
assert.throws(() => parsePermissionUpdateForm(missingUser), /Thiếu người dùng/);

console.log("permission-form tests passed");
