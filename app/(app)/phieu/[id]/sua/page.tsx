import { notFound } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth-helpers";
import { ExportForm } from "@/components/export-form";
import { ImportForm } from "@/components/import-form";
import { TransferForm } from "@/components/transfer-form";
import { permissionForInventoryDocument } from "@/lib/permissions/inventory-permissions";
import { getSupplierOptions } from "@/lib/queries/catalogs";
import { getInventoryDocumentDetail } from "@/lib/queries/documents";
import { getProjectOptions } from "@/lib/queries/projects";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";

export default async function EditPhieuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const document = await getInventoryDocumentDetail(id);

  if (!document || document.status !== "POSTED") notFound();
  await requirePermission(permissionForInventoryDocument(document.kind, "edit_posted"));

  const [materials, warehouses, projects, suppliers] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getProjectOptions(),
    getSupplierOptions(),
  ]);

  if (document.kind === "IMPORT") {
    return (
      <ImportForm
        materials={materials}
        warehouses={warehouses}
        suppliers={suppliers}
        mode="edit"
        initialDocument={{
          id: document.id,
          documentDate: document.documentDate,
          warehouseId: document.warehouseId,
          supplierId: document.supplierId,
          note: document.note,
          lines: document.lines,
        }}
      />
    );
  }

  if (document.kind === "EXPORT") {
    return (
      <ExportForm
        materials={materials}
        warehouses={warehouses}
        projects={projects}
        mode="edit"
        initialDocument={{
          id: document.id,
          documentDate: document.documentDate,
          warehouseId: document.warehouseId,
          reason: document.reason,
          note: document.note,
          lines: document.lines,
        }}
      />
    );
  }

  if (document.kind === "TRANSFER") {
    return (
      <TransferForm
        materials={materials}
        warehouses={warehouses}
        mode="edit"
        initialDocument={{
          id: document.id,
          documentDate: document.documentDate,
          fromWarehouseId: document.fromWarehouseId,
          toWarehouseId: document.toWarehouseId,
          note: document.note,
          lines: document.lines,
        }}
      />
    );
  }

  notFound();
}
