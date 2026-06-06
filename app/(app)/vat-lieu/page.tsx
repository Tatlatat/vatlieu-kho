import * as React from "react";
import { requireRole } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getAllProjects } from "@/lib/queries/projects";
import { MaterialManager } from "@/components/material-manager";
import { WarehouseManager } from "@/components/warehouse-manager";

export default async function VatLieuPage() {
  await requireRole("OWNER");
  const [materials, warehouses, projects] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getAllProjects(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Quản Lý Danh Mục Vật Tư
        </h1>
        <p className="text-sm text-muted-foreground">
          Xem, thêm mới hoặc điều chỉnh danh sách các loại vật liệu trong kho
        </p>
      </div>

      <MaterialManager materials={materials} />

      <div className="pt-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Quản Lý Kho</h2>
        <p className="text-sm text-muted-foreground mb-4">Thêm hoặc sửa các kho chứa vật tư</p>
        <WarehouseManager warehouses={warehouses} projects={projects} />
      </div>
    </div>
  );
}
