"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MaterialSelect } from "@/components/material-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createExport } from "@/lib/actions/movements";
import { OUT_REASONS } from "@/lib/validation";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

export function ExportForm({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const [materialId, setMaterialId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!materialId) {
      toast.error("Vui lòng chọn vật tư");
      return;
    }
    if (!reason) {
      toast.error("Vui lòng chọn lý do xuất");
      return;
    }
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await createExport(formData);
        if (res.ok) {
          toast.success("Đã xuất kho");
          formRef.current?.reset();
          setMaterialId("");
          setReason("");
          router.push("/");
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch (err) {
        toast.error("Có lỗi kết nối xảy ra");
      }
    });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border border-border bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground text-center">
            Xuất Hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="materialId" className="text-sm font-medium">Vật tư</Label>
              <MaterialSelect
                materials={materials}
                name="materialId"
                value={materialId}
                onChange={setMaterialId}
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="reason" className="text-sm font-medium">Lý do xuất</Label>
              <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Chọn lý do..." />
                </SelectTrigger>
                <SelectContent>
                  {OUT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="reason" value={reason} />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="quantity" className="text-sm font-medium">Số lượng</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                required
                className="h-10"
                placeholder="Nhập số lượng..."
              />
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
                {isPending ? "Đang xử lý..." : "Lưu phiếu xuất"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
