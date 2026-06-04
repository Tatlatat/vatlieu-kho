"use client";

import * as React from "react";

export type DocStatus = "DRAFT" | "PENDING" | "POSTED" | "VOIDED";

interface DocStatusBadgeProps {
  status: DocStatus | string;
}

export function DocStatusBadge({ status }: DocStatusBadgeProps) {
  let label = "";
  let colorClass = "";

  switch (status) {
    case "DRAFT":
      label = "Nháp";
      colorClass = "bg-slate-100 text-slate-700";
      break;
    case "PENDING":
      label = "Chờ duyệt";
      colorClass = "bg-amber-100 text-amber-700";
      break;
    case "POSTED":
      label = "Đã lập";
      colorClass = "bg-green-100 text-green-700";
      break;
    case "VOIDED":
      label = "Đã hủy";
      colorClass = "bg-red-100 text-red-700 line-through";
      break;
    default:
      label = status;
      colorClass = "bg-slate-100 text-slate-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
