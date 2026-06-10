"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createUnit, updateUnit } from "@/lib/actions/catalogs";
import { toast } from "sonner";

interface Unit {
  id: string;
  name: string;
  note: string | null;
}

function UnitFields({ unit }: { unit?: Unit }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={unit ? "edit-unit-name" : "unit-name"}>Tên đơn vị tính</Label>
        <Input
          id={unit ? "edit-unit-name" : "unit-name"}
          name="name"
          defaultValue={unit?.name ?? ""}
          required
          placeholder="Ví dụ: tấn, kg, cây, md"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={unit ? "edit-unit-note" : "unit-note"}>Ghi chú</Label>
        <Input
          id={unit ? "edit-unit-note" : "unit-note"}
          name="note"
          defaultValue={unit?.note ?? ""}
          placeholder="Tùy chọn"
        />
      </div>
    </div>
  );
}

export function UnitManager({
  units,
  canManage = true,
}: {
  units: Unit[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<Unit | null>(null);

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createUnit(formData);
      if (result.ok) {
        toast.success("Đã thêm đơn vị tính");
        setIsCreateOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể thêm đơn vị tính");
      }
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUnit) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateUnit(editingUnit.id, formData);
      if (result.ok) {
        toast.success("Đã cập nhật đơn vị tính");
        setEditingUnit(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể cập nhật đơn vị tính");
      }
    });
  };

  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg font-semibold">
          Đơn vị tính <span className="text-sm font-normal text-muted-foreground">({units.length})</span>
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
            Thêm đơn vị
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Ghi chú</TableHead>
              {canManage && <TableHead className="w-[100px] text-right">Hành động</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell>{unit.note ?? ""}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditingUnit(unit)}>
                      Sửa
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 3 : 2} className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có đơn vị tính.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm đơn vị tính</DialogTitle>
            <DialogDescription>Tạo danh mục đơn vị cố định để chọn khi tạo vật tư.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <UnitFields />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingUnit !== null} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa đơn vị tính</DialogTitle>
            <DialogDescription>Đổi tên đơn vị sẽ cập nhật tên đơn vị trên các vật tư đang dùng.</DialogDescription>
          </DialogHeader>
          {editingUnit && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <UnitFields unit={editingUnit} />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)} disabled={isPending}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
