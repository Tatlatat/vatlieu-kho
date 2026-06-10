export interface NormWarningLine {
  materialId: string;
  quantity: number;
  projectId?: string | null;
  workItemId?: string | null;
}

export interface PlannedNormUsage {
  projectId: string;
  workItemId: string;
  materialId: string;
  plannedQty: number;
}

export interface NormWarningUsageSnapshot {
  projectId: string;
  projectCode: string;
  projectName: string;
  workItemId: string;
  workItemName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  normQty: number;
  usedQty: number;
}

export interface ProjectNormWarning extends NormWarningUsageSnapshot {
  plannedQty: number;
  totalQty: number;
  overQty: number;
}

function usageKey(workItemId: string, materialId: string): string {
  return `${workItemId}:${materialId}`;
}

export function aggregatePlannedNormUsage(lines: NormWarningLine[]): PlannedNormUsage[] {
  const usageByKey = new Map<string, PlannedNormUsage>();

  for (const line of lines) {
    if (!line.projectId || !line.workItemId) continue;
    const key = usageKey(line.workItemId, line.materialId);
    const existing = usageByKey.get(key);
    if (existing) {
      existing.plannedQty += line.quantity;
      continue;
    }
    usageByKey.set(key, {
      projectId: line.projectId,
      workItemId: line.workItemId,
      materialId: line.materialId,
      plannedQty: line.quantity,
    });
  }

  return Array.from(usageByKey.values()).sort((a, b) => {
    const projectCompare = a.projectId.localeCompare(b.projectId);
    if (projectCompare !== 0) return projectCompare;
    const workItemCompare = a.workItemId.localeCompare(b.workItemId);
    if (workItemCompare !== 0) return workItemCompare;
    return a.materialId.localeCompare(b.materialId);
  });
}

export function calculateProjectNormWarnings(
  plannedUsage: PlannedNormUsage[],
  snapshots: NormWarningUsageSnapshot[]
): ProjectNormWarning[] {
  const snapshotByKey = new Map(snapshots.map((snapshot) => [usageKey(snapshot.workItemId, snapshot.materialId), snapshot]));
  const warnings: ProjectNormWarning[] = [];

  for (const planned of plannedUsage) {
    const snapshot = snapshotByKey.get(usageKey(planned.workItemId, planned.materialId));
    if (!snapshot) continue;
    const totalQty = snapshot.usedQty + planned.plannedQty;
    if (totalQty <= snapshot.normQty) continue;
    warnings.push({
      ...snapshot,
      plannedQty: planned.plannedQty,
      totalQty,
      overQty: totalQty - snapshot.normQty,
    });
  }

  return warnings;
}
