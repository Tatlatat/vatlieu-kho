import assert from "node:assert/strict";
import { calculateNormVariance } from "../lib/projects/norm-report";

{
  const row = calculateNormVariance({ normQty: 50, actualQty: 45 });
  assert.deepEqual(row, {
    normQty: 50,
    actualQty: 45,
    varianceQty: -5,
    status: "WITHIN",
    statusLabel: "Trong định mức",
  });
}

{
  const row = calculateNormVariance({ normQty: 50, actualQty: 55 });
  assert.deepEqual(row, {
    normQty: 50,
    actualQty: 55,
    varianceQty: 5,
    status: "OVER",
    statusLabel: "Vượt định mức",
  });
}

{
  const row = calculateNormVariance({ normQty: null, actualQty: 12 });
  assert.deepEqual(row, {
    normQty: null,
    actualQty: 12,
    varianceQty: null,
    status: "NO_NORM",
    statusLabel: "Chưa có định mức",
  });
}

console.log("project-norm-report tests passed");
