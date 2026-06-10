import assert from "node:assert/strict";
import { parseOpeningBalanceRows } from "../lib/opening/import";

{
  const rows = parseOpeningBalanceRows([
    {
      warehouseCode: "KHO-A",
      materialCode: "XM-PC40",
      quantity: "12.5",
      note: "Tồn demo",
    },
    {
      "Mã kho": "KHO-B",
      "Mã vật tư": "THEP-D18",
      "Số lượng": 20,
      "Ghi chú": "",
    },
  ]);

  assert.deepEqual(rows, [
    {
      rowNumber: 2,
      warehouseCode: "KHO-A",
      materialCode: "XM-PC40",
      quantity: 12.5,
      note: "Tồn demo",
    },
    {
      rowNumber: 3,
      warehouseCode: "KHO-B",
      materialCode: "THEP-D18",
      quantity: 20,
      note: undefined,
    },
  ]);
}

{
  assert.throws(
    () => parseOpeningBalanceRows([{ warehouseCode: "", materialCode: "XM-PC40", quantity: 1 }]),
    /Dòng 2: thiếu mã kho/
  );
}

{
  assert.throws(
    () => parseOpeningBalanceRows([{ warehouseCode: "KHO-A", materialCode: "", quantity: 1 }]),
    /Dòng 2: thiếu mã vật tư/
  );
}

{
  assert.throws(
    () => parseOpeningBalanceRows([{ warehouseCode: "KHO-A", materialCode: "XM-PC40", quantity: 0 }]),
    /Dòng 2: số lượng phải lớn hơn 0/
  );
}

{
  assert.throws(() => parseOpeningBalanceRows([]), /File tồn đầu kỳ không có dòng dữ liệu/);
}

console.log("opening-import tests passed");
