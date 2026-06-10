"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { SearchableMaterialSelect } from "@/components/searchable-material-select";
import { WarehouseSelect } from "@/components/warehouse-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateInventoryDocument } from "@/lib/actions/documents";
import { createExport } from "@/lib/actions/movements";
import { formatNormWarningQuantity } from "@/lib/projects/norm-warning-format";
import type { ProjectNormWarning } from "@/lib/projects/norm-warnings";
import type { ProjectOption } from "@/lib/queries/projects";
import { OUT_REASONS } from "@/lib/validation";
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
  projectId: string;
  workItemId: string;
}

interface InitialDocument {
  id: string;
  documentDate: Date | string;
  warehouseId: string | null;
  reason: string | null;
  note: string | null;
  lines: Array<{
    id: string;
    materialId: string;
    projectId: string | null;
    workItemId: string | null;
    quantity: number;
  }>;
}

interface ExportFormProps {
  materials: Material[];
  warehouses: Warehouse[];
  projects?: ProjectOption[];
  mode?: "create" | "edit";
  initialDocument?: InitialDocument;
}

function createLine(id = `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`): DocumentLineState {
  return { id, materialId: "", quantity: "", projectId: "", workItemId: "" };
}

function dateInputValue(value?: Date | string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function ExportForm({
  materials,
  warehouses,
  projects = [],
  mode = "create",
  initialDocument,
}: ExportFormProps) {
  const router = useRouter();
  const [lines, setLines] = React.useState<DocumentLineState[]>(() =>
    initialDocument?.lines.length
      ? initialDocument.lines.map((line) => ({
          id: line.id,
          materialId: line.materialId,
          quantity: String(line.quantity),
          projectId: line.projectId ?? "",
          workItemId: line.workItemId ?? "",
        }))
      : [createLine("line-1")]
  );
  const [documentDate, setDocumentDate] = React.useState(() => dateInputValue(initialDocument?.documentDate));
  const [reason, setReason] = React.useState(initialDocument?.reason ?? "");
  const [warehouseId, setWarehouseId] = React.useState(
    () => initialDocument?.warehouseId ?? warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""
  );
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const pendingFormDataRef = React.useRef<FormData | null>(null);
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [pendingWarnings, setPendingWarnings] = React.useState<ProjectNormWarning[]>([]);
  const isEdit = mode === "edit";
  const backHref = isEdit && initialDocument ? `/phieu/${initialDocument.id}` : "/xuat";

  const updateLine = (id: string, patch: Partial<DocumentLineState>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const updateLineProject = (id: string, projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    const defaultWorkItemId = project?.workItems.find((item) => item.isDefault)?.id ?? project?.workItems[0]?.id ?? "";
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, projectId, workItemId: defaultWorkItemId } : line))
    );
    if (project?.warehouseId) {
      setWarehouseId(project.warehouseId);
    }
  };

  const addLine = () => setLines((current) => [...current, createLine()]);

  const removeLine = (id: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  };

  const buildFormData = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    if (isEdit && initialDocument) {
      formData.set("documentId", initialDocument.id);
    }
    formData.set(
      "lines",
      JSON.stringify(
        lines.map((line) => ({
          materialId: line.materialId,
          quantity: line.quantity,
          projectId: line.projectId || undefined,
          workItemId: line.workItemId || undefined,
        }))
      )
    );
    formData.delete("allowOverNorm");
    return formData;
  };

  const submitFormData = (formData: FormData) => {
    startTransition(async () => {
      try {
        const res = isEdit ? await updateInventoryDocument(formData) : await createExport(formData);
        if (res.ok) {
          pendingFormDataRef.current = null;
          setPendingWarnings([]);
          setWarningOpen(false);
          toast.success(isEdit ? "Đã cập nhật phiếu xuất" : "Đã xuất kho");
          if (!isEdit) {
            formRef.current?.reset();
            setLines([createLine("line-1")]);
            setReason("");
            setDocumentDate(dateInputValue());
          }
          router.push(isEdit && initialDocument ? `/phieu/${initialDocument.id}` : "/xuat");
        } else if (res.code === "OVER_NORM_WARNING" && res.normWarnings?.length) {
          pendingFormDataRef.current = formData;
          setPendingWarnings(res.normWarnings);
          setWarningOpen(true);
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Có lỗi kết nối xảy ra");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho");
      return;
    }
    if (!reason) {
      toast.error("Vui lòng chọn lý do xuất");
      return;
    }
    const invalidLine = lines.find((line) => !line.materialId || !line.quantity || Number(line.quantity) <= 0);
    if (invalidLine) {
      toast.error("Vui lòng nhập đủ vật tư và số lượng lớn hơn 0 cho từng dòng");
      return;
    }
    setPendingWarnings([]);
    setWarningOpen(false);
    pendingFormDataRef.current = null;
    submitFormData(buildFormData(e.currentTarget));
  };

  const confirmOverNorm = () => {
    const pendingFormData = pendingFormDataRef.current;
    if (!pendingFormData) return;
    const confirmedFormData = new FormData();
    for (const [key, value] of pendingFormData.entries()) {
      confirmedFormData.append(key, value);
    }
    confirmedFormData.set("allowOverNorm", "true");
    setWarningOpen(false);
    submitFormData(confirmedFormData);
  };

  const cancelOverNorm = () => {
    pendingFormDataRef.current = null;
    setPendingWarnings([]);
    setWarningOpen(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-lg border border-border bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground text-center">
            {isEdit ? "Sửa Phiếu Xuất" : "Xuất Hàng"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="documentDate" className="text-sm font-medium">Ngày xuất</Label>
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
              <Label className="text-sm font-medium">Kho</Label>
              <WarehouseSelect
                warehouses={warehouses}
                name="warehouseId"
                value={warehouseId}
                onChange={setWarehouseId}
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="reason" className="text-sm font-medium">Lý do xuất</Label>
              <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Chọn lý do...">
                    {OUT_REASONS.find((r) => r.value === reason)?.label ?? null}
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
              <input type="hidden" name="reason" value={reason} />
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
                  const selectedProject = projects.find((project) => project.id === line.projectId);
                  return (
                    <div
                      key={line.id}
                      className="grid gap-3 rounded-md border border-border bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_150px_180px_160px_36px] md:items-end"
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
                        <Label className="text-xs text-muted-foreground">Công trình</Label>
                        <Select
                          value={line.projectId || "__none__"}
                          onValueChange={(value) => {
                            const nextValue = value ?? "__none__";
                            updateLineProject(line.id, nextValue === "__none__" ? "" : nextValue);
                          }}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Chọn CT...">
                              {selectedProject?.name ?? "Không gắn"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Không gắn</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Hạng mục</Label>
                        <Select
                          value={line.workItemId || "__none__"}
                          onValueChange={(value) => {
                            const nextValue = value ?? "__none__";
                            updateLine(line.id, { workItemId: nextValue === "__none__" ? "" : nextValue });
                          }}
                          disabled={!selectedProject}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Chọn HM...">
                              {selectedProject?.workItems.find((item) => item.id === line.workItemId)?.name ?? "Chung"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Chung</SelectItem>
                            {selectedProject?.workItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                {isPending ? "Đang xử lý..." : isEdit ? "Lưu thay đổi" : "Lưu phiếu xuất"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Vượt định mức công trình
            </DialogTitle>
            <DialogDescription>
              Một số dòng xuất sẽ làm thực tế sử dụng vượt định mức đã nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {pendingWarnings.map((warning) => (
              <div
                key={`${warning.workItemId}-${warning.materialId}`}
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{warning.materialName}</div>
                    <div className="text-xs text-muted-foreground">
                      {warning.projectName} / {warning.workItemName}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-destructive">
                    +{formatNormWarningQuantity(warning.overQty, warning.materialUnit)}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <div>
                    <div>Định mức</div>
                    <div className="font-medium text-foreground">
                      {formatNormWarningQuantity(warning.normQty, warning.materialUnit)}
                    </div>
                  </div>
                  <div>
                    <div>Đã xuất</div>
                    <div className="font-medium text-foreground">
                      {formatNormWarningQuantity(warning.usedQty, warning.materialUnit)}
                    </div>
                  </div>
                  <div>
                    <div>Phiếu này</div>
                    <div className="font-medium text-foreground">
                      {formatNormWarningQuantity(warning.plannedQty, warning.materialUnit)}
                    </div>
                  </div>
                  <div>
                    <div>Sau ghi sổ</div>
                    <div className="font-medium text-foreground">
                      {formatNormWarningQuantity(warning.totalQty, warning.materialUnit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelOverNorm} disabled={isPending}>
              Quay lại sửa
            </Button>
            <Button type="button" onClick={confirmOverNorm} disabled={isPending}>
              Vẫn ghi sổ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
