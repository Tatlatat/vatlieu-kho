import assert from "node:assert/strict";
import {
  MATERIAL_KIND_LABELS,
  TRACKING_MODE_LABELS,
  normalizeOptionalMinStock,
  requireCatalogChoice,
} from "../lib/catalogs/material-catalog";

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

console.log("material-catalog tests passed");
