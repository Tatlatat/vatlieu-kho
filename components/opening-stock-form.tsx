"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Info, Save } from "lucide-react";
import { WarehouseSelect } from "@/components/warehouse-select";
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
import { createOpeningStock } from "@/lib/actions/opening";
import { importOpeningStock } from "@/lib/actions/opening-import";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface OpeningStockFormProps {
  materials: Material[];
  warehouses: Warehouse[];
}

interface OpeningRow {
  _key: string;
  warehouseId: string;
  materialId: string;
  quantity: string;
}

export function OpeningStockForm({ materials, warehouses }: OpeningStockFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [importErrors, setImportErrors] = React.useState<{ rowNumber: number; message: string }[]>([]);
  const [file, setFile] = React.useState<File | null>(null);

  // Find the default warehouse to pre-select it if possible
  const defaultWarehouse = React.useMemo(() => {
    return warehouses.find((w) => w.isDefault) || warehouses[0];
  }, [warehouses]);

  // State initialization with a lazy initializer
  const [rows, setRows] = React.useState<OpeningRow[]>(() => [
    {
      _key: crypto.randomUUID(),
      warehouseId: defaultWarehouse?.id || "",
      materialId: "",
      quantity: "",
    },
  ]);

  const materialsMap = React.useMemo(() => {
    return new Map(materials.map((m) => [m.id, m]));
  }, [materials]);

  const handleRowChange = (index: number, field: keyof OpeningRow, value: string) => {
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx === index) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        warehouseId: defaultWarehouse?.id || "",
        materialId: "",
        quantity: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        // Keep at least one row but clear its values
        return [
          {
            _key: crypto.randomUUID(),
            warehouseId: defaultWarehouse?.id || "",
            materialId: "",
            quantity: "",
          },
        ];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSave = () => {
    setImportErrors([]);
    // Filter active rows that have at least some value inputted
    const activeRows = rows.filter((r) => r.warehouseId || r.materialId || r.quantity);

    if (activeRows.length === 0) {
      toast.error("Vui lòng nhập ít nhất một dòng tồn đầu kỳ");
      return;
    }

    // Validation
    for (let i = 0; i < activeRows.length; i++) {
      const r = activeRows[i];
      if (!r.warehouseId) {
        toast.error(`Dòng số ${i + 1}: Vui lòng chọn kho`);
        return;
      }
      if (!r.materialId) {
        toast.error(`Dòng số ${i + 1}: Vui lòng chọn vật tư`);
        return;
      }
      const q = Number(r.quantity);
      if (isNaN(q) || q <= 0) {
        toast.error(`Dòng số ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
    }

    // Dedup material x warehouse check in client
    const seen = new Set<string>();
    for (const r of activeRows) {
      const key = `${r.materialId}:${r.warehouseId}`;
      if (seen.has(key)) {
        toast.error("Có vật tư bị trùng lặp trong cùng một kho — mỗi vật tư/kho chỉ được tồn tại một dòng");
        return;
      }
      seen.add(key);
    }

    const entries = activeRows.map((r) => ({
      materialId: r.materialId,
      warehouseId: r.warehouseId,
      quantity: Number(r.quantity),
    }));

    startTransition(async () => {
      try {
        const res = await createOpeningStock(entries);
        if (res.ok) {
          toast.success("Đã lưu tồn đầu kỳ");
          router.push("/");
        } else {
          toast.error(res.error || "Đã xảy ra lỗi");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Vui lòng chọn file Excel");
      return;
    }
    setImportErrors([]);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await importOpeningStock(fd);
        if (res.ok) {
          toast.success(`Đã nhập ${res.insertedCount ?? 0} dòng tồn đầu kỳ`);
          router.push("/");
          router.refresh();
        } else if (res.errors) {
          setImportErrors(res.errors);
          toast.error("File có lỗi — chưa ghi dữ liệu");
        } else {
          toast.error(res.error || "Không thể nhập file");
        }
      } catch (err) {
        toast.error("Lỗi hệ thống: " + (err as Error).message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Information Alert Block */}
      <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">Hướng dẫn quan trọng:</p>
          <p className="leading-relaxed">
            Chỉ dùng khi bắt đầu sử dụng phần mềm. Mỗi vật tư × kho chỉ đặt được 1 lần; ô đã có giao dịch sẽ bị từ chối.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Nhập tồn đầu kỳ từ Excel</p>
            <p className="text-sm text-slate-500">File mẫu gồm 3 cột: `ma_kho`, `ma_vat_tu`, `so_luong`.</p>
          </div>
          <a href="/api/ton-dau-ky/template" className="text-sm font-medium text-blue-600 hover:underline">
            Tải file mẫu
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isPending}
            className="max-w-sm"
          />
          <Button type="button" variant="secondary" disabled={isPending || !file} onClick={handleImport}>
            {isPending ? "Đang nhập..." : "Nhập từ file"}
          </Button>
        </div>
        {importErrors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm font-semibold text-red-700">Các dòng lỗi trong file</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Lỗi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importErrors.map((error) => (
                  <TableRow key={`${error.rowNumber}-${error.message}`}>
                    <TableCell>{error.rowNumber}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[30%] min-w-[200px] font-semibold text-slate-700">Kho hàng</TableHead>
              <TableHead className="w-[40%] min-w-[250px] font-semibold text-slate-700">Vật tư</TableHead>
              <TableHead className="w-[15%] min-w-[100px] font-semibold text-slate-700">Số lượng</TableHead>
              <TableHead className="w-[10%] min-w-[80px] font-semibold text-slate-700">Đơn vị</TableHead>
              <TableHead className="w-[5%] text-center font-semibold text-slate-700">Xóa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const selectedMaterial = materialsMap.get(row.materialId);
              const unit = selectedMaterial ? selectedMaterial.unit : "";

              return (
                <TableRow key={row._key} className="hover:bg-slate-50/50">
                  <TableCell className="align-middle">
                    <WarehouseSelect
                      warehouses={warehouses}
                      name={`rows[${index}].warehouseId`}
                      value={row.warehouseId}
                      onChange={(val) => handleRowChange(index, "warehouseId", val)}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <SearchableMaterialSelect
                      materials={materials}
                      name={`rows[${index}].materialId`}
                      value={row.materialId}
                      onChange={(val) => handleRowChange(index, "materialId", val)}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Nhập SL..."
                      value={row.quantity}
                      disabled={isPending}
                      onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                      className="h-10 text-slate-900 focus-visible:ring-blue-500 font-semibold"
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <span className="text-sm font-medium text-slate-500 block px-1">
                      {unit || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRow(index)}
                      disabled={isPending}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-10 w-10 transition-colors"
                      title="Xóa dòng"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddRow}
          disabled={isPending}
          className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Thêm dòng
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Đang lưu..." : "Lưu tồn đầu kỳ"}
        </Button>
      </div>
    </div>
  );
}
