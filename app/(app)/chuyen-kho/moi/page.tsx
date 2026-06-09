export const dynamic = "force-dynamic";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { getTransferApprovers } from "@/lib/queries/users";
import { requireUser } from "@/lib/auth-helpers";
import { TransferDocForm } from "@/components/transfer-doc-form";

export default async function ChuyenKhoMoiPage() {
  const [materials, warehouses, approvers, currentUser] = await Promise.all([
    getMaterials(),
    getWarehouses(),
    getTransferApprovers(),
    requireUser(),
  ]);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold mb-4">Tạo phiếu chuyển kho</h1>
      <TransferDocForm materials={materials} warehouses={warehouses} approvers={approvers} currentUser={currentUser} />
    </div>
  );
}
