import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUserPermissionSnapshot, requireUser } from "@/lib/auth-helpers";
import { canAccessPermission } from "@/lib/permissions/effective";
import { getSuppliers, getUnits } from "@/lib/queries/catalogs";
import { getProjectManagerData, getProjectNormReport } from "@/lib/queries/projects";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { MaterialManager } from "@/components/material-manager";
import { ProjectManager } from "@/components/project-manager";
import { ProjectNormReport } from "@/components/project-norm-report";
import { SupplierManager } from "@/components/supplier-manager";
import { UnitManager } from "@/components/unit-manager";
import { WarehouseManager } from "@/components/warehouse-manager";

export default async function VatLieuPage() {
  await requireUser();
  const permissions = await getCurrentUserPermissionSnapshot();
  const canViewCatalog = canAccessPermission(permissions, "catalog.view");
  const canManageCatalog = canAccessPermission(permissions, "catalog.manage");
  const canViewProjects = canAccessPermission(permissions, "project.view");
  const canManageProjects = canAccessPermission(permissions, "project.manage");
  const canManageNorms = canAccessPermission(permissions, "norm.manage");

  if (!canViewCatalog && !canViewProjects) redirect("/");

  const [catalogData, projectData, projectReportRows] = await Promise.all([
    canViewCatalog
      ? Promise.all([getMaterials(), getWarehouses(), getUnits(), getSuppliers()])
      : Promise.resolve(null),
    canViewProjects ? getProjectManagerData() : Promise.resolve(null),
    canViewProjects ? getProjectNormReport() : Promise.resolve([]),
  ]);

  const materials = catalogData?.[0] ?? [];
  const warehouses = catalogData?.[1] ?? [];
  const units = catalogData?.[2] ?? [];
  const suppliers = catalogData?.[3] ?? [];

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

      {canViewCatalog && (
        <>
          <UnitManager units={units} canManage={canManageCatalog} />

          <MaterialManager materials={materials} units={units} canManage={canManageCatalog} />

          <SupplierManager suppliers={suppliers} canManage={canManageCatalog} />

          <div className="pt-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Quản Lý Kho</h2>
            <p className="text-sm text-muted-foreground mb-4">Thêm hoặc sửa các kho chứa vật tư</p>
            <WarehouseManager warehouses={warehouses} canManage={canManageCatalog} />
          </div>
        </>
      )}

      {projectData && (
        <div className="space-y-6 pt-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Công trình và định mức</h2>
            <p className="text-sm text-muted-foreground">
              Quản lý công trình, hạng mục và định mức vật tư theo từng hạng mục.
            </p>
          </div>
          <ProjectManager
            data={projectData}
            canManageProjects={canManageProjects}
            canManageNorms={canManageNorms}
          />
          <ProjectNormReport rows={projectReportRows} />
        </div>
      )}
    </div>
  );
}
