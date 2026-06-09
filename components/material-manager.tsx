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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createMaterial, updateMaterial } from "@/lib/actions/materials";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  unitId?: string | null;
  minStock: number;
}

interface UnitOption {
  id: string;
  code: string;
  name: string;
}

export function MaterialManager({ materials, units }: { materials: Material[]; units: UnitOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<Material | null>(null);
  const [createUnitId, setCreateUnitId] = React.useState(units[0]?.id || "");
  const [editingUnitId, setEditingUnitId] = React.useState("");

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("unitId", createUnitId);

    startTransition(async () => {
      try {
        const res = await createMaterial(formData);
        if (res.ok) {
          toast.success("Thêm vật liệu thành công");
          setIsCreateOpen(false);
          setCreateUnitId(units[0]?.id || "");
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const formData = new FormData(e.currentTarget);
    formData.set("unitId", editingUnitId);

    startTransition(async () => {
      try {
        const res = await updateMaterial(editingMaterial.id, formData);
        if (res.ok) {
          toast.success("Cập nhật vật liệu thành công");
          setEditingMaterial(null);
          setEditingUnitId("");
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setCreateUnitId(units[0]?.id || "");
            setIsCreateOpen(true);
          }}
          className="cursor-pointer"
        >
          Thêm vật liệu
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách vật tư <span className="text-sm font-normal text-muted-foreground">({materials.length} mã)</span></CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có vật liệu nào được thêm vào hệ thống.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[56px]">STT</TableHead>
                    <TableHead>Tên vật liệu</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead className="text-right">Mức tối thiểu</TableHead>
                    <TableHead className="w-[100px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m, idx) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {m.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.code}</TableCell>
                      <TableCell>{m.unit}</TableCell>
                      <TableCell className="text-right font-medium">{m.minStock}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUnitId(m.unitId || units.find((u) => u.name === m.unit)?.id || "");
                            setEditingMaterial(m);
                          }}
                          className="cursor-pointer"
                        >
                          Sửa
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

      {/* Dialog them moi */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setCreateUnitId(units[0]?.id || "");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm vật liệu mới</DialogTitle>
            <DialogDescription>
              Nhập các thông tin cần thiết để tạo mới vật tư.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Tên vật liệu</Label>
              <Input id="name" name="name" required placeholder="Ví dụ: Xi măng PCB40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="code">Mã vật liệu</Label>
              <Input id="code" name="code" required placeholder="Ví dụ: XM-PCB40" />
            </div>
              <div className="space-y-1">
                <Label htmlFor="unitId">Đơn vị tính</Label>
                <Select value={createUnitId} onValueChange={(value) => setCreateUnitId(value ?? "")}>
                  <SelectTrigger id="unitId" className="h-10 w-full">
                    <SelectValue placeholder="Chọn đơn vị tính">
                      {units.find((u) => u.id === createUnitId)?.name || "Chọn đơn vị tính"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="minStock">Định mức tồn kho tối thiểu (không bắt buộc)</Label>
                <Input
                  id="minStock"
                  name="minStock"
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 20"
                />
              </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="cursor-pointer">
                {isPending ? "Đang lưu..." : "Lưu vật liệu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chinh sua */}
      <Dialog
        open={editingMaterial !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMaterial(null);
            setEditingUnitId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa vật liệu</DialogTitle>
            <DialogDescription>
              Cập nhật các thông tin của vật tư này trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Tên vật liệu</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingMaterial.name}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-code">Mã vật liệu</Label>
                <Input
                  id="edit-code"
                  name="code"
                  defaultValue={editingMaterial.code}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-unitId">Đơn vị tính</Label>
                <Select value={editingUnitId} onValueChange={(value) => setEditingUnitId(value ?? "")}>
                  <SelectTrigger id="edit-unitId" className="h-10 w-full">
                    <SelectValue placeholder="Chọn đơn vị tính">
                      {units.find((u) => u.id === editingUnitId)?.name || "Chọn đơn vị tính"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-minStock">Định mức tồn kho tối thiểu (không bắt buộc)</Label>
                <Input
                  id="edit-minStock"
                  name="minStock"
                  type="number"
                  step="any"
                  defaultValue={editingMaterial.minStock}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMaterial(null)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
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
