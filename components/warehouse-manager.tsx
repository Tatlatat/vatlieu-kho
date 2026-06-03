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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWarehouse, updateWarehouse } from "@/lib/actions/warehouses";
import { toast } from "sonner";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export function WarehouseManager({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Warehouse | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await createWarehouse(fd);
        if (res.ok) {
          toast.success("Đã thêm kho");
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
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await updateWarehouse(editing.id, fd);
        if (res.ok) {
          toast.success("Đã cập nhật kho");
          setEditing(null);
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          Thêm kho
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách kho</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có kho nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên kho</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Mặc định</TableHead>
                    <TableHead className="w-[100px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold text-foreground">{w.name}</TableCell>
                      <TableCell className="font-mono text-xs">{w.code}</TableCell>
                      <TableCell>
                        {w.isDefault && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-transparent">
                            Mặc định
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(w)}
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

      {/* Dialog thêm mới */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm kho mới</DialogTitle>
            <DialogDescription>Nhập tên và mã kho.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="wname">Tên kho</Label>
              <Input id="wname" name="name" required placeholder="Ví dụ: Kho công trình A" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wcode">Mã kho</Label>
              <Input id="wcode" name="code" required placeholder="Ví dụ: KHO-CT-A" />
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
                {isPending ? "Đang lưu..." : "Lưu kho"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chỉnh sửa */}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa kho</DialogTitle>
            <DialogDescription>Cập nhật thông tin kho.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="ewname">Tên kho</Label>
                <Input id="ewname" name="name" defaultValue={editing.name} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ewcode">Mã kho</Label>
                <Input id="ewcode" name="code" defaultValue={editing.code} required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
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
