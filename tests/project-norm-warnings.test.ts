import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { formatNormWarningQuantity } from "../lib/projects/norm-warning-format";
import {
  aggregatePlannedNormUsage,
  calculateProjectNormWarnings,
  getProjectNormWarnings,
  shouldRequireOverNormConfirmation,
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

{
  assert.equal(shouldRequireOverNormConfirmation([], false), false);
  assert.equal(
    shouldRequireOverNormConfirmation(
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
          plannedQty: 10,
          totalQty: 55,
          overQty: 5,
        },
      ],
      false
    ),
    true
  );
  assert.equal(
    shouldRequireOverNormConfirmation(
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
          plannedQty: 10,
          totalQty: 55,
          overQty: 5,
        },
      ],
      true
    ),
    false
  );
}

{
  assert.equal(formatNormWarningQuantity(1234.5, "cây"), "1.234,5 cây");
  assert.equal(formatNormWarningQuantity(3, ""), "3");
}

async function testDatabaseWarningQuery() {
  const suffix = `norm-warning-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${suffix}@example.test`;
  const materialCode = `MAT-${suffix}`;
  const warehouseCode = `WH-${suffix}`;
  const projectCode = `PRJ-${suffix}`;
  const documentCode = `PX-${suffix}`;
  let userId = "";
  let materialId = "";
  let warehouseId = "";
  let projectId = "";
  let workItemId = "";
  let documentId = "";

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "test",
        name: "Norm warning test user",
        role: "OWNER",
      },
    });
    userId = user.id;

    const warehouse = await prisma.warehouse.create({
      data: {
        code: warehouseCode,
        name: "Kho test cảnh báo định mức",
      },
    });
    warehouseId = warehouse.id;

    const material = await prisma.material.create({
      data: {
        code: materialCode,
        name: "Sắt test định mức",
        unit: "cây",
      },
    });
    materialId = material.id;

    const project = await prisma.project.create({
      data: {
        code: projectCode,
        name: "Công trình test định mức",
        warehouseId,
        workItems: {
          create: {
            name: "Móng",
            isDefault: true,
          },
        },
      },
      include: {
        workItems: true,
      },
    });
    projectId = project.id;
    workItemId = project.workItems[0].id;

    await prisma.materialNorm.create({
      data: {
        projectId,
        workItemId,
        materialId,
        normQty: 50,
        createdById: userId,
      },
    });

    const document = await prisma.inventoryDocument.create({
      data: {
        code: documentCode,
        kind: "EXPORT",
        status: "POSTED",
        documentDate: new Date("2026-06-10T00:00:00+07:00"),
        warehouseId,
        reason: "PROJECT",
        createdById: userId,
        postedById: userId,
        postedAt: new Date("2026-06-10T01:00:00+07:00"),
        lines: {
          create: {
            lineNo: 1,
            materialId,
            projectId,
            workItemId,
            quantity: 45,
          },
        },
      },
    });
    documentId = document.id;

    const warnings = await getProjectNormWarnings({
      lines: [{ materialId, quantity: 10, projectId, workItemId }],
    });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].usedQty, 45);
    assert.equal(warnings[0].plannedQty, 10);
    assert.equal(warnings[0].overQty, 5);

    const editWarnings = await getProjectNormWarnings({
      lines: [{ materialId, quantity: 10, projectId, workItemId }],
      excludeDocumentId: documentId,
    });
    assert.deepEqual(editWarnings, []);
  } finally {
    if (documentId) await prisma.inventoryDocument.deleteMany({ where: { id: documentId } });
    if (projectId) await prisma.materialNorm.deleteMany({ where: { projectId } });
    if (projectId) await prisma.projectWorkItem.deleteMany({ where: { projectId } });
    if (projectId) await prisma.fund.deleteMany({ where: { projectId } });
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
    if (materialId) await prisma.material.deleteMany({ where: { id: materialId } });
    if (warehouseId) await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
}

void testDatabaseWarningQuery()
  .then(async () => {
    console.log("project-norm-warnings tests passed");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    throw error;
  });
