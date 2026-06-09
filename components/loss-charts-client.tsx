"use client";

import dynamic from "next/dynamic";

// Recharts chỉ render đúng phía client (cần kích thước DOM thật).
// Tải động, tắt SSR, kèm khung chờ giữ chiều cao để tránh layout nhảy.
export const LossCharts = dynamic(
  () => import("@/components/loss-charts").then((m) => m.LossCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-[380px] animate-pulse rounded-xl border bg-muted/30" />
        <div className="h-[380px] animate-pulse rounded-xl border bg-muted/30" />
      </div>
    ),
  }
);
