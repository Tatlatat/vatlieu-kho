import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { ExportForm } from "@/components/export-form";
import { ImportForm } from "@/components/import-form";
import { TransferForm } from "@/components/transfer-form";
import { getInventoryDocumentDetail } from "@/lib/queries/documents";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";

export default async function EditPhieuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER");
  const { id } = await params;
  const [document, materials, warehouses] = await Promise.all([
    getInventoryDocumentDetail(id),
    getMaterials(),
    getWarehouses(),
  ]);

  if (!document || document.status !== "POSTED") notFound();

  if (document.kind === "IMPORT") {
    return (
      <ImportForm
        materials={materials}
        warehouses={warehouses}
        mode="edit"
        initialDocument={{
          id: document.id,
          documentDate: document.documentDate,
          warehouseId: document.warehouseId,
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
