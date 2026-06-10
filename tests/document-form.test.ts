import assert from "node:assert/strict";
import { parseDocumentLines } from "../lib/inventory/document-form";

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

console.log("document-form tests passed");
