"use client";

import { useRouter } from "next/navigation";

interface Fund {
  id: string;
  name: string;
}

export function CashFilter({
  funds,
  fundId,
  from,
  to,
  view = "ledger",
}: {
  funds: Fund[];
  fundId: string;
  from: string;
  to: string;
  view?: "ledger" | "summary";
}) {
  const router = useRouter();
  const go = (next: { fund?: string; from?: string; to?: string; view?: "ledger" | "summary" }) => {
    const params = new URLSearchParams({
      from,
      to,
      view,
      ...(view === "ledger" ? { fund: fundId } : {}),
      ...next,
    });
    router.push(`/quy?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-500">Chế độ xem</label>
        <select
          value={view}
          onChange={(e) => go({ view: e.target.value as "ledger" | "summary" })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Chọn chế độ xem"
        >
          <option value="ledger">Sổ quỹ</option>
          <option value="summary">Tổng hợp công trình</option>
        </select>
      </div>
      {view === "ledger" && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">Quỹ</label>
          <select
            value={fundId}
            onChange={(e) => go({ fund: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Chọn quỹ"
          >
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-500">Từ ngày</label>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => go({ from: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-500">Đến ngày</label>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => go({ to: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
    </div>
  );
}
