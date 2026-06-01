import * as React from "react";
import { requireRole } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { MaterialManager } from "@/components/material-manager";

export default async function VatLieuPage() {
  await requireRole("OWNER");
  const materials = await getMaterials();

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
    </div>
  );
}
