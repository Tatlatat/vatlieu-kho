"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabDef { key: string; label: string; }

export function DanhMucTabs({ tabs, active }: { tabs: TabDef[]; active: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/danh-muc?tab=${t.key}`}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
