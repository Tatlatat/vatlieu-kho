import assert from "node:assert/strict";
import {
  buildBalanceReportWorkbook,
  buildNormReportWorkbook,
} from "../lib/excel/workbook";

async function main() {
  const { readSheet } = await import("read-excel-file/node");
  {
    const buffer = await buildBalanceReportWorkbook({
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
    const rows = await readSheet(buffer as unknown as Parameters<typeof readSheet>[0]);
    assert.equal(rows[1][3], "XM-PC40");
    assert.equal(rows[1][4], "Xi măng PC40");
    assert.equal(rows[1][11], 13);
  }

  {
    const buffer = await buildNormReportWorkbook({
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
    const rows = await readSheet(buffer as unknown as Parameters<typeof readSheet>[0]);
    assert.equal(rows[1][1], "Công trình A");
    assert.equal(rows[1][3], "THEP-D18");
    assert.equal(rows[1][8], 5);
  }

  console.log("excel-export tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
