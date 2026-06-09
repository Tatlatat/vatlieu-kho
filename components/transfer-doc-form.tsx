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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TRANSFER_REASONS } from "@/lib/validation";

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

interface Approver {
  id: string;
  name: string;
  email: string | null;
}

interface TransferDocFormProps {
  materials: Material[];
  warehouses: Warehouse[];
  currentUser: { id: string; role: "ADMIN" | "MANAGER" | "KEEPER" };
  approvers: Approver[];
}

export function TransferDocForm({ materials, warehouses, currentUser, approvers }: TransferDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [fromWarehouseId, setFromWarehouseId] = React.useState(warehouses[0]?.id || "");
  const [toWarehouseId, setToWarehouseId] = React.useState(
    warehouses.length > 1 ? warehouses[1]?.id : warehouses[0]?.id || ""
  );
  const [note, setNote] = React.useState("");
  const [docDate, setDocDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState<string>(TRANSFER_REASONS[0].value);
  const [requestedApproverId, setRequestedApproverId] = React.useState("");

  // Lazy initializer: tạo 1 dòng trống lúc mount (không dùng effect/Math.random — lint cấm).
  const [lines, setLines] = React.useState<LineItem[]>(() => [
    { materialId: "", quantity: "", note: "", _key: crypto.randomUUID() },
  ]);

  const handleSubmit = async (submitType: "DRAFT" | "SUBMIT") => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Vui lòng chọn đầy đủ kho nguồn và kho đích");
      return;
    }
    if (submitType === "SUBMIT" && currentUser.role !== "ADMIN" && !requestedApproverId) {
      toast.error("Vui lòng chọn thủ kho đích duyệt phiếu");
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
          docDate,
          reason,
          requestedApproverId: currentUser.role === "ADMIN" ? undefined : requestedApproverId || undefined,
          note: note.trim() || undefined,
          lines: validLines,
          equipmentLines: [],
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
            toast.success(currentUser.role === "ADMIN" ? "Đã lập phiếu chuyển kho thành công" : "Đã lưu & gửi duyệt phiếu chuyển kho thành công");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <Label htmlFor="docDate">Ngày chuyển <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="reason">Lý do chuyển <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
              <SelectTrigger id="reason" className="w-full h-10">
                <SelectValue placeholder="Chọn lý do chuyển...">
                  {() => TRANSFER_REASONS.find((r) => r.value === reason)?.label ?? "Chọn lý do chuyển..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_REASONS.map((r) => (
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
          {currentUser.role !== "ADMIN" && (
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="requestedApproverId">Thủ kho đích duyệt <span className="text-destructive">*</span></Label>
              <Select value={requestedApproverId} onValueChange={(v) => setRequestedApproverId(v ?? "")}>
                <SelectTrigger id="requestedApproverId" className="w-full h-10">
                  <SelectValue placeholder="Chọn thủ kho nhận và duyệt">
                    {approvers.find((a) => a.id === requestedApproverId)?.name || "Chọn thủ kho nhận và duyệt"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {approvers
                    .filter((approver) => approver.id !== currentUser.id)
                    .map((approver) => (
                      <SelectItem key={approver.id} value={approver.id}>
                        {approver.name}{approver.email ? ` (${approver.email})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {approvers.filter((approver) => approver.id !== currentUser.id).length === 0 && (
                <p className="text-sm text-amber-600">Không có thủ kho đích khả dụng để duyệt phiếu.</p>
              )}
            </div>
          )}
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
            className={currentUser.role === "ADMIN" ? "bg-green-600 hover:bg-green-700" : undefined}
            disabled={isPending || (currentUser.role !== "ADMIN" && approvers.filter((approver) => approver.id !== currentUser.id).length === 0)}
            onClick={() => handleSubmit("SUBMIT")}
          >
            {isPending ? "Đang xử lý..." : currentUser.role === "ADMIN" ? "Lưu & Lập phiếu" : "Lưu & Gửi thủ kho đích duyệt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
