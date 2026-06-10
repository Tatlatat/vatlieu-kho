export const TRANSFER_REASONS = [
  { value: "INTERNAL_MOVE", label: "Chuyển giữa kho" },
  { value: "BORROW", label: "Xuất mượn" },
  { value: "DIRECT_PROJECT", label: "Xuất thẳng cho CT" },
  { value: "RETURN", label: "Hoàn trả" },
  { value: "OTHER", label: "Khác" },
] as const;

export type TransferReasonValue = (typeof TRANSFER_REASONS)[number]["value"];

const TRANSFER_REASON_LABELS = new Map<string, string>(
  TRANSFER_REASONS.map((reason) => [reason.value, reason.label])
);

export function isTransferReasonValue(value: string): value is TransferReasonValue {
  return TRANSFER_REASON_LABELS.has(value);
}

export function transferReasonLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return TRANSFER_REASON_LABELS.get(value) ?? value;
}

export function normalizeTransferReason(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text) return "INTERNAL_MOVE";
  if (text.length > 120) throw new Error("Lý do chuyển kho không được quá 120 ký tự");
  return text;
}
