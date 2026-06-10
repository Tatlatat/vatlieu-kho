"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createOpeningBalanceDocument } from "@/lib/actions/opening";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function todayInputValue() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function OpeningImportForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [documentDate, setDocumentDate] = React.useState(todayInputValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createOpeningBalanceDocument(formData);
      if (result.ok) {
        toast.success(`Đã import ${result.lineCount ?? 0} dòng vào ${result.documentCount ?? 0} phiếu đầu kỳ`);
        formRef.current?.reset();
        setDocumentDate(todayInputValue());
        router.push("/bao-cao");
        router.refresh();
      } else {
        toast.error(result.error ?? "Không import được tồn đầu kỳ");
      }
    });
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Import tồn đầu kỳ</h1>
        <p className="text-sm text-muted-foreground">
          File Excel cần có mã kho, mã vật tư và số lượng. Hệ thống sẽ tạo phiếu đầu kỳ đã ghi sổ theo từng kho.
        </p>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">File tồn đầu kỳ</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="documentDate">Ngày đầu kỳ</Label>
              <Input
                id="documentDate"
                name="documentDate"
                type="date"
                value={documentDate}
                onChange={(event) => setDocumentDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">File Excel</Label>
              <Input id="file" name="file" type="file" accept=".xlsx,.xls" required />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input id="note" name="note" placeholder="Ví dụ: Tồn đầu kỳ demo tháng 6" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending}>
                <Upload className="size-4" />
                {isPending ? "Đang import..." : "Import tồn đầu kỳ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cột Excel cần có</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã kho</TableHead>
                <TableHead>Mã vật tư</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">KHO-A</TableCell>
                <TableCell className="font-mono text-xs">XM-PC40</TableCell>
                <TableCell className="text-right tabular-nums">12.5</TableCell>
                <TableCell>Tồn demo</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
