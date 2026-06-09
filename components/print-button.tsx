"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "In phiếu", className = "" }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      type="button"
      onClick={handlePrint}
      className={`no-print flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium ${className}`}
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
