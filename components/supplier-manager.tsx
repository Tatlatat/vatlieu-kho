"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createSupplier, updateSupplier } from "@/lib/actions/catalogs";
import { lookupTaxCode } from "@/lib/actions/tax-lookup";
import { toast } from "sonner";

interface Supplier {
  id: string;
  code: string;
  taxCode: string | null;
  name: string;
  address: string | null;
  note: string | null;
}

function SupplierFields({
  supplier,
  nameRef,
  addressRef,
  isLookingUp,
  handleTaxCodeBlur,
}: {
  supplier?: Supplier;
  nameRef: React.RefObject<HTMLInputElement | null>;
  addressRef: React.RefObject<HTMLInputElement | null>;
  isLookingUp: boolean;
  handleTaxCodeBlur: (
    taxCode: string,
    nameRef: React.RefObject<HTMLInputElement | null>,
    addressRef: React.RefObject<HTMLInputElement | null>
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={supplier ? "edit-supplier-taxCode" : "supplier-taxCode"}>Mã số thuế</Label>
          {isLookingUp && <span className="text-xs text-muted-foreground">Đang tra cứu...</span>}
        </div>
        <Input
          id={supplier ? "edit-supplier-taxCode" : "supplier-taxCode"}
          name="taxCode"
          defaultValue={supplier?.taxCode ?? ""}
          onBlur={(event) => handleTaxCodeBlur(event.target.value, nameRef, addressRef)}
          placeholder="Ví dụ: 0312345678"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={supplier ? "edit-supplier-code" : "supplier-code"}>Mã NCC</Label>
        <Input
          id={supplier ? "edit-supplier-code" : "supplier-code"}
          name="code"
          defaultValue={supplier?.code ?? ""}
          required
          placeholder="Ví dụ: NCC-001"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={supplier ? "edit-supplier-name" : "supplier-name"}>Tên công ty</Label>
        <Input
          id={supplier ? "edit-supplier-name" : "supplier-name"}
          name="name"
          defaultValue={supplier?.name ?? ""}
          ref={nameRef}
          required
          placeholder="Ví dụ: Công ty TNHH Vật liệu A"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={supplier ? "edit-supplier-address" : "supplier-address"}>Địa chỉ</Label>
        <Input
          id={supplier ? "edit-supplier-address" : "supplier-address"}
          name="address"
          defaultValue={supplier?.address ?? ""}
          ref={addressRef}
          placeholder="Tùy chọn"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={supplier ? "edit-supplier-note" : "supplier-note"}>Ghi chú</Label>
        <Input
          id={supplier ? "edit-supplier-note" : "supplier-note"}
          name="note"
          defaultValue={supplier?.note ?? ""}
          placeholder="Tùy chọn"
        />
      </div>
    </div>
  );
}

export function SupplierManager({
  suppliers,
  canManage = true,
}: {
  suppliers: Supplier[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isLookingUp, startLookupTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const createNameRef = React.useRef<HTMLInputElement>(null);
  const createAddressRef = React.useRef<HTMLInputElement>(null);
  const editNameRef = React.useRef<HTMLInputElement>(null);
  const editAddressRef = React.useRef<HTMLInputElement>(null);

  const handleTaxCodeBlur = (
    taxCode: string,
    nameRef: React.RefObject<HTMLInputElement | null>,
    addressRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = taxCode.trim().replace(/-/g, "");
    if (!/^\d{10}(\d{3})?$/.test(digits)) return;

    startLookupTransition(async () => {
      const result = await lookupTaxCode(digits);
      if (result.ok) {
        if (nameRef.current && !nameRef.current.value.trim()) {
          nameRef.current.value = result.name;
        }
        if (addressRef.current && !addressRef.current.value.trim()) {
          addressRef.current.value = result.address;
        }
        toast.success("Đã lấy thông tin từ mã số thuế");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createSupplier(formData);
      if (result.ok) {
        toast.success("Đã thêm nhà cung cấp");
        setIsCreateOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể thêm nhà cung cấp");
      }
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSupplier) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateSupplier(editingSupplier.id, formData);
      if (result.ok) {
        toast.success("Đã cập nhật nhà cung cấp");
        setEditingSupplier(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể cập nhật nhà cung cấp");
      }
    });
  };

  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg font-semibold">
          Nhà cung cấp <span className="text-sm font-normal text-muted-foreground">({suppliers.length})</span>
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
            Thêm NCC
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã NCC</TableHead>
                <TableHead>Mã số thuế</TableHead>
                <TableHead>Tên công ty</TableHead>
                <TableHead>Địa chỉ</TableHead>
                {canManage && <TableHead className="w-[100px] text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-xs">{supplier.code}</TableCell>
                  <TableCell>{supplier.taxCode ?? ""}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={supplier.address ?? ""}>
                    {supplier.address ?? ""}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditingSupplier(supplier)}>
                        Sửa
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có nhà cung cấp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Thêm nhà cung cấp</DialogTitle>
            <DialogDescription>Nhập thông tin NCC để chọn trên phiếu nhập.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <SupplierFields
              nameRef={createNameRef}
              addressRef={createAddressRef}
              isLookingUp={isLookingUp}
              handleTaxCodeBlur={handleTaxCodeBlur}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingSupplier !== null} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sửa nhà cung cấp</DialogTitle>
            <DialogDescription>Cập nhật mã NCC, MST, tên công ty và địa chỉ.</DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <SupplierFields
                supplier={editingSupplier}
                nameRef={editNameRef}
                addressRef={editAddressRef}
                isLookingUp={isLookingUp}
                handleTaxCodeBlur={handleTaxCodeBlur}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)} disabled={isPending}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
