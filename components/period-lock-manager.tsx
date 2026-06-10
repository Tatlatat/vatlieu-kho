"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createAccountingPeriodLock, deleteAccountingPeriodLock } from "@/lib/actions/period-locks";
import type { PeriodLockRow } from "@/lib/queries/period-locks";

interface Props {
  locks: PeriodLockRow[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN");
}

function todayInputValue(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function PeriodLockManager({ locks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const defaultDate = todayInputValue();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAccountingPeriodLock(formData);
      if (result.ok) {
        toast.success("Đã khóa kỳ");
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể khóa kỳ");
      }
    });
  }

  function handleDelete(lockId: string) {
    const formData = new FormData();
    formData.set("id", lockId);
    startTransition(async () => {
      const result = await deleteAccountingPeriodLock(formData);
      if (result.ok) {
        toast.success("Đã mở khóa kỳ");
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể mở khóa kỳ");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khóa kỳ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chặn thay đổi chứng từ kho và quỹ sau khi đã chốt đối chiếu.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white">
          <LockKeyhole className="size-5" />
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tạo khóa kỳ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="scope">Phạm vi</Label>
              <select
                id="scope"
                name="scope"
                defaultValue="ALL"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Kho và quỹ</option>
                <option value="INVENTORY">Kho</option>
                <option value="FUND">Quỹ</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fromDate">Từ ngày</Label>
              <Input id="fromDate" name="fromDate" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="toDate">Đến ngày</Label>
              <Input id="toDate" name="toDate" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reason">Lý do</Label>
              <Input id="reason" name="reason" placeholder="Ví dụ: chốt tháng 06/2026" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending} className="w-full">
                Khóa kỳ
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Danh sách khóa kỳ</CardTitle>
        </CardHeader>
        <CardContent>
          {locks.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chưa có kỳ nào bị khóa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phạm vi</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Người khóa</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locks.map((lock) => (
                    <TableRow key={lock.id}>
                      <TableCell className="font-medium">{lock.scopeLabel}</TableCell>
                      <TableCell>{formatDate(lock.fromDate)}</TableCell>
                      <TableCell>{formatDate(lock.toDate)}</TableCell>
                      <TableCell>{lock.reason ?? ""}</TableCell>
                      <TableCell>{lock.createdByName}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDelete(lock.id)}
                        >
                          <Trash2 className="size-4" />
                          Mở khóa
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
    </div>
  );
}
