import { z } from "zod";

export const OUT_REASONS = [
  { value: "PROJECT", label: "Xuất cho công trình" },
  { value: "DAMAGED", label: "Hỏng / vỡ" },
  { value: "EXPIRED", label: "Hết hạn / không dùng được" },
  { value: "NATURAL_LOSS", label: "Hao hụt tự nhiên" },
  { value: "STOCK_SHORTAGE", label: "Kiểm kê thiếu" },
] as const;

// Lý do NHẬP — nhãn linh hoạt lưu ở Document.reason. Bút toán kho luôn IN/PURCHASE,
// KHÔNG ảnh hưởng cách tính tồn/báo cáo. Thêm nhãn mới chỉ cần bổ sung mảng này.
export const IN_REASONS = [
  { value: "PURCHASE", label: "Nhập mua mới" },
  { value: "REUSE", label: "Tái sử dụng" },
  { value: "STOCK_SURPLUS", label: "Kiểm kê thừa" },
  { value: "RETURN", label: "Hoàn trả về kho" },
  { value: "OTHER_IN", label: "Khác" },
] as const;

// Lý do CHUYỂN KHO — nhãn linh hoạt ở Document.reason. Bút toán luôn TRANSFER_OUT/IN.
export const TRANSFER_REASONS = [
  { value: "LEND", label: "Xuất mượn" },
  { value: "TO_SITE", label: "Xuất thẳng cho công trình" },
  { value: "REBALANCE", label: "Điều chuyển cân đối kho" },
  { value: "OTHER_TRANSFER", label: "Khác" },
] as const;

export const REASON_LABELS: Record<string, string> = {
  PURCHASE: "Nhập mua",
  PROJECT: "Xuất công trình",
  DAMAGED: "Hỏng / vỡ",
  EXPIRED: "Hết hạn",
  NATURAL_LOSS: "Hao hụt tự nhiên",
  STOCK_SHORTAGE: "Kiểm kê thiếu",
  STOCKTAKE_ADJUST: "Điều chỉnh kiểm kê",
  TRANSFER_OUT: "Chuyển kho (đi)",
  TRANSFER_IN: "Chuyển kho (đến)",
  VOID: "Hủy chứng từ",
  // Nhãn lý do NHẬP
  REUSE: "Tái sử dụng",
  STOCK_SURPLUS: "Kiểm kê thừa",
  RETURN: "Hoàn trả về kho",
  OTHER_IN: "Nhập khác",
  // Nhãn lý do CHUYỂN
  LEND: "Xuất mượn",
  TO_SITE: "Xuất thẳng cho công trình",
  REBALANCE: "Điều chuyển cân đối kho",
  OTHER_TRANSFER: "Chuyển khác",
};

export const importSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật liệu"),
  warehouseId: z.string().min(1, "Vui lòng chọn kho"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().max(500).optional(),
});

export const exportSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật liệu"),
  warehouseId: z.string().min(1, "Vui lòng chọn kho"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  reason: z.enum(["PROJECT", "DAMAGED", "EXPIRED", "NATURAL_LOSS"]),
  note: z.string().max(500).optional(),
});

export const materialSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên vật liệu"),
  code: z.string().min(1, "Vui lòng nhập mã vật liệu"),
  unit: z.string().min(1, "Vui lòng nhập đơn vị (bao, cây, m³...)"),
  minStock: z.coerce.number().min(0, "Mức tối thiểu không được âm").optional().default(0),
});

export const warehouseSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên kho"),
  code: z.string().min(1, "Vui lòng nhập mã kho"),
  projectId: z.string().optional().nullable(),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên công trình"),
  code: z.string().min(1, "Vui lòng nhập mã công trình"),
  note: z.string().max(500).optional(),
});

export const transferSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  fromWarehouseId: z.string().min(1, "Vui lòng chọn kho nguồn"),
  toWarehouseId: z.string().min(1, "Vui lòng chọn kho đích"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().max(500).optional(),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
  message: "Kho nguồn và kho đích phải khác nhau",
  path: ["toWarehouseId"],
});

export const docLineSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().max(500).optional(),
});

