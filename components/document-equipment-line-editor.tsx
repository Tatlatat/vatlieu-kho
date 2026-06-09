"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EquipmentOption {
  id: string;
  code?: string | null;
  name: string;
  type?: string | null;
  plateNo?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export interface EquipmentLineItem {
  equipmentId: string;
  hours: string;
  projectId?: string;
  note?: string;
  _key: string;
}

export function DocumentEquipmentLineEditor({
  equipment,
  projects,
  lines,
  onChange,
  disabled,
}: {
  equipment: EquipmentOption[];
  projects: ProjectOption[];
  lines: EquipmentLineItem[];
  onChange: (lines: EquipmentLineItem[]) => void;
  disabled?: boolean;
}) {
  const updateLine = (index: number, field: keyof EquipmentLineItem, value: string) => {
    onChange(lines.map((line, idx) => (idx === index ? { ...line, [field]: value } : line)));
  };

  const addLine = () => {
    onChange([...lines, { equipmentId: "", hours: "", projectId: "", note: "", _key: crypto.randomUUID() }]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Dòng xe/máy</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Thêm dòng
        </Button>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có dòng xe/máy nào.</p>
      ) : (
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line._key} className="grid gap-3 rounded-md border bg-white p-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="mb-1 block text-xs text-slate-500">Xe/máy</Label>
                <Select value={line.equipmentId} onValueChange={(value) => updateLine(index, "equipmentId", value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn xe/máy">
                      {equipment.find((item) => item.id === line.equipmentId)?.name || "Chọn xe/máy"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}{item.code ? ` (${item.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block text-xs text-slate-500">Số giờ</Label>
                <Input value={line.hours} onChange={(e) => updateLine(index, "hours", e.target.value)} type="number" step="any" placeholder="0" />
              </div>
              <div className="md:col-span-3">
                <Label className="mb-1 block text-xs text-slate-500">Công trình</Label>
                <Select value={line.projectId || "__none__"} onValueChange={(value) => updateLine(index, "projectId", value === "__none__" ? "" : (value ?? ""))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn công trình">
                      {projects.find((project) => project.id === line.projectId)?.name || "Chọn công trình"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Không chọn —</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block text-xs text-slate-500">Ghi chú</Label>
                <Input value={line.note ?? ""} onChange={(e) => updateLine(index, "note", e.target.value)} placeholder="Ghi chú" />
              </div>
              <div className="flex items-end md:col-span-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={disabled}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
