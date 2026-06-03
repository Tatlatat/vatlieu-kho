"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchableMaterialSelect } from "@/components/searchable-material-select";
import { WarehouseSelect } from "@/components/warehouse-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createTransfer } from "@/lib/actions/transfer";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export function TransferForm({ materials, warehouses }: { materials: Material[]; warehouses: Warehouse[] }) {
  const router = useRouter();
  const [materialId, setMaterialId] = React.useState("");
  const [fromWarehouseId, setFromWarehouseId] = React.useState(
    () => warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""
  );
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const selectedMaterial = materials.find((m) => m.id === materialId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!materialId) {
      toast.error("Vui lòng chọn vật tư");
      return;
    }
    if (!fromWarehouseId) {
      toast.error("Vui lòng chọn kho nguồn");
      return;
    }
    if (!toWarehouseId) {
      toast.error("Vui lòng chọn kho đích");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Kho nguồn và kho đích phải khác nhau");
      return;
    }
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createTransfer(formData);
        if (res.ok) {
          toast.success("Đã chuyển kho");
          formRef.current?.reset();
          setMaterialId("");
          setToWarehouseId("");
          router.push("/");
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Có lỗi kết nối xảy ra");
      }
    });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border border-border bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground text-center">
            Chuyển Kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="materialId" className="text-sm font-medium">Vật tư</Label>
              <SearchableMaterialSelect
                materials={materials}
                name="materialId"
                value={materialId}
                onChange={setMaterialId}
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium">Kho nguồn</Label>
              <WarehouseSelect
                warehouses={warehouses}
                name="fromWarehouseId"
                value={fromWarehouseId}
                onChange={setFromWarehouseId}
                placeholder="Kho nguồn..."
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium">Kho đích</Label>
              <WarehouseSelect
                warehouses={warehouses}
                name="toWarehouseId"
                value={toWarehouseId}
                onChange={setToWarehouseId}
                placeholder="Kho đích..."
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="quantity" className="text-sm font-medium">Số lượng</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  required
                  className="h-10 flex-1"
                  placeholder="Nhập số lượng..."
                />
                <span className="text-sm text-muted-foreground w-12 shrink-0">
                  {selectedMaterial?.unit ?? ""}
                </span>
              </div>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="note" className="text-sm font-medium">Ghi chú (tùy chọn)</Label>
              <Input
                id="note"
                name="note"
                type="text"
                className="h-10"
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                disabled={isPending}
                className="flex-1 h-10 cursor-pointer"
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 h-10 cursor-pointer"
              >
                {isPending ? "Đang xử lý..." : "Lưu phiếu chuyển"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
