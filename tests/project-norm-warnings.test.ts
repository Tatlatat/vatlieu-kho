import assert from "node:assert/strict";
import {
  aggregatePlannedNormUsage,
  calculateProjectNormWarnings,
} from "../lib/projects/norm-warnings";

{
  const planned = aggregatePlannedNormUsage([
    { materialId: "mat-1", quantity: 7, projectId: "project-1", workItemId: "work-1" },
    { materialId: "mat-1", quantity: 8, projectId: "project-1", workItemId: "work-1" },
    { materialId: "mat-2", quantity: 3, projectId: "project-1", workItemId: "work-1" },
    { materialId: "mat-3", quantity: 4, projectId: "project-1" },
    { materialId: "mat-4", quantity: 5, workItemId: "work-1" },
  ]);

  assert.deepEqual(planned, [
    { projectId: "project-1", workItemId: "work-1", materialId: "mat-1", plannedQty: 15 },
    { projectId: "project-1", workItemId: "work-1", materialId: "mat-2", plannedQty: 3 },
  ]);
}

{
  const warnings = calculateProjectNormWarnings(
    [{ projectId: "project-1", workItemId: "work-1", materialId: "mat-1", plannedQty: 10 }],
    [
      {
        projectId: "project-1",
        projectCode: "CTA",
        projectName: "Công trình A",
        workItemId: "work-1",
        workItemName: "Móng",
        materialId: "mat-1",
        materialCode: "D18",
        materialName: "Sắt D18",
        materialUnit: "cây",
        normQty: 50,
        usedQty: 35,
      },
    ]
  );

  assert.deepEqual(warnings, []);
}

{
  const warnings = calculateProjectNormWarnings(
    [{ projectId: "project-1", workItemId: "work-1", materialId: "mat-1", plannedQty: 10 }],
    [
      {
        projectId: "project-1",
        projectCode: "CTA",
        projectName: "Công trình A",
        workItemId: "work-1",
        workItemName: "Móng",
        materialId: "mat-1",
        materialCode: "D18",
        materialName: "Sắt D18",
        materialUnit: "cây",
        normQty: 50,
        usedQty: 45,
      },
    ]
  );

  assert.deepEqual(warnings, [
    {
      projectId: "project-1",
      projectCode: "CTA",
      projectName: "Công trình A",
      workItemId: "work-1",
      workItemName: "Móng",
      materialId: "mat-1",
      materialCode: "D18",
      materialName: "Sắt D18",
      materialUnit: "cây",
      normQty: 50,
      usedQty: 45,
      plannedQty: 10,
      totalQty: 55,
      overQty: 5,
    },
  ]);
}

console.log("project-norm-warnings tests passed");
