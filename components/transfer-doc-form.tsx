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
import { saveDraft } from "@/lib/actions/documents";
import { submitTransferForApproval } from "@/lib/actions/transfer-approve";

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

interface TransferDocFormProps {
  materials: Material[];
  warehouses: Warehouse[];
}

export function TransferDocForm({ materials, warehouses }: TransferDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [fromWarehouseId, setFromWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [toWarehouseId, setToWarehouseId] = React.useState(
    warehouses.length > 1 ? warehouses[1]?.id : warehouses[0]?.id || ""
  );
  const [note, setNote] = React.useState("");

  // Lazy initializer: tạo 1 dòng trống lúc mount (không dùng effect/Math.random — lint cấm).
  const [lines, setLines] = React.useState<LineItem[]>(() => [
    { materialId: "", quantity: "", note: "", _key: crypto.randomUUID() },
  ]);

  const handleSubmit = async (submitType: "DRAFT" | "SUBMIT") => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Vui lòng chọn đầy đủ kho nguồn và kho đích");
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast.error("Kho nguồn và kho đích phải khác nhau");
      return;
    }

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

    startTransition(async () => {
      try {
        const draftResult = await saveDraft({
          type: "TRANSFER",
          fromWarehouseId,
          toWarehouseId,
          note: note.trim() || undefined,
          lines: validLines,
        });

        if (!draftResult.ok) {
          toast.error(draftResult.error || "Lỗi lưu nháp phiếu chuyển kho");
          return;
        }

        const docId = draftResult.id;
        if (!docId) {
          toast.error("Không nhận được mã phiếu nháp");
          return;
        }

        if (submitType === "DRAFT") {
          toast.success("Đã lưu nháp phiếu chuyển kho thành công");
          router.push("/chuyen-kho");
          router.refresh();
        } else {
          // SUBMIT FOR APPROVAL
          const submitResult = await submitTransferForApproval(docId);
          if (submitResult.ok) {
            toast.success("Đã lưu & gửi duyệt phiếu chuyển kho thành công");
            router.push("/chuyen-kho");
            router.refresh();
          } else {
            toast.error(submitResult.error || "Lỗi gửi duyệt phiếu chuyển kho");
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
        <CardTitle className="text-lg">Chi tiết phiếu chuyển kho</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromWarehouse">Kho nguồn <span className="text-destructive">*</span></Label>
            <WarehouseSelect
              warehouses={warehouses}
              name="fromWarehouseId"
              value={fromWarehouseId}
              onChange={setFromWarehouseId}
              placeholder="Chọn kho nguồn..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toWarehouse">Kho đích <span className="text-destructive">*</span></Label>
            <WarehouseSelect
              warehouses={warehouses}
              name="toWarehouseId"
              value={toWarehouseId}
              onChange={setToWarehouseId}
              placeholder="Chọn kho đích..."
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
          <Label>Danh sách vật tư chuyển</Label>
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
            onClick={() => router.push("/chuyen-kho")}
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
            onClick={() => handleSubmit("SUBMIT")}
          >
            {isPending ? "Đang xử lý..." : "Lưu & Gửi duyệt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
