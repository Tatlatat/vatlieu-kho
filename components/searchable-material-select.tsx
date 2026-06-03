"use client";
import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Material { id: string; name: string; code: string; unit: string; }

export function SearchableMaterialSelect({
  materials, name, value, onChange,
}: { materials: Material[]; name: string; value: string; onChange: (v: string) => void; }) {
  const [filter, setFilter] = React.useState("");
  const selected = materials.find((m) => m.id === value);
  const q = filter.trim().toLowerCase();
  const list = q ? materials.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) : materials;

  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Chọn vật tư...">{selected ? `${selected.name} (${selected.code})` : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 sticky top-0 bg-popover z-10">
            <Input autoFocus placeholder="Gõ để tìm mã/tên..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9" />
          </div>
          {list.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>))}
          {list.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy</div>}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
