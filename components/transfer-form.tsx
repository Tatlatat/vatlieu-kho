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
import { updateInventoryDocument } from "@/lib/actions/documents";
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

interface DocumentLineState {
  id: string;
  materialId: string;
  quantity: string;
}

interface InitialDocument {
  id: string;
  documentDate: Date | string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  note: string | null;
  lines: Array<{
    id: string;
    materialId: string;
    quantity: number;
  }>;
}

interface TransferFormProps {
  materials: Material[];
  warehouses: Warehouse[];
  mode?: "create" | "edit";
  initialDocument?: InitialDocument;
}

function createLine(id = `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`): DocumentLineState {
  return { id, materialId: "", quantity: "" };
}

function dateInputValue(value?: Date | string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function TransferForm({
  materials,
  warehouses,
  mode = "create",
  initialDocument,
}: TransferFormProps) {
  const router = useRouter();
  const [lines, setLines] = React.useState<DocumentLineState[]>(() =>
    initialDocument?.lines.length
      ? initialDocument.lines.map((line) => ({
          id: line.id,
          materialId: line.materialId,
          quantity: String(line.quantity),
        }))
      : [createLine("line-1")]
  );
  const [documentDate, setDocumentDate] = React.useState(() => dateInputValue(initialDocument?.documentDate));
  const [fromWarehouseId, setFromWarehouseId] = React.useState(
    () => initialDocument?.fromWarehouseId ?? warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""
  );
  const [toWarehouseId, setToWarehouseId] = React.useState(initialDocument?.toWarehouseId ?? "");
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const isEdit = mode === "edit";
  const backHref = isEdit && initialDocument ? `/phieu/${initialDocument.id}` : "/chuyen-kho";

  const updateLine = (id: string, patch: Partial<DocumentLineState>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((current) => [...current, createLine()]);

  const removeLine = (id: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    const invalidLine = lines.find((line) => !line.materialId || !line.quantity || Number(line.quantity) <= 0);
    if (invalidLine) {
      toast.error("Vui lòng nhập đủ vật tư và số lượng lớn hơn 0 cho từng dòng");
      return;
    }
    const formData = new FormData(e.currentTarget);
    if (isEdit && initialDocument) {
      formData.set("documentId", initialDocument.id);
    }
    formData.set(
      "lines",
      JSON.stringify(lines.map((line) => ({ materialId: line.materialId, quantity: line.quantity })))
    );

    startTransition(async () => {
      try {
        const res = isEdit ? await updateInventoryDocument(formData) : await createTransfer(formData);
        if (res.ok) {
          toast.success(isEdit ? "Đã cập nhật phiếu chuyển" : "Đã chuyển kho");
          if (!isEdit) {
            formRef.current?.reset();
            setLines([createLine("line-1")]);
            setToWarehouseId("");
            setDocumentDate(dateInputValue());
          }
          router.push(isEdit && initialDocument ? `/phieu/${initialDocument.id}` : "/chuyen-kho");
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
            {isEdit ? "Sửa Phiếu Chuyển Kho" : "Chuyển Kho"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="documentDate" className="text-sm font-medium">Ngày chuyển</Label>
              <Input
                id="documentDate"
                name="documentDate"
                type="date"
                required
                value={documentDate}
                onChange={(event) => setDocumentDate(event.target.value)}
                className="h-10"
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
                defaultValue={initialDocument?.note ?? ""}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(backHref)}
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
                {isPending ? "Đang xử lý..." : isEdit ? "Lưu thay đổi" : "Lưu phiếu chuyển"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
