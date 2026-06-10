import { prisma } from "@/lib/prisma";
import { calculateNormVariance, type NormVarianceStatus } from "@/lib/projects/norm-report";

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  warehouseId: string | null;
  workItems: Array<{
    id: string;
    name: string;
    isDefault: boolean;
  }>;
}

export interface ProjectManagerData {
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "CLOSED";
    warehouseId: string | null;
    warehouseName: string | null;
    note: string | null;
    workItems: Array<{
      id: string;
      code: string | null;
      name: string;
      isDefault: boolean;
      norms: Array<{
        id: string;
        materialId: string;
        materialName: string;
        materialCode: string;
        materialUnit: string;
        normQty: number;
        note: string | null;
      }>;
    }>;
  }>;
  materials: Array<{
    id: string;
    name: string;
    code: string;
    unit: string;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export interface ProjectNormReportRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  workItemId: string;
  workItemName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  normQty: number | null;
  actualQty: number;
  varianceQty: number | null;
  status: NormVarianceStatus;
  statusLabel: string;
}

export async function getProjectOptions(): Promise<ProjectOption[]> {
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      workItems: { orderBy: [{ isDefault: "desc" }, { name: "asc" }] },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    warehouseId: project.warehouseId,
    workItems: project.workItems.map((item) => ({
      id: item.id,
      name: item.name,
      isDefault: item.isDefault,
    })),
  }));
}

export async function getProjectManagerData(): Promise<ProjectManagerData> {
  const [projects, materials, warehouses] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: {
        warehouse: { select: { name: true } },
        workItems: {
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
          include: {
            norms: {
              orderBy: { material: { name: "asc" } },
              include: {
                material: { select: { name: true, code: true, unit: true } },
              },
            },
          },
        },
      },
    }),
    prisma.material.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, unit: true },
    }),
    prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return {
    projects: projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      warehouseId: project.warehouseId,
      warehouseName: project.warehouse?.name ?? null,
      note: project.note,
      workItems: project.workItems.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        isDefault: item.isDefault,
        norms: item.norms.map((norm) => ({
          id: norm.id,
          materialId: norm.materialId,
          materialName: norm.material.name,
          materialCode: norm.material.code,
          materialUnit: norm.material.unit,
          normQty: norm.normQty,
          note: norm.note,
        })),
      })),
    })),
    materials,
    warehouses,
  };
}

export async function getProjectNormReport(projectId?: string): Promise<ProjectNormReportRow[]> {
  const [norms, actualGroups] = await Promise.all([
    prisma.materialNorm.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { code: true, name: true } },
        workItem: { select: { name: true } },
        material: { select: { code: true, name: true, unit: true } },
      },
    }),
    prisma.inventoryDocumentLine.groupBy({
      by: ["projectId", "workItemId", "materialId"],
      where: {
        projectId: projectId ? projectId : { not: null },
        workItemId: { not: null },
        document: {
          kind: "EXPORT",
          status: "POSTED",
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  const actualKey = (workItemId: string, materialId: string) => `${workItemId}:${materialId}`;
  const actualByKey = new Map<string, number>();
  const projectIds = new Set<string>();
  const workItemIds = new Set<string>();
  const materialIds = new Set<string>();

  for (const group of actualGroups) {
    if (!group.projectId || !group.workItemId) continue;
    projectIds.add(group.projectId);
    workItemIds.add(group.workItemId);
    materialIds.add(group.materialId);
    actualByKey.set(actualKey(group.workItemId, group.materialId), Number(group._sum.quantity ?? 0));
  }

  const rowsByKey = new Map<string, ProjectNormReportRow>();
  for (const norm of norms) {
    const actualQty = actualByKey.get(actualKey(norm.workItemId, norm.materialId)) ?? 0;
    const variance = calculateNormVariance({ normQty: norm.normQty, actualQty });
    rowsByKey.set(actualKey(norm.workItemId, norm.materialId), {
      projectId: norm.projectId,
      projectCode: norm.project.code,
      projectName: norm.project.name,
      workItemId: norm.workItemId,
      workItemName: norm.workItem.name,
      materialId: norm.materialId,
      materialCode: norm.material.code,
      materialName: norm.material.name,
      materialUnit: norm.material.unit,
      ...variance,
    });
  }

  const missingActualGroups = actualGroups.filter((group) => {
    if (!group.workItemId) return false;
    return !rowsByKey.has(actualKey(group.workItemId, group.materialId));
  });

  if (missingActualGroups.length > 0) {
    const [projects, workItems, materials] = await Promise.all([
      prisma.project.findMany({
        where: { id: { in: Array.from(projectIds) } },
        select: { id: true, code: true, name: true },
      }),
      prisma.projectWorkItem.findMany({
        where: { id: { in: Array.from(workItemIds) } },
        select: { id: true, name: true },
      }),
      prisma.material.findMany({
        where: { id: { in: Array.from(materialIds) } },
        select: { id: true, code: true, name: true, unit: true },
      }),
    ]);
    const projectById = new Map(projects.map((item) => [item.id, item]));
    const workItemById = new Map(workItems.map((item) => [item.id, item]));
    const materialById = new Map(materials.map((item) => [item.id, item]));

    for (const group of missingActualGroups) {
      if (!group.projectId || !group.workItemId) continue;
      const project = projectById.get(group.projectId);
      const workItem = workItemById.get(group.workItemId);
      const material = materialById.get(group.materialId);
      if (!project || !workItem || !material) continue;
      const actualQty = Number(group._sum.quantity ?? 0);
      const variance = calculateNormVariance({ normQty: null, actualQty });
      rowsByKey.set(actualKey(group.workItemId, group.materialId), {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        workItemId: workItem.id,
        workItemName: workItem.name,
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        materialUnit: material.unit,
        ...variance,
      });
    }
  }

  return Array.from(rowsByKey.values()).sort((a, b) => {
    const projectCompare = a.projectName.localeCompare(b.projectName);
    if (projectCompare !== 0) return projectCompare;
    const workItemCompare = a.workItemName.localeCompare(b.workItemName);
    if (workItemCompare !== 0) return workItemCompare;
    return a.materialName.localeCompare(b.materialName);
  });
}
