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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { REASON_LABELS } from "@/lib/validation";
import { voidMovement } from "@/lib/actions/void";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";

interface HistoryRow {
  id: string;
  createdAt: Date;
  materialName: string;
  materialUnit: string;
  warehouseName: string;
  type: "IN" | "OUT";
  reason: string;
  quantity: number;
  createdByName: string;
  note: string | null;
  voided: boolean;
}

export function HistoryTable({ rows, isOwner }: { rows: HistoryRow[]; isOwner: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [voidingId, setVoidingId] = React.useState<string | null>(null);
  const [voidReason, setVoidReason] = React.useState("");

  const handleVoid = React.useCallback(
    (movementId: string, reason: string) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.append("movementId", movementId);
        fd.append("reason", reason);
        const res = await voidMovement(fd);
        if (res.ok) {
          toast.success("Đã hủy chứng từ");
          setVoidingId(null);
          setVoidReason("");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      });
    },
    [router]
  );

  const columns = React.useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Ngày",
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return date.toLocaleString("vi-VN", {
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
        accessorKey: "warehouseName",
        header: "Kho",
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
          if (r === "VOID") {
            return (
              <Badge className="text-muted-foreground border-transparent px-2 py-0.5" variant="outline">
                Bút toán hủy
              </Badge>
            );
          }
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
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          if (!isOwner || row.original.voided || row.original.reason === "VOID") {
            return null;
          }
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 cursor-pointer"
              onClick={() => {
                setVoidingId(row.original.id);
                setVoidReason("");
              }}
            >
              Hủy
            </Button>
          );
        },
      },
    ],
    [isOwner, handleVoid]
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
    <>
      <Card className="shadow-md border border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
          <CardTitle className="text-lg font-semibold">Lịch sử giao dịch</CardTitle>
          <div className="flex w-full sm:w-auto items-center gap-3">
            <Input
              placeholder="Tìm theo tên vật liệu..."
              aria-label="Tìm kiếm giao dịch theo tên vật liệu"
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
              <div className="overflow-x-auto">
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
                      <TableRow
                        key={row.id}
                        className={row.original.voided ? "opacity-50 line-through" : undefined}
                      >
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
              </div>

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

      <Dialog
        open={voidingId != null}
        onOpenChange={(open) => {
          if (!open) {
            setVoidingId(null);
            setVoidReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy chứng từ</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ tạo bút toán đảo và không thể hoàn tác. Vui lòng nhập lý do hủy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Lý do hủy..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setVoidingId(null);
                  setVoidReason("");
                }}
              >
                Bỏ qua
              </Button>
              <Button
                variant="destructive"
                disabled={!voidReason.trim() || isPending}
                onClick={() => {
                  if (voidingId && voidReason.trim()) {
                    handleVoid(voidingId, voidReason.trim());
                  }
                }}
              >
                {isPending ? "Đang hủy..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
