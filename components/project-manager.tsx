"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProject, deleteProject } from "@/lib/actions/projects";
import { toast } from "sonner";

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  note: string | null;
  _count: { warehouses: number; funds: number };
}

export function ProjectManager({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectRow | null>(null);

  const submit = (
    e: React.FormEvent<HTMLFormElement>,
    action: (d: { name: string; code: string; note?: string }) => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
    onOk: () => void
  ) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const code = fd.get("code") as string;
    const note = (fd.get("note") as string) || undefined;
    startTransition(async () => {
      try {
        const res = await action({ name, code, note });
        if (res.ok) {
          toast.success(okMsg);
          onOk();
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Xóa công trình "${name}"?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteProject(id);
        if (res.ok) {
          toast.success("Đã xóa công trình");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể xóa công trình");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Thêm công trình</Button>
      </div>

      <Card className="border border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quản lý Công trình</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chưa có công trình nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">STT</TableHead>
                    <TableHead>Tên công trình</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead className="text-center">Số kho</TableHead>
                    <TableHead className="text-center">Số quỹ</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-[160px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p, i) => {
                    const hasLink = p._count.warehouses + p._count.funds > 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell className="text-center tabular-nums">{p._count.warehouses}</TableCell>
                        <TableCell className="text-center tabular-nums">{p._count.funds}</TableCell>
                        <TableCell className="text-muted-foreground">{p.note || "—"}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => setEditing(p)} disabled={isPending}>
                            Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={isPending || hasLink}
                            title={hasLink ? "Công trình đang có kho hoặc quỹ — không thể xóa" : undefined}
                            className="text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          >
                            Xóa
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thêm */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm công trình mới</DialogTitle></DialogHeader>
          <form onSubmit={(e) => submit(e, createProject, "Đã thêm công trình", () => setIsCreateOpen(false))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="pname">Tên công trình <span className="text-destructive">*</span></Label>
              <Input id="pname" name="name" required placeholder="Công trình xây dựng A" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pcode">Mã công trình <span className="text-destructive">*</span></Label>
              <Input id="pcode" name="code" required placeholder="CT-A" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pnote">Ghi chú</Label>
              <Input id="pnote" name="note" placeholder="Thông tin bổ sung..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>Hủy</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Đang tạo..." : "Thêm mới"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sửa */}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Chỉnh sửa công trình</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={(e) => submit(e, (d) => updateProject(editing.id, d), "Đã cập nhật công trình", () => setEditing(null))} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="epname">Tên công trình <span className="text-destructive">*</span></Label>
                <Input id="epname" name="name" required defaultValue={editing.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="epcode">Mã công trình <span className="text-destructive">*</span></Label>
                <Input id="epcode" name="code" required defaultValue={editing.code} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="epnote">Ghi chú</Label>
                <Input id="epnote" name="note" defaultValue={editing.note || ""} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={isPending}>Hủy</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu thay đổi"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
