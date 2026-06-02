"use client";

import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface MaterialSelectProps {
  materials: Material[];
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export function MaterialSelect({
  materials,
  name,
  value,
  onChange,
}: MaterialSelectProps) {
  const selected = materials.find((m) => m.id === value);

  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Chọn vật tư...">
            {selected ? `${selected.name} (${selected.code})` : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {materials.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} ({m.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
