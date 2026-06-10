import * as React from "react";
import { requirePermission } from "@/lib/auth-helpers";
import { getHistory } from "@/lib/queries/history";
import { HistoryTable } from "@/components/history-table";

export default async function LichSuPage() {
  await requirePermission("inventory.history.view");
  const rows = await getHistory();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Lịch Sử Giao Dịch
        </h1>
        <p className="text-sm text-muted-foreground">
          Sổ cái ghi nhận tất cả hoạt động nhập và xuất kho vật tư
        </p>
      </div>

      <HistoryTable rows={rows} />
    </div>
  );
}
