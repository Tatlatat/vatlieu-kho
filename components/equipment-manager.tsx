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
import {
  createEquipment,
  updateEquipment,
  deleteEquipment,
  logHours,
} from "@/lib/actions/equipment";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  type?: string | null;
  plateNo?: string | null;
  note?: string | null;
  _count: {
    logs: number;
  };
}

interface EquipmentManagerProps {
  equipment: Equipment[];
}

export function EquipmentManager({ equipment }: EquipmentManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingEquipment, setEditingEquipment] = React.useState<Equipment | null>(null);
  const [loggingHoursEquipment, setLoggingHoursEquipment] = React.useState<Equipment | null>(null);

  // Lazy initializer to get today's date formatted as YYYY-MM-DD
  const [todayDate] = React.useState(() => new Date().toISOString().split("T")[0]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const type = (fd.get("type") as string) || undefined;
    const plateNo = (fd.get("plateNo") as string) || undefined;
    const note = (fd.get("note") as string) || undefined;

    startTransition(async () => {
      try {
        const res = await createEquipment({ name, type, plateNo, note });
        if (res.ok) {
          toast.success("Đã thêm xe/máy thành công");
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
    if (!editingEquipment) return;
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const type = (fd.get("type") as string) || undefined;
    const plateNo = (fd.get("plateNo") as string) || undefined;
    const note = (fd.get("note") as string) || undefined;

    startTransition(async () => {
      try {
        const res = await updateEquipment(editingEquipment.id, { name, type, plateNo, note });
        if (res.ok) {
          toast.success("Đã cập nhật xe/máy thành công");
          setEditingEquipment(null);
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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa xe/máy "${name}"? Các nhật ký giờ chạy liên quan cũng sẽ bị xóa.`)) return;

    startTransition(async () => {
      try {
        const res = await deleteEquipment(id);
        if (res.ok) {
          toast.success("Đã xóa xe/máy thành công");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể xóa xe/máy");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleLogHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loggingHoursEquipment) return;
    const fd = new FormData(e.currentTarget);
    const logDate = fd.get("logDate") as string;
    const hours = Number(fd.get("hours"));
    const note = (fd.get("note") as string) || undefined;

    if (isNaN(hours) || hours <= 0) {
      toast.error("Số giờ chạy phải lớn hơn 0");
      return;
    }

    startTransition(async () => {
      try {
        const res = await logHours({
          equipmentId: loggingHoursEquipment.id,
          logDate,
          hours,
          note,
        });
        if (res.ok) {
          toast.success(`Đã ghi nhận ${hours} giờ chạy cho ${loggingHoursEquipment.name}`);
          setLoggingHoursEquipment(null);
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
          Thêm xe/máy
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách xe/máy</CardTitle>
        </CardHeader>
        <CardContent>
          {equipment.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có xe/máy nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">STT</TableHead>
                    <TableHead>Tên xe/máy</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Biển số</TableHead>
                    <TableHead className="text-center">Số lần ghi giờ</TableHead>
                    <TableHead className="w-[280px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((eq, index) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{eq.name}</TableCell>
                      <TableCell>{eq.type || <span className="text-muted-foreground italic text-xs">Chưa rõ</span>}</TableCell>
                      <TableCell>{eq.plateNo || <span className="text-muted-foreground italic text-xs">Chưa có</span>}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {eq._count.logs}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLoggingHoursEquipment(eq)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          Ghi giờ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingEquipment(eq)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(eq.id, eq.name)}
                          disabled={isPending}
                          className="cursor-pointer text-destructive hover:bg-destructive/10"
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

      {/* Dialog thêm mới thiết bị */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm xe/máy mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin chi tiết của xe hoặc máy công trình mới.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="eqname">Tên thiết bị <span className="text-destructive">*</span></Label>
              <Input
                id="eqname"
                name="name"
                required
                placeholder="Ví dụ: Máy xúc Komatsu"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eqtype">Loại thiết bị</Label>
              <Input
                id="eqtype"
                name="type"
                placeholder="Ví dụ: Máy xúc, Xe tải, Máy lu..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eqplate">Biển số</Label>
              <Input
                id="eqplate"
                name="plateNo"
                placeholder="Ví dụ: 29C-123.45"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eqnote">Ghi chú</Label>
              <Input
                id="eqnote"
                name="note"
                placeholder="Thông tin bổ sung..."
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
                {isPending ? "Đang tạo..." : "Thêm mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chỉnh sửa thiết bị */}
      <Dialog open={editingEquipment !== null} onOpenChange={(o) => { if (!o) setEditingEquipment(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa xe/máy</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết xe/máy.
            </DialogDescription>
          </DialogHeader>
          {editingEquipment && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="eeqname">Tên thiết bị <span className="text-destructive">*</span></Label>
                <Input
                  id="eeqname"
                  name="name"
                  required
                  defaultValue={editingEquipment.name}
                  placeholder="Ví dụ: Máy xúc Komatsu"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eeqtype">Loại thiết bị</Label>
                <Input
                  id="eeqtype"
                  name="type"
                  defaultValue={editingEquipment.type || ""}
                  placeholder="Ví dụ: Máy xúc, Xe tải, Máy lu..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eeqplate">Biển số</Label>
                <Input
                  id="eeqplate"
                  name="plateNo"
                  defaultValue={editingEquipment.plateNo || ""}
                  placeholder="Ví dụ: 29C-123.45"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eeqnote">Ghi chú</Label>
                <Input
                  id="eeqnote"
                  name="note"
                  defaultValue={editingEquipment.note || ""}
                  placeholder="Thông tin bổ sung..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEquipment(null)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Đang cập nhật..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog ghi giờ chạy */}
      <Dialog open={loggingHoursEquipment !== null} onOpenChange={(o) => { if (!o) setLoggingHoursEquipment(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi nhận nhật ký giờ chạy</DialogTitle>
            <DialogDescription>
              Nhập số giờ chạy trong ngày của {loggingHoursEquipment?.name}.
            </DialogDescription>
          </DialogHeader>
          {loggingHoursEquipment && (
            <form onSubmit={handleLogHours} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="logdate">Ngày chạy</Label>
                <Input
                  id="logdate"
                  name="logDate"
                  type="date"
                  required
                  defaultValue={todayDate}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="loghours">Số giờ chạy <span className="text-destructive">*</span></Label>
                <Input
                  id="loghours"
                  name="hours"
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="Ví dụ: 8 hoặc 5.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lognote">Ghi chú</Label>
                <Input
                  id="lognote"
                  name="note"
                  placeholder="Ví dụ: Đào móng công trình A..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLoggingHoursEquipment(null)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Đang ghi..." : "Ghi nhận"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
