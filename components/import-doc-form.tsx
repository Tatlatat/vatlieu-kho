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
import { IN_REASONS } from "@/lib/validation";
import { DocumentEquipmentLineEditor, type EquipmentLineItem } from "@/components/document-equipment-line-editor";

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

interface Supplier {
  id: string;
  name: string;
}

interface EquipmentOption {
  id: string;
  code?: string | null;
  name: string;
  type?: string | null;
  plateNo?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface ImportDocFormProps {
  materials: Material[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  equipment: EquipmentOption[];
  projects: ProjectOption[];
}

export function ImportDocForm({ materials, warehouses, suppliers, equipment, projects }: ImportDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const defaultWarehouseId = React.useMemo(() => {
    return warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
  }, [warehouses]);

  const [warehouseId, setWarehouseId] = React.useState(defaultWarehouseId);
  const [supplierId, setSupplierId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [docDate, setDocDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState<string>(IN_REASONS[0].value);

  // Lazy initializer: tạo 1 dòng trống lúc mount (không dùng effect/Math.random — lint cấm).
  const [lines, setLines] = React.useState<LineItem[]>(() => [
    { materialId: "", quantity: "", note: "", _key: crypto.randomUUID() },
  ]);
  const [equipmentLines, setEquipmentLines] = React.useState<EquipmentLineItem[]>([]);

  const handleSubmit = async (submitType: "DRAFT" | "POST") => {
    // Filter and validate lines
    const validLines = lines
      .filter((l) => l.materialId && l.quantity && Number(l.quantity) > 0)
      .map((l) => ({
        materialId: l.materialId,
        quantity: Number(l.quantity),
        note: l.note || undefined,
      }));
    const validEquipmentLines = equipmentLines
      .filter((l) => l.equipmentId && l.hours && Number(l.hours) > 0)
      .map((l) => ({
        equipmentId: l.equipmentId,
        hours: Number(l.hours),
        projectId: l.projectId || undefined,
        note: l.note || undefined,
      }));

    if (validLines.length === 0 && validEquipmentLines.length === 0) {
      toast.error("Phiếu phải có ít nhất 1 dòng vật tư hoặc xe/máy hợp lệ");
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
          supplierId: supplierId || undefined,
          docDate,
          reason,
          note: note.trim() || undefined,
          lines: validLines,
          equipmentLines: validEquipmentLines,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <Label htmlFor="supplier">Nhà cung cấp (tùy chọn)</Label>
            <div className="relative w-full">
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Chọn nhà cung cấp...">
                    {suppliers.find((s) => s.id === supplierId)?.name || "Chọn nhà cung cấp..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Không chọn —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="docDate">Ngày nhập <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="reason">Lý do nhập <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
              <SelectTrigger id="reason" className="w-full h-10">
                <SelectValue placeholder="Chọn lý do nhập...">
                  {() => IN_REASONS.find((r) => r.value === reason)?.label ?? "Chọn lý do nhập..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {IN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-2">
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

        <DocumentEquipmentLineEditor
          equipment={equipment}
          projects={projects}
          lines={equipmentLines}
          onChange={setEquipmentLines}
          disabled={isPending}
        />

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
