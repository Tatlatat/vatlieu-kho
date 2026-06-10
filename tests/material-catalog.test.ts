import assert from "node:assert/strict";
import {
  MATERIAL_KIND_LABELS,
  TRACKING_MODE_LABELS,
  normalizeOptionalMinStock,
  requireCatalogChoice,
  trackingModeForMaterialKind,
} from "../lib/catalogs/material-catalog";
import { warehouseSchema } from "../lib/validation";

assert.equal(normalizeOptionalMinStock(null), 0);
assert.equal(normalizeOptionalMinStock(""), 0);
assert.equal(normalizeOptionalMinStock("12.5"), 12.5);
assert.throws(() => normalizeOptionalMinStock("-1"), /không được âm/);
assert.throws(() => normalizeOptionalMinStock("abc"), /không hợp lệ/);

assert.equal(requireCatalogChoice("unit-1", "đơn vị tính"), "unit-1");
assert.equal(requireCatalogChoice(" unit-1 ", "đơn vị tính"), "unit-1");
assert.throws(() => requireCatalogChoice("", "đơn vị tính"), /Vui lòng chọn đơn vị tính/);

assert.equal(MATERIAL_KIND_LABELS.MATERIAL, "Vật tư");
assert.equal(MATERIAL_KIND_LABELS.VEHICLE, "Xe");
assert.equal(MATERIAL_KIND_LABELS.MACHINE, "Máy");
assert.equal(TRACKING_MODE_LABELS.QUANTITY, "Theo số lượng");
assert.equal(TRACKING_MODE_LABELS.HOURS, "Theo giờ làm");

assert.deepEqual(
  warehouseSchema.parse({ name: "Kho demo", code: "Kho CT A / 01" }),
  { name: "Kho demo", code: "Kho CT A / 01" }
);

assert.equal(trackingModeForMaterialKind("MATERIAL"), "QUANTITY");
assert.equal(trackingModeForMaterialKind("VEHICLE"), "HOURS");
assert.equal(trackingModeForMaterialKind("MACHINE"), "HOURS");

console.log("material-catalog tests passed");
