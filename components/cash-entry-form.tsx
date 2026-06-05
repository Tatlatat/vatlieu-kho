"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCashEntry } from "@/lib/actions/cash";
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Fund {
  id: string;
  name: string;
}

export function CashEntryForm({ funds, defaultFundId }: { funds: Fund[]; defaultFundId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [fundId, setFundId] = React.useState(defaultFundId);
  const [type, setType] = React.useState<"THU" | "CHI">("THU");
  const categories = type === "THU" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
  const [category, setCategory] = React.useState<string>(CASH_IN_CATEGORIES[0].value);
  const [amount, setAmount] = React.useState("");
  const [entryDate, setEntryDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState("");

  // Khi đổi loại THU/CHI → reset hạng mục về phần tử đầu của danh sách tương ứng.
  const handleTypeChange = (t: "THU" | "CHI") => {
    setType(t);
    setCategory((t === "THU" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES)[0].value);
  };

  // Hiển thị số tiền có dấu phân cách nghìn khi gõ.
  const amountNumber = Number(amount.replace(/[^\d]/g, "")) || 0;
  const handleAmount = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    setAmount(digits ? Number(digits).toLocaleString("vi-VN") : "");
  };

  const handleSubmit = () => {
    if (amountNumber <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    if (!fundId) {
      toast.error("Vui lòng chọn quỹ");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createCashEntry({
          fundId,
          type,
          category,
          amount: amountNumber,
          entryDate,
          note: note.trim() || undefined,
        });
        if (res.ok) {
          if (res.warning) toast.warning(res.warning);
          toast.success(`Đã lập phiếu ${type === "THU" ? "thu" : "chi"} thành công`);
          router.push(`/quy?fund=${fundId}`);
          router.refresh();
        } else {
          toast.error(res.error || "Lỗi lập phiếu");
        }
      } catch (e) {
        toast.error("Lỗi hệ thống: " + (e as Error).message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fund">Quỹ <span className="text-destructive">*</span></Label>
            <select
              id="fund"
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Loại phiếu <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("THU")}
                className={`h-10 flex-1 rounded-md border text-sm font-medium transition-colors ${type === "THU" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-input text-slate-600 hover:bg-slate-50"}`}
              >
                Thu (tiền vào)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("CHI")}
                className={`h-10 flex-1 rounded-md border text-sm font-medium transition-colors ${type === "CHI" ? "border-red-500 bg-red-50 text-red-700" : "border-input text-slate-600 hover:bg-slate-50"}`}
              >
                Chi (tiền ra)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Hạng mục <span className="text-destructive">*</span></Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền (đ) <span className="text-destructive">*</span></Label>
            <Input
              id="amount"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmount(e.target.value)}
              className="h-10 text-right font-semibold tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryDate">Ngày <span className="text-destructive">*</span></Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="note">Diễn giải</Label>
            <Input
              id="note"
              placeholder="Nội dung thu/chi (vd: mua xi măng đợt 2, ứng vốn tháng 6...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push("/quy")}>
            Hủy bỏ
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Đang xử lý..." : "Lập phiếu"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
