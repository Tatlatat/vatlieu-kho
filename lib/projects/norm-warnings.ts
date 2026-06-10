import { prisma } from "@/lib/prisma";

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

export interface GetProjectNormWarningsInput {
  lines: NormWarningLine[];
  excludeDocumentId?: string | null;
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

export async function getProjectNormWarnings({
  lines,
  excludeDocumentId,
}: GetProjectNormWarningsInput): Promise<ProjectNormWarning[]> {
  const plannedUsage = aggregatePlannedNormUsage(lines);
  if (plannedUsage.length === 0) return [];

  const projectIds = Array.from(new Set(plannedUsage.map((usage) => usage.projectId)));
  const workItemIds = Array.from(new Set(plannedUsage.map((usage) => usage.workItemId)));
  const materialIds = Array.from(new Set(plannedUsage.map((usage) => usage.materialId)));

  const [norms, actualGroups] = await Promise.all([
    prisma.materialNorm.findMany({
      where: {
        projectId: { in: projectIds },
        workItemId: { in: workItemIds },
        materialId: { in: materialIds },
      },
      include: {
        project: { select: { code: true, name: true } },
        workItem: { select: { name: true } },
        material: { select: { code: true, name: true, unit: true } },
      },
    }),
    prisma.inventoryDocumentLine.groupBy({
      by: ["workItemId", "materialId"],
      where: {
        projectId: { in: projectIds },
        workItemId: { in: workItemIds },
        materialId: { in: materialIds },
        documentId: excludeDocumentId ? { not: excludeDocumentId } : undefined,
        document: {
          kind: "EXPORT",
          status: "POSTED",
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  const actualByKey = new Map(
    actualGroups
      .filter((group) => group.workItemId)
      .map((group) => [usageKey(group.workItemId as string, group.materialId), Number(group._sum.quantity ?? 0)])
  );

  const snapshots: NormWarningUsageSnapshot[] = norms.map((norm) => ({
    projectId: norm.projectId,
    projectCode: norm.project.code,
    projectName: norm.project.name,
    workItemId: norm.workItemId,
    workItemName: norm.workItem.name,
    materialId: norm.materialId,
    materialCode: norm.material.code,
    materialName: norm.material.name,
    materialUnit: norm.material.unit,
    normQty: norm.normQty,
    usedQty: actualByKey.get(usageKey(norm.workItemId, norm.materialId)) ?? 0,
  }));

  return calculateProjectNormWarnings(plannedUsage, snapshots).sort((a, b) => {
    const projectCompare = a.projectName.localeCompare(b.projectName);
    if (projectCompare !== 0) return projectCompare;
    const workItemCompare = a.workItemName.localeCompare(b.workItemName);
    if (workItemCompare !== 0) return workItemCompare;
    return a.materialName.localeCompare(b.materialName);
  });
}
