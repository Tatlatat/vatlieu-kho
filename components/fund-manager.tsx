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
import { createFund, updateFund, deleteFund } from "@/lib/actions/funds";
import { formatVnd } from "@/lib/utils";
import { toast } from "sonner";

interface FundRow {
  id: string;
  name: string;
  code: string;
  note?: string | null;
  isActive: boolean;
  balance: number;
  projectId?: string | null;
  _count: { entries: number };
}

interface ProjectOption {
  id: string;
  name: string;
  isActive: boolean;
}

export function FundManager({ funds, projects = [] }: { funds: FundRow[]; projects?: ProjectOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FundRow | null>(null);

  const submit = (
    e: React.FormEvent<HTMLFormElement>,
    action: (d: { name: string; code: string; note?: string; projectId?: string | null }) => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
    onOk: () => void
  ) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const code = fd.get("code") as string;
    const note = (fd.get("note") as string) || undefined;
    const projectId = (fd.get("projectId") as string) || null;
    startTransition(async () => {
      try {
        const res = await action({ name, code, note, projectId });
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
    if (!window.confirm(`Xóa quỹ "${name}"?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteFund(id);
        if (res.ok) {
          toast.success("Đã xóa quỹ");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể xóa quỹ");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Thêm quỹ</Button>
      </div>

      <Card className="border border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách quỹ</CardTitle>
        </CardHeader>
        <CardContent>
          {funds.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chưa có quỹ nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">STT</TableHead>
                    <TableHead>Tên quỹ</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead className="text-right">Tồn quỹ</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-[160px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funds.map((f, i) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-semibold">{f.name}</TableCell>
                      <TableCell className="font-mono text-xs">{f.code}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${f.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {formatVnd(f.balance)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.note || "—"}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditing(f)} disabled={isPending}>
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(f.id, f.name)}
                          disabled={isPending || f._count.entries > 0}
                          title={f._count.entries > 0 ? "Quỹ đã có giao dịch — không thể xóa" : undefined}
                          className="text-destructive hover:bg-destructive/10 disabled:opacity-40"
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

      {/* Thêm */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm quỹ mới</DialogTitle></DialogHeader>
          <form onSubmit={(e) => submit(e, createFund, "Đã thêm quỹ", () => setIsCreateOpen(false))} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="fname">Tên quỹ <span className="text-destructive">*</span></Label>
              <Input id="fname" name="name" required placeholder="Quỹ công trường A" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fcode">Mã quỹ <span className="text-destructive">*</span></Label>
              <Input id="fcode" name="code" required placeholder="QUY-CT-A" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fnote">Ghi chú</Label>
              <Input id="fnote" name="note" placeholder="Thông tin bổ sung..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fproject">Công trình (không bắt buộc)</Label>
              <select id="fproject" name="projectId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">— Không thuộc CT —</option>
                {projects.filter((p) => p.isActive).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
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
          <DialogHeader><DialogTitle>Chỉnh sửa quỹ</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={(e) => submit(e, (d) => updateFund(editing.id, d), "Đã cập nhật quỹ", () => setEditing(null))} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="efname">Tên quỹ <span className="text-destructive">*</span></Label>
                <Input id="efname" name="name" required defaultValue={editing.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="efcode">Mã quỹ <span className="text-destructive">*</span></Label>
                <Input id="efcode" name="code" required defaultValue={editing.code} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="efnote">Ghi chú</Label>
                <Input id="efnote" name="note" defaultValue={editing.note || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="efproject">Công trình (không bắt buộc)</Label>
                <select id="efproject" name="projectId" defaultValue={editing.projectId || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">— Không thuộc CT —</option>
                  {projects.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
