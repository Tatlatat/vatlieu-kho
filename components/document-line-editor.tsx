"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { SearchableMaterialSelect } from "@/components/searchable-material-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export interface LineItem {
  materialId: string;
  quantity: string;
  note?: string;
  _key: string;
}

interface DocumentLineEditorProps {
  materials: { id: string; name: string; code: string; unit: string }[];
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  disabled?: boolean;
}

export function DocumentLineEditor({
  materials,
  lines,
  onChange,
  disabled = false,
}: DocumentLineEditorProps) {
  // Map materials by id for quick unit lookup
  const materialsMap = React.useMemo(() => {
    return new Map(materials.map((m) => [m.id, m]));
  }, [materials]);

  const handleLineChange = (index: number, field: keyof LineItem, value: string) => {
    const updated = lines.map((line, idx) => {
      if (idx === index) {
        return { ...line, [field]: value };
      }
      return line;
    });
    onChange(updated);
  };

  const handleAddLine = () => {
    const newLine: LineItem = {
      materialId: "",
      quantity: "",
      note: "",
      _key: crypto.randomUUID(),
    };
    onChange([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      // Keep at least one line but clear its values
      const cleared = lines.map((line, idx) => {
        if (idx === 0) {
          return { ...line, materialId: "", quantity: "", note: "" };
        }
        return line;
      });
      onChange(cleared);
    } else {
      onChange(lines.filter((_, idx) => idx !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] min-w-[250px]">Vật tư</TableHead>
              <TableHead className="w-[15%] min-w-[100px]">Số lượng</TableHead>
              <TableHead className="w-[10%] min-w-[80px]">Đơn vị</TableHead>
              <TableHead className="w-[30%] min-w-[200px]">Ghi chú dòng</TableHead>
              {!disabled && <TableHead className="w-[5%] text-center">Xóa</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const selectedMaterial = materialsMap.get(line.materialId);
              const unit = selectedMaterial ? selectedMaterial.unit : "";

              return (
                <TableRow key={line._key}>
                  <TableCell>
                    {disabled ? (
                      <div className="py-2 text-sm text-foreground">
                        {selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.code})` : "—"}
                      </div>
                    ) : (
                      <SearchableMaterialSelect
                        materials={materials}
                        name={`lines[${index}].materialId`}
                        value={line.materialId}
                        onChange={(val) => handleLineChange(index, "materialId", val)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="any"
                      placeholder="SL..."
                      value={line.quantity}
                      disabled={disabled}
                      onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                      className="h-10"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground block py-2">{unit || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Ghi chú..."
                      value={line.note || ""}
                      disabled={disabled}
                      onChange={(e) => handleLineChange(index, "note", e.target.value)}
                      className="h-10"
                    />
                  </TableCell>
                  {!disabled && (
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(index)}
                        className="text-muted-foreground hover:text-destructive h-10 w-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Thêm dòng
        </Button>
      )}
    </div>
  );
}
