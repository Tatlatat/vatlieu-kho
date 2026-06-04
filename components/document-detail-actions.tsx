"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { postDocument, voidDocument } from "@/lib/actions/documents";
import {
  submitTransferForApproval,
  approveTransfer,
  rejectTransfer,
} from "@/lib/actions/transfer-approve";

interface DocumentDetailActionsProps {
  id: string;
  status: "DRAFT" | "PENDING" | "POSTED" | "VOIDED" | string;
  type: "IN" | "OUT" | "TRANSFER" | string;
}

export function DocumentDetailActions({ id, status, type }: DocumentDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isVoidDialogOpen, setIsVoidDialogOpen] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState("");

  const handlePost = () => {
    startTransition(async () => {
      try {
        const result = await postDocument(id);
        if (result.ok) {
          toast.success("Lập phiếu thành công");
          router.refresh();
        } else {
          toast.error(result.error || "Lỗi lập phiếu");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  const handleVoid = () => {
    if (!voidReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }
    startTransition(async () => {
      try {
        const result = await voidDocument(id, voidReason.trim());
        if (result.ok) {
          toast.success("Hủy phiếu thành công");
          setIsVoidDialogOpen(false);
          router.refresh();
        } else {
          toast.error(result.error || "Lỗi hủy phiếu");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  const handleSubmitApproval = () => {
    startTransition(async () => {
      try {
        const result = await submitTransferForApproval(id);
        if (result.ok) {
          toast.success("Gửi duyệt thành công");
          router.refresh();
        } else {
          toast.error(result.error || "Lỗi gửi duyệt");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const result = await approveTransfer(id);
        if (result.ok) {
          toast.success("Duyệt phiếu chuyển kho thành công");
          router.refresh();
        } else {
          toast.error(result.error || "Lỗi duyệt phiếu");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try {
        const result = await rejectTransfer(id);
        if (result.ok) {
          toast.success("Từ chối phiếu thành công (phiếu chuyển về Nháp)");
          router.refresh();
        } else {
          toast.error(result.error || "Lỗi từ chối phiếu");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  // Render buttons based on document type and status
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 1. Status DRAFT and type is IN or OUT */}
      {status === "DRAFT" && (type === "IN" || type === "OUT") && (
        <Button
          type="button"
          disabled={isPending}
          onClick={handlePost}
          className="bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          {isPending ? "Đang xử lý..." : "Lập phiếu"}
        </Button>
      )}

      {/* 2. Status DRAFT and type is TRANSFER */}
      {status === "DRAFT" && type === "TRANSFER" && (
        <Button
          type="button"
          disabled={isPending}
          onClick={handleSubmitApproval}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {isPending ? "Đang xử lý..." : "Gửi duyệt"}
        </Button>
      )}

      {/* 3. Status PENDING and type is TRANSFER */}
      {status === "PENDING" && type === "TRANSFER" && (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleReject}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            {isPending ? "Đang từ chối..." : "Từ chối"}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700 text-white font-medium"
          >
            {isPending ? "Đang duyệt..." : "Duyệt phiếu"}
          </Button>
        </>
      )}

      {/* 4. Status POSTED (any type can be voided) */}
      {status === "POSTED" && (
        <>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              setVoidReason("");
              setIsVoidDialogOpen(true);
            }}
          >
            Hủy phiếu
          </Button>

          <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Xác nhận hủy phiếu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  Hủy phiếu đã lập sẽ sinh các bút toán đối ứng đảo ngược toàn bộ lượng nhập/xuất để hoàn trả lại tồn kho ban đầu. Hành động này không thể hoàn tác.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="void-reason-input" className="text-xs font-semibold text-foreground">
                    Lý do hủy phiếu <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="void-reason-input"
                    placeholder="Nhập lý do hủy phiếu (bắt buộc)..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    disabled={isPending}
                    className="h-10"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVoidDialogOpen(false)}
                  disabled={isPending}
                >
                  Bỏ qua
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleVoid}
                  disabled={isPending || !voidReason.trim()}
                >
                  {isPending ? "Đang thực hiện..." : "Đồng ý hủy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
