"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFundDocument, updateFundDocument } from "@/lib/actions/funds";
import type { FundDocumentKindValue, FundOption } from "@/lib/queries/funds";

interface FundLineState {
  id: string;
  amount: string;
  category: string;
  description: string;
  note: string;
}

interface InitialFundDocument {
  id: string;
  kind: FundDocumentKindValue;
  fundId: string;
  documentDate: Date | string;
  note: string | null;
  lines: Array<{
    id: string;
    amount: number;
    category: string;
    description: string;
    note: string | null;
  }>;
}

interface Props {
  funds: FundOption[];
  mode?: "create" | "edit";
  initialDocument?: InitialFundDocument;
}

function createLine(id = `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`): FundLineState {
  return { id, amount: "", category: "", description: "", note: "" };
}

function dateInputValue(value?: Date | string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function FundDocumentForm({ funds, mode = "create", initialDocument }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [kind, setKind] = React.useState<FundDocumentKindValue>(() => initialDocument?.kind ?? "RECEIPT");
  const [fundId, setFundId] = React.useState(() => initialDocument?.fundId ?? funds[0]?.id ?? "");
  const [documentDate, setDocumentDate] = React.useState(() => dateInputValue(initialDocument?.documentDate));
  const [lines, setLines] = React.useState<FundLineState[]>(() =>
    initialDocument?.lines.length
      ? initialDocument.lines.map((line) => ({
          id: line.id,
          amount: String(line.amount),
          category: line.category,
          description: line.description,
          note: line.note ?? "",
        }))
      : [createLine("line-1")]
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const isEdit = mode === "edit";
  const backHref = isEdit && initialDocument ? `/quy/${initialDocument.id}` : "/quy";

  function updateLine(id: string, patch: Partial<FundLineState>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, createLine()]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fundId) {
      toast.error("Vui lòng chọn quỹ");
      return;
    }

    const invalidLine = lines.find(
      (line) =>
        !line.amount ||
        Number(line.amount) <= 0 ||
        !line.category.trim() ||
        !line.description.trim()
    );
    if (invalidLine) {
      toast.error("Vui lòng nhập đủ nhóm, nội dung và số tiền lớn hơn 0 cho từng dòng");
      return;
    }

    const formData = new FormData(event.currentTarget);
    if (isEdit && initialDocument) formData.set("documentId", initialDocument.id);
    formData.set("kind", kind);
    formData.set("fundId", fundId);
    formData.set(
      "lines",
      JSON.stringify(
        lines.map((line) => ({
          amount: line.amount,
          category: line.category,
          description: line.description,
          note: line.note,
        }))
      )
    );

    startTransition(async () => {
      try {
        const result = isEdit ? await updateFundDocument(formData) : await createFundDocument(formData);
        if (result.ok) {
          toast.success(isEdit ? "Đã cập nhật phiếu quỹ" : "Đã tạo phiếu quỹ");
          if (!isEdit) {
            formRef.current?.reset();
            setKind("RECEIPT");
            setFundId(funds[0]?.id ?? "");
            setDocumentDate(dateInputValue());
            setLines([createLine("line-1")]);
          }
          router.push(isEdit && initialDocument ? `/quy/${initialDocument.id}` : "/quy");
          return;
        }
        toast.error(result.error ?? "Không thể lưu phiếu quỹ");
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-4xl border border-border bg-card/70 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-xl font-bold tracking-tight">
            {isEdit ? "Sửa Phiếu Quỹ" : "Lập Phiếu Quỹ"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="kind">Loại phiếu</Label>
                <select
                  id="kind"
                  name="kind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value as FundDocumentKindValue)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="RECEIPT">Phiếu thu</option>
                  <option value="PAYMENT">Phiếu chi</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentDate">Ngày chứng từ</Label>
                <Input
                  id="documentDate"
                  name="documentDate"
                  type="date"
                  required
                  value={documentDate}
                  onChange={(event) => setDocumentDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fundId">Quỹ</Label>
                <select
                  id="fundId"
                  name="fundId"
                  required
                  value={fundId}
                  onChange={(event) => setFundId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Chọn quỹ...</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name} ({fund.projectName ?? fund.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Dòng thu chi</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={isPending}>
                  <Plus className="size-4" />
                  Thêm dòng
                </Button>
              </div>
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid gap-3 rounded-md border border-border bg-background/70 p-3 lg:grid-cols-[130px_160px_minmax(0,1fr)_minmax(0,1fr)_36px] lg:items-end"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${line.id}`} className="text-xs text-muted-foreground">
                        Số tiền {index + 1}
                      </Label>
                      <Input
                        id={`amount-${line.id}`}
                        type="number"
                        min="0"
                        step="any"
                        value={line.amount}
                        onChange={(event) => updateLine(line.id, { amount: event.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`category-${line.id}`} className="text-xs text-muted-foreground">
                        Nhóm
                      </Label>
                      <Input
                        id={`category-${line.id}`}
                        value={line.category}
                        onChange={(event) => updateLine(line.id, { category: event.target.value })}
                        placeholder="VD: Nhân công"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`description-${line.id}`} className="text-xs text-muted-foreground">
                        Nội dung
                      </Label>
                      <Input
                        id={`description-${line.id}`}
                        value={line.description}
                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                        placeholder="Nội dung thu chi"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`note-${line.id}`} className="text-xs text-muted-foreground">
                        Ghi chú
                      </Label>
                      <Input
                        id={`note-${line.id}`}
                        value={line.note}
                        onChange={(event) => updateLine(line.id, { note: event.target.value })}
                        placeholder="Tùy chọn"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={isPending || lines.length === 1}
                      title="Xóa dòng"
                      aria-label={`Xóa dòng ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú phiếu</Label>
              <Input
                id="note"
                name="note"
                defaultValue={initialDocument?.note ?? ""}
                placeholder="Ghi chú chung..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(backHref)}
                disabled={isPending}
                className="flex-1"
              >
                Quay lại
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Đang xử lý..." : isEdit ? "Lưu thay đổi" : "Lưu phiếu quỹ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
