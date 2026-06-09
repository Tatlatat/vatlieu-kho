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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUnit, updateUnit, deleteUnit } from "@/lib/actions/units";
import { toast } from "sonner";

interface UnitRow {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  _count: { materials: number };
}

interface UnitManagerProps {
  units: UnitRow[];
}

export function UnitManager({ units }: UnitManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<UnitRow | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = (fd.get("code") as string) || "";
    const name = (fd.get("name") as string) || "";
    const isActive = fd.get("isActive") === "on";

    startTransition(async () => {
      try {
        const res = await createUnit({ code, name, isActive });
        if (res.ok) {
          toast.success("Đã thêm đơn vị tính");
          setIsCreateOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUnit) return;
    const fd = new FormData(e.currentTarget);
    const code = (fd.get("code") as string) || "";
    const name = (fd.get("name") as string) || "";
    const isActive = fd.get("isActive") === "on";

    startTransition(async () => {
      try {
        const res = await updateUnit(editingUnit.id, { code, name, isActive });
        if (res.ok) {
          toast.success("Đã cập nhật đơn vị tính");
          setEditingUnit(null);
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
    if (!window.confirm(`Xóa đơn vị tính "${name}"?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteUnit(id);
        if (res.ok) {
          toast.success("Đã xóa đơn vị tính");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể xóa đơn vị tính");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          Thêm đơn vị tính
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách đơn vị tính</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có đơn vị tính nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">STT</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên đơn vị</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Số vật tư dùng</TableHead>
                    <TableHead className="w-[160px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit, index) => (
                    <TableRow key={unit.id}>
                      <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{unit.code}</TableCell>
                      <TableCell className="font-semibold">{unit.name}</TableCell>
                      <TableCell>{unit.isActive ? "Đang dùng" : "Ngừng dùng"}</TableCell>
                      <TableCell className="text-right tabular-nums">{unit._count.materials}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUnit(unit)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(unit.id, unit.name)}
                          disabled={isPending || unit._count.materials > 0}
                          title={unit._count.materials > 0 ? "Đơn vị tính đang được dùng — không thể xóa" : undefined}
                          className="cursor-pointer text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        >
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm đơn vị tính mới</DialogTitle>
            <DialogDescription>Nhập mã và tên đơn vị tính để dùng cho vật tư.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ucode">Mã đơn vị tính <span className="text-destructive">*</span></Label>
              <Input id="ucode" name="code" required placeholder="VD: KG" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="uname">Tên đơn vị tính <span className="text-destructive">*</span></Label>
              <Input id="uname" name="name" required placeholder="VD: kg" />
            </div>
            <div className="flex items-center gap-2">
              <input id="uisActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
              <Label htmlFor="uisActive">Đang dùng</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Thêm mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingUnit !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUnit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đơn vị tính</DialogTitle>
            <DialogDescription>Cập nhật mã, tên hoặc trạng thái của đơn vị tính.</DialogDescription>
          </DialogHeader>
          {editingUnit && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="eucode">Mã đơn vị tính <span className="text-destructive">*</span></Label>
                <Input id="eucode" name="code" required defaultValue={editingUnit.code} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="euname">Tên đơn vị tính <span className="text-destructive">*</span></Label>
                <Input id="euname" name="name" required defaultValue={editingUnit.name} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="euisActive"
                  name="isActive"
                  type="checkbox"
                  defaultChecked={editingUnit.isActive}
                  className="h-4 w-4"
                />
                <Label htmlFor="euisActive">Đang dùng</Label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)} disabled={isPending}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
