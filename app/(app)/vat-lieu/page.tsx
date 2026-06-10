import * as React from "react";
import { requireRole } from "@/lib/auth-helpers";
import { getSuppliers, getUnits } from "@/lib/queries/catalogs";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { MaterialManager } from "@/components/material-manager";
import { SupplierManager } from "@/components/supplier-manager";
import { UnitManager } from "@/components/unit-manager";
import { WarehouseManager } from "@/components/warehouse-manager";

export default async function VatLieuPage() {
  await requireRole("OWNER");
  const [materials, warehouses, units, suppliers] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getUnits(),
    getSuppliers(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Quản Lý Danh Mục
        </h1>
        <p className="text-sm text-muted-foreground">
          Quản lý vật tư, xe, máy, đơn vị tính, kho và nhà cung cấp
        </p>
      </div>

      <UnitManager units={units} />

      <MaterialManager materials={materials} units={units} />

      <SupplierManager suppliers={suppliers} />

      <div className="pt-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Quản Lý Kho</h2>
        <p className="text-sm text-muted-foreground mb-4">Thêm hoặc sửa các kho chứa vật tư</p>
        <WarehouseManager warehouses={warehouses} />
      </div>
    </div>
  );
}
