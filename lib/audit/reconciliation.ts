export interface AuditMovement {
  materialId: string;
  warehouseId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  supersededAt?: Date | null;
  voidedAt?: Date | null;
}

export interface InventoryBalance {
  materialId: string;
  warehouseId: string;
  onHand: number;
}

export interface FundBalanceEntry {
  kind: "RECEIPT" | "PAYMENT";
  amount: number;
  status: "DRAFT" | "POSTED" | "VOIDED";
}

function isEffectiveMovement(movement: AuditMovement): boolean {
  return movement.reason !== "VOID" && !movement.supersededAt && !movement.voidedAt;
}

export function calculateInventoryBalances(movements: AuditMovement[]): InventoryBalance[] {
  const balances = new Map<string, InventoryBalance>();

  for (const movement of movements) {
    if (!isEffectiveMovement(movement)) continue;

    const key = `${movement.materialId}:${movement.warehouseId}`;
    const existing = balances.get(key) ?? {
      materialId: movement.materialId,
      warehouseId: movement.warehouseId,
      onHand: 0,
    };
    existing.onHand += movement.type === "IN" ? movement.quantity : -movement.quantity;
    balances.set(key, existing);
  }

  return Array.from(balances.values())
    .filter((balance) => balance.onHand !== 0)
    .sort((a, b) => {
      const materialCompare = a.materialId.localeCompare(b.materialId);
      return materialCompare !== 0
        ? materialCompare
        : a.warehouseId.localeCompare(b.warehouseId);
    });
}

export function calculateSignedFundBalance(entries: FundBalanceEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.status !== "POSTED") return total;
    return total + (entry.kind === "RECEIPT" ? entry.amount : -entry.amount);
  }, 0);
}
