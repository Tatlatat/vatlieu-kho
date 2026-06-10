import assert from "node:assert/strict";
import { parseDocumentDate, parseDocumentLines } from "../lib/inventory/document-form";

{
  const formData = new FormData();
  formData.set(
    "lines",
    JSON.stringify([
      { materialId: "mat-1", quantity: "2.5", note: "Dòng 1" },
      { materialId: "mat-2", quantity: 3 },
    ])
  );

  assert.deepEqual(parseDocumentLines(formData), [
    { materialId: "mat-1", quantity: 2.5, note: "Dòng 1" },
    { materialId: "mat-2", quantity: 3, note: undefined },
  ]);
}

{
  const formData = new FormData();
  formData.set("materialId", "mat-single");
  formData.set("quantity", "4");
  formData.set("note", "legacy");

  assert.deepEqual(parseDocumentLines(formData), [
    { materialId: "mat-single", quantity: 4, note: "legacy" },
  ]);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ materialId: "", quantity: 1 }]));
  assert.throws(() => parseDocumentLines(formData), /Vui lòng chọn vật tư/);
}

{
  const formData = new FormData();
  formData.set("documentDate", "2026-06-10");
  assert.equal(parseDocumentDate(formData).toISOString(), "2026-06-09T17:00:00.000Z");
}

{
  const fallback = new Date("2026-06-10T03:04:05.000Z");
  const formData = new FormData();
  assert.equal(parseDocumentDate(formData, fallback), fallback);
}

{
  const formData = new FormData();
  formData.set("documentDate", "not-a-date");
  assert.throws(() => parseDocumentDate(formData), /Ngày chứng từ không hợp lệ/);
}

console.log("document-form tests passed");
