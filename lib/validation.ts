import { z } from "zod";

export const OUT_REASONS = [
  { value: "PROJECT", label: "Xuất cho công trình" },
  { value: "DAMAGED", label: "Hỏng / vỡ" },
  { value: "EXPIRED", label: "Hết hạn / không dùng được" },
  { value: "NATURAL_LOSS", label: "Hao hụt tự nhiên" },
] as const;

export const REASON_LABELS: Record<string, string> = {
  PURCHASE: "Nhập mua",
  PROJECT: "Xuất công trình",
  DAMAGED: "Hỏng / vỡ",
  EXPIRED: "Hết hạn",
  NATURAL_LOSS: "Hao hụt tự nhiên",
  STOCKTAKE_ADJUST: "Điều chỉnh kiểm kê",
  TRANSFER_OUT: "Chuyển kho (đi)",
  TRANSFER_IN: "Chuyển kho (đến)",
  VOID: "Hủy chứng từ",
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
  minStock: z.coerce.number().min(0, "Mức tối thiểu không được âm"),
});

export const warehouseSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên kho"),
  code: z.string().min(1, "Vui lòng nhập mã kho").regex(/^[A-Za-z0-9-]+$/, "Mã kho chỉ gồm chữ, số, gạch ngang"),
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

export const voidSchema = z.object({
  movementId: z.string().optional(),
  stocktakeId: z.string().optional(),
  reason: z.string().min(1, "Vui lòng nhập lý do hủy"),
});

export type ImportInput = z.infer<typeof importSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type VoidInput = z.infer<typeof voidSchema>;