export const docHeaderSchema = z.object({
  type: z.enum(["IN", "OUT", "TRANSFER", "STOCKTAKE"]),
  warehouseId: z.string().optional(),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  supplierId: z.string().optional(),
  reason: z.string().optional(),
  // Ngày chứng từ (YYYY-MM-DD). Tùy chọn — backend mặc định hôm nay nếu trống.
  docDate: z.string().optional(),
  note: z.string().max(500).optional(),
  lines: z.array(docLineSchema).min(1, "Phiếu phải có ít nhất 1 dòng"),
});

export type DocLineInput = z.infer<typeof docLineSchema>;
export type DocHeaderInput = z.infer<typeof docHeaderSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  name: z.string().min(1, "Vui lòng nhập tên"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["ADMIN", "MANAGER", "KEEPER"]),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhà cung cấp"),
  taxCode: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  contact: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

export const equipmentSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(1, "Vui lòng nhập tên xe/máy"),
  type: z.string().max(100).optional(),
  plateNo: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

export const equipmentLogSchema = z.object({
  equipmentId: z.string().min(1, "Vui lòng chọn xe/máy"),
  logDate: z.string().min(1, "Vui lòng chọn ngày"),
  hours: z.coerce.number().positive("Số giờ phải lớn hơn 0"),
  projectId: z.string().optional().nullable(),
  note: z.string().max(500).optional(),
});

// ===== QUỸ (Thu – Chi) =====
// Hạng mục cố định theo loại. Báo cáo nhóm theo category. Dễ thêm: chỉ bổ sung mảng.
export const CASH_IN_CATEGORIES = [
  { value: "CAPITAL", label: "Ứng vốn" },
  { value: "DEBT_COLLECT", label: "Thu nợ / thu hồi" },
  { value: "REFUND_ADVANCE", label: "Hoàn ứng" },
  { value: "OTHER_IN", label: "Khác" },
] as const;
export const CASH_OUT_CATEGORIES = [
  { value: "BUY_MATERIAL", label: "Mua vật tư" },
  { value: "LABOR", label: "Nhân công" },
  { value: "EQUIPMENT", label: "Xe/máy (xăng dầu, sửa chữa)" },
  { value: "MEALS", label: "Ăn uống / sinh hoạt" },
  { value: "ADVANCE", label: "Tạm ứng" },
  { value: "OTHER_OUT", label: "Khác" },
] as const;
export const CASH_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...CASH_IN_CATEGORIES, ...CASH_OUT_CATEGORIES].map((c) => [c.value, c.label])
);
const CASH_IN_VALUES = CASH_IN_CATEGORIES.map((c) => c.value) as string[];
const CASH_OUT_VALUES = CASH_OUT_CATEGORIES.map((c) => c.value) as string[];

export const fundSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên quỹ"),
  code: z.string().min(1, "Vui lòng nhập mã quỹ"),
  note: z.string().max(500).optional(),
  projectId: z.string().optional().nullable(),
});

export const cashEntrySchema = z
  .object({
    fundId: z.string().min(1, "Vui lòng chọn quỹ"),
    type: z.enum(["THU", "CHI"]),
    category: z.string().min(1, "Vui lòng chọn hạng mục"),
    amount: z.coerce.number().positive("Số tiền phải lớn hơn 0").max(999_999_999_999, "Số tiền quá lớn"),
    entryDate: z.string().min(1, "Vui lòng chọn ngày"),
    note: z.string().max(500).optional(),
  })
  // Hạng mục phải khớp loại THU/CHI (tránh ghi nhầm hạng mục chi vào phiếu thu).
  .refine(
    (d) => (d.type === "THU" ? CASH_IN_VALUES : CASH_OUT_VALUES).includes(d.category),
    { message: "Hạng mục không hợp lệ với loại phiếu", path: ["category"] }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type EquipmentLogInput = z.infer<typeof equipmentLogSchema>;

export type ImportInput = z.infer<typeof importSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type FundInput = z.infer<typeof fundSchema>;
export type CashEntryInput = z.infer<typeof cashEntrySchema>;
