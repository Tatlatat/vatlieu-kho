"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { WarehouseSelect } from "@/components/warehouse-select";
import { createStocktake } from "@/lib/actions/stocktake";
import { toast } from "sonner";

interface Warehouse { id: string; name: string; code: string; isDefault: boolean; }

export function NewStocktakeButton({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [warehouseId, setWarehouseId] = React.useState(() => warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "");
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    if (!warehouseId) { toast.error("Vui lòng chọn kho"); return; }
    startTransition(async () => {
      try {
        const res = await createStocktake(warehouseId);
        if (res.ok && res.id) { toast.success("Đã tạo phiếu kiểm kê mới"); router.push(`/kiem-ke/${res.id}`); }
        else toast.error(res.error || "Không thể tạo phiếu kiểm kê");
      } catch { toast.error("Có lỗi xảy ra khi tạo phiếu kiểm kê"); }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="cursor-pointer">Tạo phiếu kiểm kê mới</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tạo phiếu kiểm kê</DialogTitle><DialogDescription>Chọn kho cần kiểm kê.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Kho</Label><WarehouseSelect warehouses={warehouses} name="warehouseId" value={warehouseId} onChange={setWarehouseId} /></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="cursor-pointer">Hủy</Button>
              <Button type="button" onClick={handleCreate} disabled={isPending} className="cursor-pointer">{isPending ? "Đang tạo..." : "Tạo phiếu"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
