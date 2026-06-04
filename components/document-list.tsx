"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DocStatusBadge } from "@/components/status-badge-doc";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface DocumentItem {
  id: string;
  code: string;
  status: string;
  docDate: Date | string;
  warehouse?: { name: string } | null;
  fromWarehouse?: { name: string } | null;
  toWarehouse?: { name: string } | null;
  createdBy?: { name: string } | null;
  _count: { lines: number };
}

interface DocumentListProps {
  docs: DocumentItem[];
  basePath: string; // "/nhap" | "/xuat" | "/chuyen-kho"
  newLabel: string; // "Tạo phiếu nhập" v.v.
}

export function DocumentList({ docs, basePath, newLabel }: DocumentListProps) {
  const router = useRouter();

  const formatDate = (dateInput: Date | string) => {
    if (!dateInput) return "—";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getWarehouseText = (doc: DocumentItem) => {
    if (basePath === "/chuyen-kho") {
      const from = doc.fromWarehouse?.name || "—";
      const to = doc.toWarehouse?.name || "—";
      return `${from} → ${to}`;
    }
    return doc.warehouse?.name || "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button
          onClick={() => router.push(`${basePath}/moi`)}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {newLabel}
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Mã phiếu</TableHead>
              <TableHead className="font-semibold">Ngày lập</TableHead>
              <TableHead className="font-semibold">
                {basePath === "/chuyen-kho" ? "Kho nguồn → Kho đích" : "Kho"}
              </TableHead>
              <TableHead className="font-semibold text-center">Số dòng</TableHead>
              <TableHead className="font-semibold">Trạng thái</TableHead>
              <TableHead className="font-semibold">Người lập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có phiếu nào
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => router.push(`${basePath}/${doc.id}`)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium text-primary">{doc.code}</TableCell>
                  <TableCell>{formatDate(doc.docDate)}</TableCell>
                  <TableCell>{getWarehouseText(doc)}</TableCell>
                  <TableCell className="text-center">{doc._count.lines}</TableCell>
                  <TableCell>
                    <DocStatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell>{doc.createdBy?.name || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
