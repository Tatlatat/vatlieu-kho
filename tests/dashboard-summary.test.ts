import assert from "node:assert/strict";
import { buildDashboardSummary } from "../lib/queries/reports";

const summary = buildDashboardSummary({
  stockRows: [
    { status: "OK" },
    { status: "LOW" },
    { status: "OUT" },
    { status: "LOW" },
  ],
  lossRows: [
    { month: "2026-06", total_qty: 3 },
    { month: "2026-06", total_qty: 2 },
    { month: "2026-05", total_qty: 10 },
  ],
  monthKey: "2026-06",
});

assert.deepEqual(summary, {
  totalMaterials: 4,
  lowCount: 2,
  outCount: 1,
  lossThisMonth: 5,
});

console.log("dashboard-summary tests passed");
