"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { SearchableMaterialSelect } from "@/components/searchable-material-select";
import { WarehouseSelect } from "@/components/warehouse-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createImport } from "@/lib/actions/movements";
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

interface DocumentLineState {
  id: string;
  materialId: string;
  quantity: string;
}

function createLine(id = `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`): DocumentLineState {
  return { id, materialId: "", quantity: "" };
}

export function ImportForm({ materials, warehouses }: { materials: Material[]; warehouses: Warehouse[] }) {
  const router = useRouter();
  const [lines, setLines] = React.useState<DocumentLineState[]>(() => [createLine("line-1")]);
  const [warehouseId, setWarehouseId] = React.useState(
    () => warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""
  );
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const updateLine = (id: string, patch: Partial<DocumentLineState>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((current) => [...current, createLine()]);

  const removeLine = (id: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho");
      return;
    }
    const invalidLine = lines.find((line) => !line.materialId || !line.quantity || Number(line.quantity) <= 0);
    if (invalidLine) {
      toast.error("Vui lòng nhập đủ vật tư và số lượng lớn hơn 0 cho từng dòng");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set(
      "lines",
      JSON.stringify(lines.map((line) => ({ materialId: line.materialId, quantity: line.quantity })))
    );

    startTransition(async () => {
      try {
        const res = await createImport(formData);
        if (res.ok) {
          toast.success("Đã nhập kho");
          formRef.current?.reset();
          setLines([createLine("line-1")]);
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
      <Card className="w-full max-w-3xl shadow-lg border border-border bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground text-center">
            Nhập Kho Vật Tư
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium">Kho</Label>
              <WarehouseSelect
                warehouses={warehouses}
                name="warehouseId"
                value={warehouseId}
                onChange={setWarehouseId}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Dòng vật tư</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={isPending}>
                  <Plus className="size-4" />
                  Thêm dòng
                </Button>
              </div>
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const selectedMaterial = materials.find((m) => m.id === line.materialId);
                  return (
                    <div
                      key={line.id}
                      className="grid gap-3 rounded-md border border-border bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_160px_36px] md:items-end"
                    >
                      <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Vật tư {index + 1}</Label>
                        <SearchableMaterialSelect
                          materials={materials}
                          name={`materialId-${line.id}`}
                          value={line.materialId}
                          onChange={(value) => updateLine(line.id, { materialId: value })}
                        />
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <Label htmlFor={`quantity-${line.id}`} className="text-xs text-muted-foreground">
                          Số lượng
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`quantity-${line.id}`}
                            name={`quantity-${line.id}`}
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={line.quantity}
                            onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                            className="h-10 flex-1"
                            placeholder="0"
                          />
                          <span className="w-12 shrink-0 text-sm text-muted-foreground">
                            {selectedMaterial?.unit ?? ""}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={isPending || lines.length === 1}
                        aria-label={`Xóa dòng ${index + 1}`}
                        title="Xóa dòng"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
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
                {isPending ? "Đang xử lý..." : "Lưu phiếu nhập"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
