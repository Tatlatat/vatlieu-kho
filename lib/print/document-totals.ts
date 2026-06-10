export function sumInventoryPrintQuantity(lines: Array<{ quantity: number }>): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function sumFundPrintAmount(lines: Array<{ amount: number }>): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}
