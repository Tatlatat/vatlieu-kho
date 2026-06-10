"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  backHref: string;
}

export function PrintToolbar({ backHref }: Props) {
  return (
    <div className="app-print-actions mb-4 flex flex-wrap items-center justify-between gap-2">
      <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="size-4" />
        Quay lại
      </Link>
      <Button onClick={() => window.print()}>
        <Printer className="size-4" />
        In phiếu
      </Button>
    </div>
  );
}
