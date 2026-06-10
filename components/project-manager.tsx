"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createProject,
  createProjectWorkItem,
  updateProject,
  upsertMaterialNorm,
} from "@/lib/actions/projects";
import type { ProjectManagerData } from "@/lib/queries/projects";

type ProjectRow = ProjectManagerData["projects"][number];
type WorkItemRow = ProjectRow["workItems"][number];

interface NormTarget {
  projectId: string;
  workItemId: string;
  workItemName: string;
}

function ProjectForm({
  project,
  warehouses,
  isPending,
  onSubmit,
  onCancel,
}: {
  project?: ProjectRow;
  warehouses: ProjectManagerData["warehouses"];
  isPending: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={project ? "edit-project-code" : "project-code"}>Mã công trình</Label>
          <Input
            id={project ? "edit-project-code" : "project-code"}
            name="code"
            defaultValue={project?.code ?? ""}
            required
            placeholder="VD: CT-A"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={project ? "edit-project-name" : "project-name"}>Tên công trình</Label>
          <Input
            id={project ? "edit-project-name" : "project-name"}
            name="name"
            defaultValue={project?.name ?? ""}
            required
            placeholder="VD: Công trình A"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={project ? "edit-project-warehouse" : "project-warehouse"}>Kho công trình</Label>
          <select
            id={project ? "edit-project-warehouse" : "project-warehouse"}
            name="warehouseId"
            defaultValue={project?.warehouseId ?? ""}
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Chọn kho...</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={project ? "edit-project-status" : "project-status"}>Trạng thái</Label>
          <select
            id={project ? "edit-project-status" : "project-status"}
            name="status"
            defaultValue={project?.status ?? "ACTIVE"}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ACTIVE">Đang thi công</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={project ? "edit-project-note" : "project-note"}>Ghi chú</Label>
        <Input
          id={project ? "edit-project-note" : "project-note"}
          name="note"
          defaultValue={project?.note ?? ""}
          placeholder="Ghi chú nội bộ..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </form>
  );
}

export function ProjectManager({
  data,
  canManageProjects = true,
  canManageNorms = true,
}: {
  data: ProjectManagerData;
  canManageProjects?: boolean;
  canManageNorms?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectRow | null>(null);
  const [workItemProject, setWorkItemProject] = React.useState<ProjectRow | null>(null);
  const [normTarget, setNormTarget] = React.useState<NormTarget | null>(null);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          toast.success(successMessage);
          setCreateOpen(false);
          setEditingProject(null);
          setWorkItemProject(null);
          setNormTarget(null);
          router.refresh();
          return;
        }
        toast.error(result.error ?? "Không thể lưu dữ liệu");
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  }

  function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => createProject(formData), "Đã tạo công trình");
  }

  function handleUpdateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProject) return;
    const formData = new FormData(event.currentTarget);
    runAction(() => updateProject(editingProject.id, formData), "Đã cập nhật công trình");
  }

  function handleCreateWorkItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workItemProject) return;
    const formData = new FormData(event.currentTarget);
    formData.set("projectId", workItemProject.id);
    runAction(() => createProjectWorkItem(formData), "Đã thêm hạng mục");
  }

  function handleUpsertNorm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normTarget) return;
    const formData = new FormData(event.currentTarget);
    formData.set("projectId", normTarget.projectId);
    formData.set("workItemId", normTarget.workItemId);
    runAction(() => upsertMaterialNorm(formData), "Đã lưu định mức");
  }

  return (
    <div className="space-y-5">
      {canManageProjects && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Thêm công trình
          </Button>
        </div>
      )}

      {data.projects.map((project) => (
        <Card key={project.id} className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {project.name}
                  <Badge variant={project.status === "ACTIVE" ? "default" : "outline"}>
                    {project.status === "ACTIVE" ? "Đang thi công" : "Đã đóng"}
                  </Badge>
                </CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {project.code} · {project.warehouseName ?? "Chưa chọn kho"}
                </div>
              </div>
              {canManageProjects && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingProject(project)}>
                    <Pencil className="size-4" />
                    Sửa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setWorkItemProject(project)}>
                    <Plus className="size-4" />
                    Hạng mục
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.workItems.map((workItem: WorkItemRow) => (
              <div key={workItem.id} className="rounded-md border border-border">
                <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {workItem.name}
                      {workItem.isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">Mặc định</span>
                      )}
                    </div>
                    {workItem.code && <div className="font-mono text-xs text-muted-foreground">{workItem.code}</div>}
                  </div>
                  {canManageNorms && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNormTarget({ projectId: project.id, workItemId: workItem.id, workItemName: workItem.name })}
                    >
                      <Ruler className="size-4" />
                      Thêm định mức
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vật tư</TableHead>
                      <TableHead className="text-right">Định mức</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workItem.norms.map((norm) => (
                      <TableRow key={norm.id}>
                        <TableCell>
                          <div className="font-medium">{norm.materialName}</div>
                          <div className="font-mono text-xs text-muted-foreground">{norm.materialCode}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {norm.normQty.toLocaleString("vi-VN")} {norm.materialUnit}
                        </TableCell>
                        <TableCell>{norm.note ?? ""}</TableCell>
                      </TableRow>
                    ))}
                    {workItem.norms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-4 text-center text-sm text-muted-foreground">
                          Chưa nhập định mức.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {data.projects.length === 0 && (
        <Card className="border border-border shadow-sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có công trình nào.
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm công trình</DialogTitle>
            <DialogDescription>Tạo công trình và hạng mục mặc định Chung.</DialogDescription>
          </DialogHeader>
          <ProjectForm
            warehouses={data.warehouses}
            isPending={isPending}
            onSubmit={handleCreateProject}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingProject !== null} onOpenChange={(open) => { if (!open) setEditingProject(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sửa công trình</DialogTitle>
            <DialogDescription>Cập nhật thông tin công trình.</DialogDescription>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              project={editingProject}
              warehouses={data.warehouses}
              isPending={isPending}
              onSubmit={handleUpdateProject}
              onCancel={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={workItemProject !== null} onOpenChange={(open) => { if (!open) setWorkItemProject(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm hạng mục</DialogTitle>
            <DialogDescription>{workItemProject?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkItem} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="work-item-code">Mã hạng mục</Label>
              <Input id="work-item-code" name="code" placeholder="VD: MONG" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="work-item-name">Tên hạng mục</Label>
              <Input id="work-item-name" name="name" required placeholder="VD: Móng" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setWorkItemProject(null)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={normTarget !== null} onOpenChange={(open) => { if (!open) setNormTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập định mức</DialogTitle>
            <DialogDescription>{normTarget?.workItemName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpsertNorm} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="norm-material">Vật tư</Label>
              <select
                id="norm-material"
                name="materialId"
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Chọn vật tư...</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="norm-qty">Định mức</Label>
              <Input id="norm-qty" name="normQty" type="number" step="any" min="0" required placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="norm-note">Ghi chú</Label>
              <Input id="norm-note" name="note" placeholder="Ghi chú định mức..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNormTarget(null)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu định mức"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
