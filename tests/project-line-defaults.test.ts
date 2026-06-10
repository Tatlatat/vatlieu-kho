import assert from "node:assert/strict";
import { normalizeLineProjectAssignments } from "../lib/projects/line-projects";

{
  const lines = normalizeLineProjectAssignments(
    [
      { materialId: "mat-1", quantity: 10, projectId: "project-1" },
      { materialId: "mat-2", quantity: 5, projectId: "project-1", workItemId: "work-custom" },
      { materialId: "mat-3", quantity: 2, workItemId: "orphan-work" },
    ],
    new Map([["project-1", "work-default"]])
  );

  assert.deepEqual(lines, [
    { materialId: "mat-1", quantity: 10, projectId: "project-1", workItemId: "work-default" },
    { materialId: "mat-2", quantity: 5, projectId: "project-1", workItemId: "work-custom" },
    { materialId: "mat-3", quantity: 2 },
  ]);
}

console.log("project-line-defaults tests passed");
