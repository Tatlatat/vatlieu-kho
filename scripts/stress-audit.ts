import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, type Role } from "@prisma/client";
import { getBalanceReport } from "@/lib/queries/balance";
import { getCashReport, getFundBalances, getProjectCashSummary } from "@/lib/queries/cash";
import { getProjectSummary } from "@/lib/queries/projects";
import { validateRequestedTransferApprover } from "@/lib/domain/transfer-approval";

const prisma = new PrismaClient();
const runCode = `STRESS_AUDIT_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const id = (name: string) => `${runCode}_${name}`;

type UserSeed = { id: string; role: Role; email: string; name: string };

const users: UserSeed[] = [
  { id: id("user_admin"), role: "ADMIN", email: `${runCode.toLowerCase()}_admin@example.test`, name: `${runCode} Admin` },
  { id: id("user_manager"), role: "MANAGER", email: `${runCode.toLowerCase()}_manager@example.test`, name: `${runCode} Manager` },
  { id: id("user_keeper_a"), role: "KEEPER", email: `${runCode.toLowerCase()}_keeper_a@example.test`, name: `${runCode} Keeper A` },
  { id: id("user_keeper_b"), role: "KEEPER", email: `${runCode.toLowerCase()}_keeper_b@example.test`, name: `${runCode} Keeper B` },
];

const ids = {
  project: id("project"),
  unit: id("unit"),
  whA: id("warehouse_a"),
  whB: id("warehouse_b"),
  matMain: id("material_main"),
  matDate: id("material_date"),
  fund: id("fund"),
  equipment: id("equipment"),
};

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const n = (value: unknown) => Number(value ?? 0);

function invariant(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
}

async function cleanup() {
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({
      where: {
        OR: [
          { materialId: { in: [ids.matMain, ids.matDate] } },
          { documentId: { startsWith: runCode } },
          { transferId: { startsWith: runCode } },
          { createdById: { in: users.map((u) => u.id) } },
        ],
      },
    });
    await tx.equipmentLog.deleteMany({
      where: {
        OR: [
          { equipmentId: ids.equipment },
          { projectId: ids.project },
          { documentId: { startsWith: runCode } },
          { createdById: { in: users.map((u) => u.id) } },
        ],
      },
    });
    await tx.documentEquipmentLine.deleteMany({ where: { documentId: { startsWith: runCode } } });
    await tx.documentLine.deleteMany({ where: { documentId: { startsWith: runCode } } });
    await tx.document.deleteMany({ where: { id: { startsWith: runCode } } });
    await tx.cashEntry.deleteMany({ where: { fundId: ids.fund } });
    await tx.fund.deleteMany({ where: { id: ids.fund } });
    await tx.equipment.deleteMany({ where: { id: ids.equipment } });
    await tx.material.deleteMany({ where: { id: { in: [ids.matMain, ids.matDate] } } });
    await tx.warehouse.deleteMany({ where: { id: { in: [ids.whA, ids.whB] } } });
    await tx.unit.deleteMany({ where: { id: ids.unit } });
    await tx.project.deleteMany({ where: { id: ids.project } });
    await tx.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  });
}

async function seedReferenceData() {
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await tx.user.create({ data: { ...user, passwordHash: "stress-audit-not-for-login" } });
    }
    await tx.project.create({
      data: { id: ids.project, code: runCode, name: `${runCode} Project`, note: "Stress audit isolated project" },
    });
    await tx.unit.create({ data: { id: ids.unit, code: `${runCode}_UNIT`, name: "stress-unit" } });
    await tx.warehouse.create({
      data: { id: ids.whA, code: `${runCode}_WHA`, name: `${runCode} Warehouse A`, projectId: ids.project },
    });
    await tx.warehouse.create({
      data: { id: ids.whB, code: `${runCode}_WHB`, name: `${runCode} Warehouse B`, projectId: ids.project },
    });
    await tx.material.create({
      data: { id: ids.matMain, code: `${runCode}_MAT`, name: `${runCode} Material`, unitId: ids.unit, unit: "stress-unit", minStock: 0 },
    });
    await tx.material.create({
      data: { id: ids.matDate, code: `${runCode}_DATE`, name: `${runCode} Date Material`, unitId: ids.unit, unit: "stress-unit", minStock: 0 },
    });
    await tx.fund.create({
      data: { id: ids.fund, code: `${runCode}_FUND`, name: `${runCode} Fund`, projectId: ids.project },
    });
    await tx.equipment.create({
      data: { id: ids.equipment, code: `${runCode}_EQ`, name: `${runCode} Excavator`, type: "audit-machine" },
    });
  });
}

async function createPostedDocument(input: {
  name: string;
  type: "IN" | "OUT" | "TRANSFER";
  docDate: Date;
  warehouseId?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  reason?: string;
  createdById?: string;
}) {
  return prisma.document.create({
    data: {
      id: id(`doc_${input.name}`),
      code: `${runCode}_${input.name}`,
      type: input.type,
      status: "POSTED",
      docDate: input.docDate,
      warehouseId: input.warehouseId ?? null,
      fromWarehouseId: input.fromWarehouseId ?? null,
      toWarehouseId: input.toWarehouseId ?? null,
      reason: input.reason ?? null,
      createdById: input.createdById ?? users[1].id,
      postedAt: new Date(),
    },
  });
}

async function addMovement(input: {
  name: string;
  documentId: string;
  materialId: string;
  warehouseId: string;
  type: "IN" | "OUT";
  reason: "PURCHASE" | "PROJECT" | "DAMAGED" | "EXPIRED" | "NATURAL_LOSS" | "TRANSFER_OUT" | "TRANSFER_IN" | "VOID";
  quantity: number;
  transferId?: string;
  voidedAt?: Date | null;
  voidReversalOf?: string;
}) {
  return prisma.stockMovement.create({
    data: {
      id: id(`move_${input.name}`),
      documentId: input.documentId,
      materialId: input.materialId,
      warehouseId: input.warehouseId,
      type: input.type,
      reason: input.reason,
      quantity: input.quantity,
      transferId: input.transferId,
      voidedAt: input.voidedAt,
      voidReversalOf: input.voidReversalOf,
      createdById: users[1].id,
    },
  });
}

async function seedLedgerPressure() {
  const opening = await createPostedDocument({ name: "opening", type: "IN", docDate: d("2026-06-01"), warehouseId: ids.whA, reason: "Tồn đầu kỳ" });
  await prisma.documentLine.create({ data: { id: id("line_opening"), documentId: opening.id, materialId: ids.matMain, quantity: 100 } });
  await addMovement({ name: "opening", documentId: opening.id, materialId: ids.matMain, warehouseId: ids.whA, type: "IN", reason: "PURCHASE", quantity: 100 });

  const bulkMovements: Prisma.StockMovementCreateManyInput[] = [];
  for (let i = 0; i < 30; i += 1) {
    bulkMovements.push({
      id: id(`move_bulk_in_${i}`),
      documentId: opening.id,
      materialId: ids.matMain,
      warehouseId: ids.whA,
      type: "IN",
      reason: "PURCHASE",
      quantity: 1,
      createdById: users[1].id,
    });
    bulkMovements.push({
      id: id(`move_bulk_out_${i}`),
      documentId: opening.id,
      materialId: ids.matMain,
      warehouseId: ids.whA,
      type: "OUT",
      reason: "PROJECT",
      quantity: 0.5,
      createdById: users[1].id,
    });
  }
  await prisma.stockMovement.createMany({ data: bulkMovements });

  const issue = await createPostedDocument({ name: "issue", type: "OUT", docDate: d("2026-06-02"), warehouseId: ids.whA, reason: "PROJECT" });
  await addMovement({ name: "issue", documentId: issue.id, materialId: ids.matMain, warehouseId: ids.whA, type: "OUT", reason: "PROJECT", quantity: 15 });

  const transfer = await createPostedDocument({
    name: "transfer",
    type: "TRANSFER",
    docDate: d("2026-06-03"),
    fromWarehouseId: ids.whA,
    toWarehouseId: ids.whB,
    reason: "REBALANCE",
    createdById: users[2].id,
  });
  const transferId = `${runCode}_transfer_pair`;
  await addMovement({ name: "transfer_out", documentId: transfer.id, materialId: ids.matMain, warehouseId: ids.whA, type: "OUT", reason: "TRANSFER_OUT", quantity: 20, transferId });
  await addMovement({ name: "transfer_in", documentId: transfer.id, materialId: ids.matMain, warehouseId: ids.whB, type: "IN", reason: "TRANSFER_IN", quantity: 20, transferId });

  const loss = await createPostedDocument({ name: "loss", type: "OUT", docDate: d("2026-06-04"), warehouseId: ids.whA, reason: "DAMAGED" });
  await addMovement({ name: "loss", documentId: loss.id, materialId: ids.matMain, warehouseId: ids.whA, type: "OUT", reason: "DAMAGED", quantity: 3 });

  const voided = await createPostedDocument({ name: "voided_in", type: "IN", docDate: d("2026-06-05"), warehouseId: ids.whA, reason: "PURCHASE" });
  const voidedOriginal = await addMovement({
    name: "voided_original",
    documentId: voided.id,
    materialId: ids.matMain,
    warehouseId: ids.whA,
    type: "IN",
    reason: "PURCHASE",
    quantity: 10,
    voidedAt: new Date(),
  });
  await addMovement({
    name: "void_reversal",
    documentId: voided.id,
    materialId: ids.matMain,
    warehouseId: ids.whA,
    type: "OUT",
    reason: "VOID",
    quantity: 10,
    voidReversalOf: voidedOriginal.id,
  });
  await prisma.document.update({ where: { id: voided.id }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: users[1].id } });

  const dateDoc = await createPostedDocument({ name: "date_audit", type: "IN", docDate: d("2026-06-03"), warehouseId: ids.whA, reason: "PURCHASE" });
  await prisma.documentLine.create({ data: { id: id("line_date_audit"), documentId: dateDoc.id, materialId: ids.matDate, quantity: 7 } });
  await prisma.stockMovement.create({
    data: {
      id: id("move_date_audit"),
      documentId: dateDoc.id,
      materialId: ids.matDate,
      warehouseId: ids.whA,
      type: "IN",
      reason: "PURCHASE",
      quantity: 7,
      createdById: users[1].id,
      createdAt: d("2026-06-08"),
    },
  });
}

async function seedCashAndEquipmentPressure() {
  const cashRows: Prisma.CashEntryCreateManyInput[] = [
    { id: id("cash_thu_main"), fundId: ids.fund, type: "THU", category: "CAPITAL", amount: new Prisma.Decimal(1_000_000), entryDate: d("2026-06-01"), createdById: users[1].id },
    { id: id("cash_chi_main"), fundId: ids.fund, type: "CHI", category: "BUY_MATERIAL", amount: new Prisma.Decimal(250_000), entryDate: d("2026-06-02"), createdById: users[1].id },
    { id: id("cash_voided_chi"), fundId: ids.fund, type: "CHI", category: "OTHER_OUT", amount: new Prisma.Decimal(99_999), entryDate: d("2026-06-02"), createdById: users[1].id, voidedAt: new Date(), voidedById: users[0].id, voidReason: "stress audit void" },
  ];
  for (let i = 0; i < 40; i += 1) {
    cashRows.push({
      id: id(`cash_micro_thu_${i}`),
      fundId: ids.fund,
      type: "THU",
      category: "OTHER_IN",
      amount: new Prisma.Decimal(1_000),
      entryDate: d("2026-06-03"),
      createdById: users[1].id,
    });
    cashRows.push({
      id: id(`cash_micro_chi_${i}`),
      fundId: ids.fund,
      type: "CHI",
      category: "OTHER_OUT",
      amount: new Prisma.Decimal(250),
      entryDate: d("2026-06-04"),
      createdById: users[1].id,
    });
  }
  await prisma.cashEntry.createMany({ data: cashRows });

  const equipmentDoc = await createPostedDocument({ name: "equipment_doc", type: "IN", docDate: d("2026-06-04"), warehouseId: ids.whA, reason: "PURCHASE" });
  const equipmentLine = await prisma.documentEquipmentLine.create({
    data: { id: id("equipment_line"), documentId: equipmentDoc.id, equipmentId: ids.equipment, projectId: ids.project, hours: 4.5 },
  });
  await prisma.equipmentLog.create({
    data: {
      id: id("equipment_log_active"),
      equipmentId: ids.equipment,
      projectId: ids.project,
      documentId: equipmentDoc.id,
      documentEquipmentLineId: equipmentLine.id,
      logDate: d("2026-06-04"),
      hours: 4.5,
      createdById: users[1].id,
    },
  });
  await prisma.equipmentLog.create({
    data: {
      id: id("equipment_log_voided"),
      equipmentId: ids.equipment,
      projectId: ids.project,
      logDate: d("2026-06-04"),
      hours: 2,
      createdById: users[1].id,
      voidedAt: new Date(),
      voidedById: users[0].id,
      voidReason: "stress audit void",
    },
  });
}

async function assertStockInvariants() {
  const expected = new Map<string, number>();
  const movements = await prisma.stockMovement.findMany({
    where: { materialId: { in: [ids.matMain, ids.matDate] }, voidedAt: null, reason: { not: "VOID" } },
    select: { materialId: true, warehouseId: true, type: true, quantity: true },
  });
  for (const movement of movements) {
    const key = `${movement.materialId}:${movement.warehouseId}`;
    expected.set(key, (expected.get(key) ?? 0) + (movement.type === "IN" ? movement.quantity : -movement.quantity));
  }

  const stockRows = await prisma.$queryRaw<{ material_id: string; warehouse_id: string; on_hand: number }[]>`
    SELECT material_id, warehouse_id, on_hand::float8 AS on_hand
    FROM current_stock
    WHERE material_id IN (${ids.matMain}, ${ids.matDate})
      AND warehouse_id IN (${ids.whA}, ${ids.whB})
  `;
  for (const row of stockRows) {
    const key = `${row.material_id}:${row.warehouse_id}`;
    assert.equal(n(row.on_hand), expected.get(key) ?? 0, `current_stock mismatch for ${key}`);
    invariant(n(row.on_hand) >= 0, `negative stock leaked for ${key}: ${row.on_hand}`);
  }

  const transferRows = await prisma.stockMovement.groupBy({
    by: ["transferId", "type"],
    where: { transferId: { startsWith: runCode }, voidedAt: null, reason: { not: "VOID" } },
    _sum: { quantity: true },
  });
  const transferOut = transferRows.find((r) => r.type === "OUT")?._sum.quantity ?? 0;
  const transferIn = transferRows.find((r) => r.type === "IN")?._sum.quantity ?? 0;
  assert.equal(transferIn, transferOut, "transfer pair is not quantity-balanced");
}

async function assertReportInvariants() {
  const balanceRows = await getBalanceReport("2026-06-02", "2026-06-04", ids.whA);
  const dateAuditRow = balanceRows.find((row) => row.code === `${runCode}_DATE`);
  invariant(dateAuditRow, "date-audit movement missing from balance report period");
  assert.equal(dateAuditRow.in_qty, 7, "balance report did not classify movement by document date");

  const projectSummary = await getProjectSummary(ids.project);
  invariant(projectSummary, "project summary missing test project");
  const equipmentHours = projectSummary.equipment.find((row) => row.equipmentName === `${runCode} Excavator`)?.totalHours ?? 0;
  assert.equal(equipmentHours, 4.5, "project equipment summary counted voided equipment hours");

  const projectStockMain = projectSummary.stock.find((row) => row.materialName === `${runCode} Material`);
  invariant(projectStockMain, "project stock summary missing main material");
  assert.equal(projectStockMain.balance, 97, "project stock summary balance mismatch across project warehouses");
}

async function assertCashInvariants() {
  const balances = await getFundBalances(ids.fund);
  assert.equal(balances.length, 1, "fund balance row missing");
  assert.equal(balances[0].balance, 780_000, "fund balance did not exclude voided cash entry or micro rows");

  const report = await getCashReport(ids.fund, "2026-06-01", "2026-06-08");
  assert.equal(report.totalIn, 1_040_000, "cash report total THU mismatch");
  assert.equal(report.totalOut, 260_000, "cash report total CHI mismatch");
  assert.equal(report.balance, 780_000, "cash report balance mismatch");

  const projectSummary = await getProjectCashSummary("2026-06-01", "2026-06-08");
  const row = projectSummary.find((item) => item.project_id === ids.project);
  invariant(row, "project cash summary missing test project");
  assert.equal(row.balance, 780_000, "project cash summary balance mismatch");
}

function assertTransferApprovalDomain() {
  assert.throws(
    () => validateRequestedTransferApprover({ currentUserId: users[2].id, requestedApproverId: users[2].id, requestedApproverRole: "KEEPER" }),
    /không được chọn chính mình/,
    "transfer approval domain failed to reject self-approval"
  );
  assert.throws(
    () => validateRequestedTransferApprover({ currentUserId: users[2].id, requestedApproverId: users[1].id, requestedApproverRole: "MANAGER" }),
    /Thủ kho đích/,
    "transfer approval domain failed to reject non-keeper approver"
  );
  assert.doesNotThrow(
    () => validateRequestedTransferApprover({ currentUserId: users[2].id, requestedApproverId: users[3].id, requestedApproverRole: "KEEPER" }),
    "transfer approval domain rejected valid keeper approver"
  );
}

async function run() {
  console.log(`Stress audit run: ${runCode}`);
  await cleanup();
  await seedReferenceData();
  await seedLedgerPressure();
  await seedCashAndEquipmentPressure();
  await assertStockInvariants();
  await assertReportInvariants();
  await assertCashInvariants();
  assertTransferApprovalDomain();
  console.log("Stress audit checks passed");
}

run()
  .catch((error) => {
    console.error("Stress audit failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.KEEP_STRESS_AUDIT_DATA === "1") {
      console.log(`Keeping stress audit data with prefix ${runCode}`);
    } else {
      await cleanup();
      console.log(`Cleaned stress audit data with prefix ${runCode}`);
    }
    await prisma.$disconnect();
  });
