import * as React from "react";
import { can, requirePermission } from "@/lib/auth-helpers";
import { getSuppliers, getUnits } from "@/lib/queries/catalogs";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { MaterialManager } from "@/components/material-manager";
import { SupplierManager } from "@/components/supplier-manager";
import { UnitManager } from "@/components/unit-manager";
import { WarehouseManager } from "@/components/warehouse-manager";

export default async function VatLieuPage() {
  const user = await requirePermission("catalog.view");
  const [materials, warehouses, units, suppliers, canManage] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getUnits(),
    getSuppliers(),
    can(user.id, "catalog.manage"),
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

      <UnitManager units={units} canManage={canManage} />

      <MaterialManager materials={materials} units={units} canManage={canManage} />

      <SupplierManager suppliers={suppliers} canManage={canManage} />

      <div className="pt-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Quản Lý Kho</h2>
        <p className="text-sm text-muted-foreground mb-4">Thêm hoặc sửa các kho chứa vật tư</p>
        <WarehouseManager warehouses={warehouses} canManage={canManage} />
      </div>
    </div>
  );
}
