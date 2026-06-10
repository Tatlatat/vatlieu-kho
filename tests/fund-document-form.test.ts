import assert from "node:assert/strict";
import { parseFundDocumentDate, parseFundDocumentLines } from "../lib/funds/document-form";

{
  const formData = new FormData();
  formData.set(
    "lines",
    JSON.stringify([
      {
        amount: "1500000",
        category: "Tạm ứng",
        description: "Nhận tạm ứng công trình A",
        note: "Đợt 1",
      },
      {
        amount: 250000,
        category: "Vật tư phụ",
        description: "Chi mua phụ kiện nhỏ",
      },
    ])
  );

  assert.deepEqual(parseFundDocumentLines(formData), [
    {
      amount: 1500000,
      category: "Tạm ứng",
      description: "Nhận tạm ứng công trình A",
      note: "Đợt 1",
    },
    {
      amount: 250000,
      category: "Vật tư phụ",
      description: "Chi mua phụ kiện nhỏ",
      note: undefined,
    },
  ]);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ amount: 0, category: "Thu", description: "Không hợp lệ" }]));
  assert.throws(() => parseFundDocumentLines(formData), /Số tiền phải lớn hơn 0/);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ amount: -1, category: "Thu", description: "Không hợp lệ" }]));
  assert.throws(() => parseFundDocumentLines(formData), /Số tiền phải lớn hơn 0/);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ amount: 1000, category: "", description: "Thiếu nhóm" }]));
  assert.throws(() => parseFundDocumentLines(formData), /Vui lòng nhập nhóm thu chi/);
}

{
  const formData = new FormData();
  formData.set("lines", JSON.stringify([{ amount: 1000, category: "Thu", description: "" }]));
  assert.throws(() => parseFundDocumentLines(formData), /Vui lòng nhập nội dung/);
}

{
  const formData = new FormData();
  formData.set("documentDate", "2026-06-10");
  assert.equal(parseFundDocumentDate(formData).toISOString(), "2026-06-09T17:00:00.000Z");
}

{
  const fallback = new Date("2026-06-10T03:04:05.000Z");
  const formData = new FormData();
  assert.equal(parseFundDocumentDate(formData, fallback), fallback);
}

{
  const formData = new FormData();
  formData.set("documentDate", "10/06/2026");
  assert.throws(() => parseFundDocumentDate(formData), /Ngày chứng từ không hợp lệ/);
}

console.log("fund-document-form tests passed");
