import { prisma } from "@/lib/prisma";
import type { ParsedDocumentLine } from "@/lib/inventory/document-form";
import { normalizeLineProjectAssignments, stripLineProjectAssignment } from "@/lib/projects/line-projects";

export async function resolveProjectLineAssignments(
  lines: ParsedDocumentLine[]
): Promise<ParsedDocumentLine[]> {
  const projectIds = Array.from(
    new Set(lines.map((line) => line.projectId).filter((value): value is string => Boolean(value)))
  );
  if (projectIds.length === 0) {
    return lines.map(stripLineProjectAssignment);
  }

  const defaults = await prisma.projectWorkItem.findMany({
    where: { projectId: { in: projectIds }, isDefault: true },
    select: { id: true, projectId: true },
  });
  const defaultByProject = new Map(defaults.map((item) => [item.projectId, item.id]));

  const normalized = normalizeLineProjectAssignments(lines, defaultByProject);
  const selectedWorkItemIds = Array.from(
    new Set(normalized.map((line) => line.workItemId).filter((value): value is string => Boolean(value)))
  );
  const workItems = await prisma.projectWorkItem.findMany({
    where: { id: { in: selectedWorkItemIds } },
    select: { id: true, projectId: true },
  });
  const workItemProjectById = new Map(workItems.map((item) => [item.id, item.projectId]));

  return normalized.map((line) => {
    if (!line.projectId) return line;
    if (!line.workItemId) {
      throw new Error("Công trình chưa có hạng mục mặc định");
    }
    if (workItemProjectById.get(line.workItemId) !== line.projectId) {
      throw new Error("Hạng mục không thuộc công trình đã chọn");
    }
    return line;
  });
}
