// Kiểu trả về chung cho mọi Server Action (giữ ở đây vì nhiều action import từ đường này).
// Nhập/xuất/chuyển kho nay đi qua phiếu chứng từ (lib/actions/documents.ts,
// transfer-approve.ts) — các hàm createImport/createExport/createTransfer cũ đã bỏ.
export interface ActionResult {
  ok: boolean;
  error?: string;
}
