"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createStocktake } from "@/lib/actions/stocktake";
import { toast } from "sonner";

export function NewStocktakeButton() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const res = await createStocktake();
        if (res.ok && res.id) {
          toast.success("Đã tạo phiếu kiểm kê mới");
          router.push(`/kiem-ke/${res.id}`);
        } else {
          toast.error(res.error || "Không thể tạo phiếu kiểm kê");
        }
      } catch (err) {
        toast.error("Có lỗi xảy ra khi tạo phiếu kiểm kê");
      }
    });
  };

  return (
    <Button onClick={handleCreate} disabled={isPending} className="cursor-pointer">
      {isPending ? "Đang tạo..." : "Tạo phiếu kiểm kê mới"}
    </Button>
  );
}
