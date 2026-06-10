"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { REASON_LABELS } from "@/lib/validation";
import type { BalanceRow } from "@/lib/queries/balance";
import { cn } from "@/lib/utils";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface LedgerEntry {
  created_at: string;
  type: string;
  reason: string;
  quantity: number;
  warehouse_name: string;
  note: string | null;
  voided: boolean;
}

interface Props {
  rows: BalanceRow[];
  warehouses: Warehouse[];
  from: string;
  to: string;
  warehouseId: string;
  canImportOpening?: boolean;
}

function typeLabel(type: string, reason: string): string {
  const dir = type === "IN" ? "Nhập" : "Xuất";
  const label = REASON_LABELS[reason] ?? reason;
  return `${dir} – ${label}`;
}

export function BalanceReport({ rows, warehouses, from, to, warehouseId, canImportOpening = false }: Props) {
  const router = useRouter();

  const [localFrom, setLocalFrom] = React.useState(from);
  const [localTo, setLocalTo] = React.useState(to);
  const [localWh, setLocalWh] = React.useState(warehouseId);
  const [showTransfer, setShowTransfer] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [ledgerData, setLedgerData] = React.useState<Record<string, LedgerEntry[]>>({});
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  function handleView() {
    const params = new URLSearchParams({ from: localFrom, to: localTo });
    if (localWh) params.set("wh", localWh);
    router.push(`/bao-cao?${params.toString()}`);
  }

  function exportHref() {
    const params = new URLSearchParams({ from: localFrom, to: localTo });
    if (localWh) params.set("wh", localWh);
    return `/api/reports/balance/export?${params.toString()}`;
  }

  async function toggleRow(materialId: string) {
    if (expandedId === materialId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(materialId);
    if (ledgerData[materialId]) return; // already fetched

    setLoadingId(materialId);
    try {
      const params = new URLSearchParams({ materialId, from, to });
      if (warehouseId) params.set("wh", warehouseId);
      const res = await fetch(`/api/ledger?${params.toString()}`);
      const json = await res.json();
      setLedgerData((prev) => ({ ...prev, [materialId]: json.ledger ?? [] }));
    } catch {
      setLedgerData((prev) => ({ ...prev, [materialId]: [] }));
    } finally {
      setLoadingId(null);
    }
  }

  // Column count changes when showTransfer is toggled
  const colSpan = showTransfer ? 8 : 6;

  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            Báo cáo Nhập – Xuất – Tồn
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {canImportOpening && (
              <Link href="/ton-dau-ky" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Upload className="size-3.5" />
                Tồn đầu kỳ
              </Link>
            )}
            <Link href={exportHref()} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Download className="size-3.5" />
              Excel
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransfer((v) => !v)}
            >
              {showTransfer ? "Ẩn chuyển kho" : "Hiện chuyển kho"}
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 pt-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Từ ngày</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Đến ngày</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Kho</label>
            <select
              value={localWh}
              onChange={(e) => setLocalWh(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={handleView} className="h-8 self-end">
            Xem
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Không có dữ liệu trong kỳ này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Mã</TableHead>
                  <TableHead className="font-semibold">Tên vật liệu</TableHead>
                  <TableHead className="text-right font-semibold">Đầu kỳ</TableHead>
                  <TableHead className="text-right font-semibold" title="Nhập mua + điều chỉnh thừa khi kiểm kê">Nhập</TableHead>
                  <TableHead className="text-right font-semibold">Xuất</TableHead>
                  {showTransfer && (
                    <>
                      <TableHead className="text-right font-semibold">Chuyển đến</TableHead>
                      <TableHead className="text-right font-semibold">Chuyển đi</TableHead>
                    </>
                  )}
                  <TableHead className="text-right font-semibold">Tồn cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <React.Fragment key={row.material_id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(row.material_id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.name}
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          {row.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.opening.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {row.in_qty > 0 ? `+${row.in_qty.toLocaleString("vi-VN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        {row.out_qty > 0 ? `-${row.out_qty.toLocaleString("vi-VN")}` : "—"}
                      </TableCell>
                      {showTransfer && (
                        <>
                          <TableCell className="text-right tabular-nums text-sky-600 dark:text-sky-400">
                            {row.transfer_in > 0
                              ? `+${row.transfer_in.toLocaleString("vi-VN")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                            {row.transfer_out > 0
                              ? `-${row.transfer_out.toLocaleString("vi-VN")}`
                              : "—"}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right tabular-nums font-semibold">
                        {row.closing.toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>

                    {/* Drill-down ledger */}
                    {expandedId === row.material_id && (
                      <TableRow>
                        <TableCell
                          colSpan={colSpan}
                          className="bg-muted/30 p-0"
                        >
                          <div className="px-4 py-3">
                            {loadingId === row.material_id ? (
                              <p className="text-sm text-muted-foreground py-2">
                                Đang tải nhật ký...
                              </p>
                            ) : !ledgerData[row.material_id] ||
                              ledgerData[row.material_id].length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                Không có giao dịch trong kỳ này.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Ngày</TableHead>
                                    <TableHead className="text-xs">Loại</TableHead>
                                    <TableHead className="text-xs">Kho</TableHead>
                                    <TableHead className="text-right text-xs">Số lượng</TableHead>
                                    <TableHead className="text-xs">Ghi chú</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {ledgerData[row.material_id].map(
                                    (entry, idx) => (
                                      <TableRow
                                        key={idx}
                                        className={
                                          entry.voided
                                            ? "opacity-50"
                                            : undefined
                                        }
                                      >
                                        <TableCell
                                          className={`text-xs tabular-nums${entry.voided ? " line-through" : ""}`}
                                        >
                                          {new Date(
                                            entry.created_at
                                          ).toLocaleDateString("vi-VN")}
                                        </TableCell>
                                        <TableCell
                                          className={`text-xs${entry.voided ? " line-through" : ""}`}
                                        >
                                          {typeLabel(entry.type, entry.reason)}
                                          {entry.voided && (
                                            <span className="ml-1 text-muted-foreground">
                                              (đã hủy)
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {entry.warehouse_name}
                                        </TableCell>
                                        <TableCell className="text-right text-xs tabular-nums">
                                          {entry.type === "IN" ? "+" : "-"}
                                          {entry.quantity.toLocaleString(
                                            "vi-VN"
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {entry.note ?? "—"}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
