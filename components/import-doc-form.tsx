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
import { saveDraft, postDocument } from "@/lib/actions/documents";

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

interface ImportDocFormProps {
  materials: Material[];
  warehouses: Warehouse[];
}

export function ImportDocForm({ materials, warehouses }: ImportDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const defaultWarehouseId = React.useMemo(() => {
    return warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
  }, [warehouses]);

  const [warehouseId, setWarehouseId] = React.useState(defaultWarehouseId);
  const [note, setNote] = React.useState("");

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
      toast.error("Vui lòng chọn kho nhập");
      return;
    }

    startTransition(async () => {
      try {
        const draftResult = await saveDraft({
          type: "IN",
          warehouseId,
          note: note.trim() || undefined,
          lines: validLines,
        });

        if (!draftResult.ok) {
          toast.error(draftResult.error || "Lỗi lưu nháp phiếu nhập");
          return;
        }

        const docId = draftResult.id;
        if (!docId) {
          toast.error("Không nhận được mã phiếu nháp");
          return;
        }

        if (submitType === "DRAFT") {
          toast.success("Đã lưu nháp phiếu nhập thành công");
          router.push("/nhap");
          router.refresh();
        } else {
          // POST
          const postResult = await postDocument(docId);
          if (postResult.ok) {
            toast.success("Đã lập phiếu nhập thành công");
            router.push("/nhap");
            router.refresh();
          } else {
            toast.error(postResult.error || "Lỗi lập phiếu nhập");
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
        <CardTitle className="text-lg">Chi tiết phiếu nhập</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="warehouse">Kho nhập <span className="text-destructive">*</span></Label>
            <WarehouseSelect
              warehouses={warehouses}
              name="warehouseId"
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder="Chọn kho nhập..."
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
          <Label>Danh sách vật tư nhập</Label>
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
            onClick={() => router.push("/nhap")}
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
