export interface ProjectAssignableLine {
  materialId: string;
  quantity: number;
  note?: string | null;
  projectId?: string | null;
  workItemId?: string | null;
}

export function normalizeLineProjectAssignments<T extends ProjectAssignableLine>(
  lines: T[],
  defaultWorkItemByProjectId: Map<string, string>
): T[] {
  return lines.map((line) => {
    const normalized = { ...line };
    if (!normalized.projectId) {
      delete normalized.projectId;
      delete normalized.workItemId;
      return normalized;
    }

    if (!normalized.workItemId) {
      normalized.workItemId = defaultWorkItemByProjectId.get(normalized.projectId);
    }

    return normalized;
  });
}
