"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { updateStocktakeItem, approveStocktake } from "@/lib/actions/stocktake";
import { toast } from "sonner";

interface StocktakeItemDetail {
  id: string;
  countedQty: number;
  systemQty: number;
  diff: number;
  material: {
    name: string;
    code: string;
    unit: string;
  };
}

interface Stocktake {
  id: string;
  code: string;
  status: "DRAFT" | "APPROVED";
  items: StocktakeItemDetail[];
}

interface StocktakeDetailProps {
  stocktake: Stocktake;
  role: "OWNER" | "STAFF";
}

export function StocktakeDetail({ stocktake, role }: StocktakeDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleBlur = (itemId: string, originalVal: number, valueStr: string) => {
    const value = parseFloat(valueStr);
    if (isNaN(value) || value < 0) {
      toast.error("Số lượng không hợp lệ");
      return;
    }
    if (value === originalVal) return;

    startTransition(async () => {
      try {
        const res = await updateStocktakeItem(itemId, value);
        if (res.ok) {
          toast.success("Đã cập nhật số lượng thực tế");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể cập nhật số lượng");
        }
      } catch {
        toast.error("Lỗi kết nối mạng");
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await approveStocktake(stocktake.id);
        if (res.ok) {
          toast.success("Đã duyệt — hao hụt đã được ghi nhận", {
            description: "Xem thống kê hao hụt trong trang Báo cáo.",
            action: {
              label: "Xem Báo cáo",
              onClick: () => router.push("/bao-cao"),
            },
            duration: 8000,
          });
          router.refresh();
        } else {
          toast.error(res.error || "Không thể duyệt phiếu");
        }
      } catch {
        toast.error("Lỗi kết nối mạng");
      }
    });
  };

  const totalLoss = stocktake.items.reduce(
    (sum, item) => sum + (item.diff < 0 ? -item.diff : 0),
    0
  );

  const isDraft = stocktake.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vật liệu</TableHead>
              <TableHead>Tồn sổ</TableHead>
              <TableHead className="w-[180px]">Số đếm thực tế</TableHead>
              <TableHead className="text-right">Chênh lệch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocktake.items.map((item) => {
              const isNegative = item.diff < 0;
              const isPositive = item.diff > 0;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">
                      {item.material.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.material.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.systemQty} <span className="text-xs text-muted-foreground">{item.material.unit}</span>
                  </TableCell>
                  <TableCell>
                    {isDraft ? (
                      <Input
                        type="number"
                        step="any"
                        defaultValue={item.countedQty}
                        disabled={isPending}
                        onBlur={(e) =>
                          handleBlur(item.id, item.countedQty, e.target.value)
                        }
                        className="h-9 w-32 font-medium"
                      />
                    ) : (
                      <span className="font-semibold">
                        {item.countedQty} <span className="text-xs text-muted-foreground font-normal">{item.material.unit}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {isNegative && (
                      <span className="text-destructive font-semibold">
                        {item.diff} (Hao hụt {Math.abs(item.diff)})
                      </span>
                    )}
                    {isPositive && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{item.diff}
                      </span>
                    )}
                    {item.diff === 0 && <span className="text-muted-foreground">0</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t pt-6 gap-4">
        <div>
          {!isDraft ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-destructive">
                Tổng hao hụt: -{totalLoss}
              </p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Phiếu đã duyệt, đã ghi nhận vào kho.
              </p>
              <Link
                href="/bao-cao"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Xem hao hụt trong Báo cáo
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              * Thay đổi số đếm thực tế và nhấn chuột ra ngoài để tự động lưu.
            </p>
          )}
        </div>

        {role === "OWNER" && isDraft && (
          <Button
            onClick={handleApprove}
            disabled={isPending}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
          >
            {isPending ? "Đang xử lý..." : "Duyệt phiếu"}
          </Button>
        )}
      </div>
    </div>
  );
}
