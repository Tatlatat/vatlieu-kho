import type { MovementTypeValue } from "@/lib/inventory/posting";

export interface RevisionMovement {
  id?: string;
  materialId: string;
  warehouseId: string;
  type: MovementTypeValue;
  quantity: number;
}

export interface RevisionSlotDelta {
  materialId: string;
  warehouseId: string;
  delta: number;
}

export interface RevisionStockCheck {
  materialId: string;
  warehouseId: string;
  requiredAvailable: number;
}

export function movementSignedQuantity(movement: RevisionMovement): number {
  return movement.type === "IN" ? movement.quantity : -movement.quantity;
}

export function buildRevisionSlotDeltas(
  currentMovements: RevisionMovement[],
  nextMovements: RevisionMovement[]
): RevisionSlotDelta[] {
  const deltas = new Map<string, RevisionSlotDelta>();

  function add(movement: RevisionMovement, signedDelta: number) {
    const key = `${movement.materialId}:${movement.warehouseId}`;
    const existing = deltas.get(key);
    if (existing) {
      existing.delta += signedDelta;
      return;
    }
    deltas.set(key, {
      materialId: movement.materialId,
      warehouseId: movement.warehouseId,
      delta: signedDelta,
    });
  }

  for (const movement of currentMovements) {
    add(movement, -movementSignedQuantity(movement));
  }
  for (const movement of nextMovements) {
    add(movement, movementSignedQuantity(movement));
  }

  return Array.from(deltas.values())
    .filter((slot) => slot.delta !== 0)
    .sort((a, b) => {
      const materialCompare = a.materialId.localeCompare(b.materialId);
      return materialCompare !== 0
        ? materialCompare
        : a.warehouseId.localeCompare(b.warehouseId);
    });
}

export function stockChecksForNegativeDeltas(
  deltas: RevisionSlotDelta[]
): RevisionStockCheck[] {
  return deltas
    .filter((slot) => slot.delta < 0)
    .map((slot) => ({
      materialId: slot.materialId,
      warehouseId: slot.warehouseId,
      requiredAvailable: Math.abs(slot.delta),
    }));
}
