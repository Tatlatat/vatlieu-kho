export function formatNormWarningQuantity(quantity: number, unit: string): string {
  const formatted = quantity.toLocaleString("vi-VN");
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${formatted} ${trimmedUnit}` : formatted;
}
