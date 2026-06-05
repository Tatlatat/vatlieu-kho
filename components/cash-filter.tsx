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
}: {
  funds: Fund[];
  fundId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const go = (next: { fund?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams({ fund: fundId, from, to, ...next });
    router.push(`/quy?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
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
