"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { voidCashEntry } from "@/lib/actions/cash";
import { CASH_CATEGORY_LABELS } from "@/lib/validation";
import { formatVnd } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface CashEntryRow {
  id: string;
  type: "THU" | "CHI";
  category: string;
  amount: number;
  entryDate: Date | string;
  note: string | null;
  voidedAt: Date | string | null;
  createdByName: string | null;
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function CashLedger({ entries, canVoid }: { entries: CashEntryRow[]; canVoid?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [voidId, setVoidId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  const handleVoid = () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }
    const id = voidId!;
    startTransition(async () => {
      try {
        const res = await voidCashEntry(id, reason.trim());
        if (res.ok) {
          toast.success("Đã hủy phiếu");
          setVoidId(null);
          setReason("");
          router.refresh();
        } else {
          toast.error(res.error || "Lỗi hủy phiếu");
        }
      } catch (e) {
        toast.error("Lỗi hệ thống: " + (e as Error).message);
      }
    });
  };

  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Sổ bút toán</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Hạng mục</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
            <TableHead>Diễn giải</TableHead>
            <TableHead>Người lập</TableHead>
            {canVoid && <TableHead className="text-center">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canVoid ? 7 : 6} className="py-8 text-center text-slate-400">
                Chưa có giao dịch nào trong kỳ
              </TableCell>
            </TableRow>
          ) : (
            entries.map((e) => {
              const voided = !!e.voidedAt;
              return (
                <TableRow key={e.id} className={voided ? "opacity-50 line-through" : undefined}>
                  <TableCell>{formatDate(e.entryDate)}</TableCell>
                  <TableCell>
                    <span className={e.type === "THU" ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                      {e.type === "THU" ? "Thu" : "Chi"}
                    </span>
                  </TableCell>
                  <TableCell>{CASH_CATEGORY_LABELS[e.category] ?? e.category}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatVnd(e.amount)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-slate-600">{e.note || "—"}</TableCell>
                  <TableCell>{e.createdByName || "—"}</TableCell>
                  {canVoid && (
                    <TableCell className="text-center">
                      {voided ? (
                        <span className="text-xs text-slate-400">Đã hủy</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700 no-underline"
                          onClick={() => {
                            setReason("");
                            setVoidId(e.id);
                          }}
                        >
                          Hủy
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={voidId !== null} onOpenChange={(o) => !o && setVoidId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận hủy phiếu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="leading-relaxed text-muted-foreground">
              Hủy phiếu sẽ loại nó khỏi tồn quỹ. Phiếu vẫn được giữ trong sổ (gạch ngang) để truy vết. Không thể hoàn tác.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="cash-void-reason" className="text-xs font-semibold">
                Lý do hủy <span className="text-destructive">*</span>
              </label>
              <Input
                id="cash-void-reason"
                placeholder="Nhập lý do hủy (bắt buộc)..."
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                disabled={isPending}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setVoidId(null)} disabled={isPending}>
              Bỏ qua
            </Button>
            <Button type="button" variant="destructive" onClick={handleVoid} disabled={isPending || !reason.trim()}>
              {isPending ? "Đang hủy..." : "Đồng ý hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
