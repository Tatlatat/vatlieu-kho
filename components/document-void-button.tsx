"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { voidInventoryDocument } from "@/lib/actions/documents";

export function DocumentVoidButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function submitVoid() {
    const cleanReason = reason.trim();
    if (!cleanReason) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("reason", cleanReason);
      const result = await voidInventoryDocument(formData);

      if (result.ok) {
        toast.success("Đã hủy phiếu");
        setOpen(false);
        setReason("");
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Không hủy được phiếu");
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Ban className="size-4" />
        Hủy phiếu
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy phiếu</DialogTitle>
            <DialogDescription>
              Thao tác này ghi audit trên phiếu và loại bút toán của phiếu khỏi tồn kho hiện hành.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Lý do hủy..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setReason("");
                }}
              >
                Bỏ qua
              </Button>
              <Button
                variant="destructive"
                disabled={!reason.trim() || isPending}
                onClick={submitVoid}
              >
                {isPending ? "Đang hủy..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
