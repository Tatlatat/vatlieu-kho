"use client";
import { useRouter } from "next/navigation";

interface Warehouse {
  id: string;
  name: string;
}

export function WarehouseFilter({
  warehouses,
  value,
}: {
  warehouses: Warehouse[];
  value: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) =>
        router.push(e.target.value ? `/?wh=${e.target.value}` : "/")
      }
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      aria-label="Lọc theo kho"
    >
      <option value="">Tất cả kho</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
