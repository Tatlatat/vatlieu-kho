export const dynamic = "force-dynamic";

import { requireAtLeast } from "@/lib/auth-helpers";
import { getMaterials } from "@/lib/queries/stock";
import { getWarehouses } from "@/lib/queries/warehouses";
import { OpeningStockForm } from "@/components/opening-stock-form";

export default async function TonDauKyPage() {
  await requireAtLeast("MANAGER"); // chỉ chủ được nhập tồn đầu kỳ
  const [materials, warehouses] = await Promise.all([
    getMaterials(),
    getWarehouses(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Nhập Tồn Đầu Kỳ
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Khởi tạo số lượng tồn kho ban đầu cho vật tư.
        </p>
      </div>

      <OpeningStockForm materials={materials} warehouses={warehouses} />
    </div>
  );
}
