"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { REASON_LABELS } from "@/lib/validation";

interface HistoryRow {
  id: string;
  createdAt: Date;
  materialName: string;
  materialUnit: string;
  type: "IN" | "OUT";
  reason: string;
  quantity: number;
  createdByName: string;
  note: string | null;
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Ngày",
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return date.toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      {
        accessorKey: "materialName",
        header: "Vật liệu",
      },
      {
        accessorKey: "type",
        header: "Loại",
        cell: ({ row }) => {
          const val = row.original.type;
          return val === "IN" ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent px-2 py-0.5">
              Nhập
            </Badge>
          ) : (
            <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-transparent px-2 py-0.5">
              Xuất
            </Badge>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Lý do",
        cell: ({ row }) => {
          const r = row.original.reason;
          return REASON_LABELS[r] ?? r;
        },
      },
      {
        accessorKey: "quantity",
        header: "Số lượng",
        cell: ({ row }) => {
          return `${row.original.quantity} ${row.original.materialUnit}`;
        },
      },
      {
        accessorKey: "createdByName",
        header: "Người tạo",
      },
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table không tương thích memoize của React Compiler; an toàn ở đây.
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const toggleDateSort = () => {
    const isDesc = sorting[0]?.id === "createdAt" && sorting[0]?.desc;
    setSorting([{ id: "createdAt", desc: !isDesc }]);
  };

  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
        <CardTitle className="text-lg font-semibold">Lịch sử giao dịch</CardTitle>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Input
            placeholder="Tìm theo tên vật liệu..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:w-64 h-9"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDateSort}
            className="h-9 cursor-pointer whitespace-nowrap"
          >
            Sắp xếp theo ngày {sorting[0]?.desc ? "⬇️" : "⬆️"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {table.getRowModel().rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Không tìm thấy giao dịch nào.
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Trang {table.getState().pagination.pageIndex + 1} /{" "}
                {table.getPageCount() || 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 cursor-pointer"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 cursor-pointer"
                >
                  Sau
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
