"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WarehouseSelect } from "@/components/warehouse-select";
import { DocumentLineEditor, type LineItem } from "@/components/document-line-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { saveDraft, postDocument } from "@/lib/actions/documents";
import { OUT_REASONS } from "@/lib/validation";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isDefault?: boolean;
}

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface ExportDocFormProps {
  materials: Material[];
  warehouses: Warehouse[];
}

export function ExportDocForm({ materials, warehouses }: ExportDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const defaultWarehouseId = React.useMemo(() => {
    return warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
  }, [warehouses]);

  const [warehouseId, setWarehouseId] = React.useState(defaultWarehouseId);
  const [reason, setReason] = React.useState<string>(OUT_REASONS[0].value);
  const [note, setNote] = React.useState("");
  const [docDate, setDocDate] = React.useState(() => new Date().toISOString().slice(0, 10));

  // Lazy initializer: tạo 1 dòng trống lúc mount (không dùng effect/Math.random — lint cấm).
  const [lines, setLines] = React.useState<LineItem[]>(() => [
    { materialId: "", quantity: "", note: "", _key: crypto.randomUUID() },
  ]);

  const handleSubmit = async (submitType: "DRAFT" | "POST") => {
    // Filter and validate lines
    const validLines = lines
      .filter((l) => l.materialId && l.quantity && Number(l.quantity) > 0)
      .map((l) => ({
        materialId: l.materialId,
        quantity: Number(l.quantity),
        note: l.note || undefined,
      }));

    if (validLines.length === 0) {
      toast.error("Phiếu phải có ít nhất 1 dòng với số lượng lớn hơn 0");
      return;
    }

    if (!warehouseId) {
      toast.error("Vui lòng chọn kho xuất");
      return;
    }

    if (!reason) {
      toast.error("Vui lòng chọn lý do xuất");
      return;
    }

    startTransition(async () => {
      try {
        const draftResult = await saveDraft({
          type: "OUT",
          warehouseId,
          reason,
          docDate,
          note: note.trim() || undefined,
          lines: validLines,
        });

        if (!draftResult.ok) {
          toast.error(draftResult.error || "Lỗi lưu nháp phiếu xuất");
          return;
        }

        const docId = draftResult.id;
        if (!docId) {
          toast.error("Không nhận được mã phiếu nháp");
          return;
        }

        if (submitType === "DRAFT") {
          toast.success("Đã lưu nháp phiếu xuất thành công");
          router.push("/xuat");
          router.refresh();
        } else {
          // POST
          const postResult = await postDocument(docId);
          if (postResult.ok) {
            toast.success("Đã lập phiếu xuất thành công");
            router.push("/xuat");
            router.refresh();
          } else {
            toast.error(postResult.error || "Lỗi lập phiếu xuất");
          }
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi hệ thống: " + (error as Error).message);
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Chi tiết phiếu xuất</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="warehouse">Kho xuất <span className="text-destructive">*</span></Label>
            <WarehouseSelect
              warehouses={warehouses}
              name="warehouseId"
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder="Chọn kho xuất..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do xuất <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
              <SelectTrigger id="reason" className="w-full h-10">
                <SelectValue placeholder="Chọn lý do xuất...">
                  {() => OUT_REASONS.find((r) => r.value === reason)?.label ?? "Chọn lý do xuất..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {OUT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="docDate">Ngày xuất <span className="text-destructive">*</span></Label>
            <Input
              id="docDate"
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="h-10"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú phiếu</Label>
            <Input
              id="note"
              type="text"
              placeholder="Nhập ghi chú cho cả phiếu..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Danh sách vật tư xuất</Label>
          <DocumentLineEditor
            materials={materials}
            lines={lines}
            onChange={setLines}
            disabled={isPending}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => router.push("/xuat")}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleSubmit("DRAFT")}
          >
            Lưu nháp
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("POST")}
          >
            {isPending ? "Đang xử lý..." : "Lưu & Lập phiếu"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
