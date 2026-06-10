export const MATERIAL_KIND_VALUES = ["MATERIAL", "VEHICLE", "MACHINE"] as const;
export const TRACKING_MODE_VALUES = ["QUANTITY", "HOURS"] as const;

export type MaterialKindValue = (typeof MATERIAL_KIND_VALUES)[number];
export type TrackingModeValue = (typeof TRACKING_MODE_VALUES)[number];

export const MATERIAL_KIND_LABELS: Record<MaterialKindValue, string> = {
  MATERIAL: "Vật tư",
  VEHICLE: "Xe",
  MACHINE: "Máy",
};

export const TRACKING_MODE_LABELS: Record<TrackingModeValue, string> = {
  QUANTITY: "Theo số lượng",
  HOURS: "Theo giờ làm",
};

export function trackingModeForMaterialKind(kind: MaterialKindValue): TrackingModeValue {
  return kind === "VEHICLE" || kind === "MACHINE" ? "HOURS" : "QUANTITY";
}

export function normalizeOptionalMinStock(value: FormDataEntryValue | null): number {
  if (value == null || value === "") return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Định mức tồn kho tối thiểu không hợp lệ");
  }
  if (parsed < 0) {
    throw new Error("Định mức tồn kho tối thiểu không được âm");
  }

  return parsed;
}

export function requireCatalogChoice(value: FormDataEntryValue | null, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`Vui lòng chọn ${label}`);
  return text;
}
