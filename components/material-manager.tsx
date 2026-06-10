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
import { Badge } from "@/components/ui/badge";
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
import { createMaterial, updateMaterial } from "@/lib/actions/materials";
import {
  MATERIAL_KIND_LABELS,
  MATERIAL_KIND_VALUES,
  type MaterialKindValue,
  type TrackingModeValue,
} from "@/lib/catalogs/material-catalog";
import { toast } from "sonner";

interface Unit {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  unitId: string | null;
  kind: MaterialKindValue;
  trackingMode: TrackingModeValue;
  minStock: number;
}

interface MaterialManagerProps {
  materials: Material[];
  units: Unit[];
  canManage?: boolean;
}

function selectClassName() {
  return "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground";
}

function MaterialFields({
  material,
  units,
}: {
  material?: Material;
  units: Unit[];
}) {
  const fallbackUnitId = material?.unitId ?? units.find((unit) => unit.name === material?.unit)?.id ?? "";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={material ? "edit-name" : "name"}>Tên danh mục</Label>
        <Input
          id={material ? "edit-name" : "name"}
          name="name"
          defaultValue={material?.name ?? ""}
          required
          placeholder="Ví dụ: Xi măng PCB40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={material ? "edit-code" : "code"}>Mã</Label>
        <Input
          id={material ? "edit-code" : "code"}
          name="code"
          defaultValue={material?.code ?? ""}
          required
          placeholder="Ví dụ: XM-PCB40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={material ? "edit-unitId" : "unitId"}>Đơn vị tính</Label>
        <select
          id={material ? "edit-unitId" : "unitId"}
          name="unitId"
          defaultValue={fallbackUnitId}
          required
          className={selectClassName()}
        >
          <option value="" disabled>
            Chọn đơn vị
          </option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={material ? "edit-kind" : "kind"}>Loại</Label>
        <select
          id={material ? "edit-kind" : "kind"}
          name="kind"
          defaultValue={material?.kind ?? "MATERIAL"}
          className={selectClassName()}
        >
          {MATERIAL_KIND_VALUES.map((kind) => (
            <option key={kind} value={kind}>
              {MATERIAL_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={material ? "edit-minStock" : "minStock"}>Tồn kho tối thiểu</Label>
        <Input
          id={material ? "edit-minStock" : "minStock"}
          name="minStock"
          type="number"
          step="any"
          min="0"
          defaultValue={material ? material.minStock : ""}
          placeholder="Không nhập thì mặc định 0"
        />
      </div>
    </div>
  );
}

export function MaterialManager({ materials, units, canManage = true }: MaterialManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<Material | null>(null);

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createMaterial(formData);
        if (res.ok) {
          toast.success("Thêm danh mục thành công");
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

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await updateMaterial(editingMaterial.id, formData);
        if (res.ok) {
          toast.success("Cập nhật danh mục thành công");
          setEditingMaterial(null);
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
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer" disabled={units.length === 0}>
            Thêm danh mục
          </Button>
        </div>
      )}

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Danh mục vật tư <span className="text-sm font-normal text-muted-foreground">({materials.length} mã)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có danh mục vật tư nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead className="text-right">Tồn tối thiểu</TableHead>
                    {canManage && <TableHead className="w-[100px] text-right">Hành động</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material, index) => (
                    <TableRow key={material.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{material.name}</TableCell>
                      <TableCell className="font-mono text-xs">{material.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{MATERIAL_KIND_LABELS[material.kind]}</Badge>
                      </TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell className="text-right font-medium">{material.minStock}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingMaterial(material)}
                            className="cursor-pointer"
                          >
                            Sửa
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm danh mục vật tư</DialogTitle>
            <DialogDescription>
              Xe và máy cũng được tạo tại đây để theo dõi cùng hệ thống vật tư.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <MaterialFields units={units} />
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
              <Button type="submit" disabled={isPending || units.length === 0} className="cursor-pointer">
                {isPending ? "Đang lưu..." : "Lưu danh mục"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingMaterial !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMaterial(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục vật tư</DialogTitle>
            <DialogDescription>
              Cập nhật tên, đơn vị tính, loại và cách theo dõi của mã này.
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <MaterialFields material={editingMaterial} units={units} />
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
                <Button type="submit" disabled={isPending || units.length === 0} className="cursor-pointer">
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
