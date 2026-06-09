import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { supplierSchema, unitSchema } from "@/lib/validation";
import { validateRequestedTransferApprover } from "@/lib/domain/transfer-approval";
import { buildBalanceReportQuery } from "@/lib/queries/balance";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

function assertContains(haystack: string, needle: string, message: string) {
  assert.ok(haystack.includes(needle), `${message}\nMissing: ${needle}`);
}

{
  const supplier = supplierSchema.parse({ code: " NCC001 ", name: "  Công ty A  " });
  assert.equal(supplier.code, "NCC001", "supplier code must be trimmed before persistence");
}

{
  const unit = unitSchema.parse({ code: " BAO ", name: " bao " });
  assert.deepEqual(
    { code: unit.code, name: unit.name },
    { code: "BAO", name: "bao" },
    "unit code/name must be trimmed before persistence"
  );
}

{
  assert.throws(
    () => validateRequestedTransferApprover({ currentUserId: "u1", requestedApproverId: "u1", requestedApproverRole: "KEEPER" }),
    /không được chọn chính mình/,
    "transfer creator cannot choose self as approver"
  );
  assert.throws(
    () => validateRequestedTransferApprover({ currentUserId: "u1", requestedApproverId: "u2", requestedApproverRole: "MANAGER" }),
    /Thủ kho đích/,
    "requested transfer approver must be a keeper"
  );
  assert.doesNotThrow(() =>
    validateRequestedTransferApprover({ currentUserId: "u1", requestedApproverId: "u2", requestedApproverRole: "KEEPER" })
  );
}

{
  const query = buildBalanceReportQuery("2026-06-01", "2026-06-30").sql;
  assertContains(query, 'LEFT JOIN "Document" d ON d.id = sm."documentId"', "balance report must join documents without dropping legacy movements");
  assertContains(query, 'COALESCE(d."docDate", sm."createdAt")', "balance report period must use document date when available");
}

{
  const projectsQuery = read("lib/queries/projects.ts");
  assertContains(projectsQuery, 'el."voidedAt" IS NULL', "project equipment summary must exclude voided equipment logs");
}

{
  const cashExcelRoute = read("app/api/quy/excel/route.ts");
  assertContains(cashExcelRoute, 'requireAtLeast("MANAGER")', "cash Excel export must require MANAGER+");
}

{
  const transferApprove = read("lib/actions/transfer-approve.ts");
  assertContains(
    transferApprove,
    'user.role !== "ADMIN" && user.role !== "KEEPER"',
    "non-admin transfer approver must still be a KEEPER at approval/rejection time"
  );
}

{
  const openingImportAction = read("lib/actions/opening-import.ts");
  assertContains(openingImportAction, "Không đọc được file nhập tồn đầu kỳ", "opening import action must return a friendly error for unreadable workbooks");
}

{
  const unitMigration = read("prisma/migrations/20260608181000_unit_catalog/migration.sql");
  assertContains(unitMigration, "GROUP BY lower(trim(unit))", "unit migration must group units case-insensitively");
}

{
  const seed = read("prisma/seed.ts");
  assertContains(seed, "manager@vatlieu.vn", "seed must include the MANAGER account shown on the login page and manual checklist");
  assertContains(seed, 'code: "THEP-D10"', "seed must include the material code used by the opening stock template");
  assertContains(seed, 'code: "KG"', "seed must include common unit KG");
  assertContains(seed, 'code: "MD"', "seed must include common unit MD");
  assertContains(seed, "documentEquipmentLine.deleteMany", "seed cleanup must handle document equipment lines before documents");
  assertContains(seed, "documentLine.deleteMany", "seed cleanup must handle document material lines before documents");
  assertContains(seed, "document.deleteMany", "seed cleanup must handle documents before referenced master data");
  assertContains(seed, "equipmentLog.deleteMany", "seed cleanup must handle equipment logs before equipment/projects/users");
  assertContains(seed, "cashEntry.deleteMany", "seed cleanup must handle cash entries before funds/users");
  assertContains(seed, "project.deleteMany", "seed cleanup must handle projects before warehouses");
}

{
  const openingTemplate = read("app/api/ton-dau-ky/template/route.ts");
  assertContains(openingTemplate, "THEP-D10", "opening stock template must use the client-requested sample material code");
}

console.log("Regression checks passed");
