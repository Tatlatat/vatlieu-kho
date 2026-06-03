"use client";
import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Warehouse { id: string; name: string; code: string; }

export function WarehouseSelect({
  warehouses, name, value, onChange, placeholder = "Chọn kho...",
}: { warehouses: Warehouse[]; name: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  const selected = warehouses.find((w) => w.id === value);
  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder={placeholder}>{selected ? selected.name : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
