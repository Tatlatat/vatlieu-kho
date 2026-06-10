import assert from "node:assert/strict";
import {
  buildBalanceReportWorkbook,
  buildNormReportWorkbook,
} from "../lib/excel/workbook";

async function main() {
  const XLSX = await import("xlsx");
  {
    const buffer = buildBalanceReportWorkbook({
      from: "2026-06-01",
      to: "2026-06-10",
      warehouseLabel: "Tất cả kho",
      rows: [
        {
          material_id: "mat-1",
          code: "XM-PC40",
          name: "Xi măng PC40",
          unit: "tấn",
          opening: 10,
          in_qty: 5,
          out_qty: 3,
          transfer_in: 2,
          transfer_out: 1,
          closing: 13,
        },
      ],
    });

    assert.ok(buffer.length > 0);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    assert.deepEqual(workbook.SheetNames, ["NXT"]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.NXT, { defval: "" });
    assert.equal(rows[0]["Mã vật tư"], "XM-PC40");
    assert.equal(rows[0]["Tên vật tư"], "Xi măng PC40");
    assert.equal(rows[0]["Tồn cuối"], 13);
  }

  {
    const buffer = buildNormReportWorkbook({
      rows: [
        {
          projectId: "project-1",
          projectCode: "CT-A",
          projectName: "Công trình A",
          workItemId: "work-1",
          workItemName: "Móng",
          materialId: "mat-1",
          materialCode: "THEP-D18",
          materialName: "Thép D18",
          materialUnit: "cây",
          normQty: 50,
          actualQty: 55,
          varianceQty: 5,
          status: "OVER",
          statusLabel: "Vượt định mức",
        },
      ],
    });

    assert.ok(buffer.length > 0);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    assert.deepEqual(workbook.SheetNames, ["Dinh muc"]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Dinh muc"], { defval: "" });
    assert.equal(rows[0]["Công trình"], "Công trình A");
    assert.equal(rows[0]["Mã vật tư"], "THEP-D18");
    assert.equal(rows[0]["Chênh lệch"], 5);
  }

  console.log("excel-export tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
