"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/suppliers";
import { toast } from "sonner";
import { lookupTaxCode } from "@/lib/actions/tax-lookup";


interface Supplier {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  address?: string | null;
  contact?: string | null;
  note?: string | null;
}

interface SupplierManagerProps {
  suppliers: Supplier[];
}

export function SupplierManager({ suppliers }: SupplierManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);

  const [lookingUp, startLookup] = React.useTransition();
  // refs cho form THÊM
  const createNameRef = React.useRef<HTMLInputElement>(null);
  const createAddrRef = React.useRef<HTMLInputElement>(null);
  // refs cho form SỬA
  const editNameRef = React.useRef<HTMLInputElement>(null);
  const editAddrRef = React.useRef<HTMLInputElement>(null);

  const handleTaxBlur = (
    mst: string,
    nameRef: React.RefObject<HTMLInputElement | null>,
    addrRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = (mst ?? "").replace(/-/g, "").trim();
    if (!/^\d{10}(\d{3})?$/.test(digits)) return; // chưa hợp lệ → im lặng
    startLookup(async () => {
      const res = await lookupTaxCode(digits);
      if (res.ok) {
        if (nameRef.current && !nameRef.current.value) nameRef.current.value = res.name;
        if (addrRef.current && !addrRef.current.value) addrRef.current.value = res.address;
        toast.success("Đã lấy thông tin từ mã số thuế");
      } else {
        toast.error(res.error || "Không tra được thông tin, vui lòng nhập tay");
      }
    });
  };


  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = fd.get("code") as string;
    const name = fd.get("name") as string;
    const taxCode = (fd.get("taxCode") as string) || undefined;
    const address = (fd.get("address") as string) || undefined;
    const contact = (fd.get("contact") as string) || undefined;
    const note = (fd.get("note") as string) || undefined;

    startTransition(async () => {
      try {
        const res = await createSupplier({ code, name, taxCode, address, contact, note });
        if (res.ok) {
          toast.success("Đã thêm nhà cung cấp thành công");
          setIsCreateOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const fd = new FormData(e.currentTarget);
    const code = fd.get("code") as string;
    const name = fd.get("name") as string;
    const taxCode = (fd.get("taxCode") as string) || undefined;
    const address = (fd.get("address") as string) || undefined;
    const contact = (fd.get("contact") as string) || undefined;
    const note = (fd.get("note") as string) || undefined;

    startTransition(async () => {
      try {
        const res = await updateSupplier(editingSupplier.id, { code, name, taxCode, address, contact, note });
        if (res.ok) {
          toast.success("Đã cập nhật nhà cung cấp thành công");
          setEditingSupplier(null);
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${name}"?`)) return;

    startTransition(async () => {
      try {
        const res = await deleteSupplier(id);
        if (res.ok) {
          toast.success("Đã xóa nhà cung cấp thành công");
          router.refresh();
        } else {
          toast.error(res.error || "Không thể xóa nhà cung cấp");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          Thêm nhà cung cấp
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách nhà cung cấp</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có nhà cung cấp nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">STT</TableHead>
                    <TableHead>Mã NCC</TableHead>
                    <TableHead>Tên nhà cung cấp</TableHead>
                    <TableHead>Mã số thuế</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-[200px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s, index) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                      <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                      <TableCell>{s.taxCode || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                      <TableCell>{s.address || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                      <TableCell>{s.contact || <span className="text-muted-foreground italic text-xs">Chưa có</span>}</TableCell>
                      <TableCell>{s.note || <span className="text-muted-foreground italic text-xs">Không có</span>}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSupplier(s)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(s.id, s.name)}
                          disabled={isPending}
                          className="cursor-pointer text-destructive hover:bg-destructive/10"
                        >
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog thêm mới nhà cung cấp */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
            <DialogDescription>
              Nhập các thông tin chi tiết của nhà cung cấp mới.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="scode">Mã NCC <span className="text-destructive">*</span></Label>
              <Input
                id="scode"
                name="code"
                required
                placeholder="NCC001"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sname">Tên nhà cung cấp <span className="text-destructive">*</span></Label>
              <Input
                id="sname"
                name="name"
                ref={createNameRef}
                required
                placeholder="Công ty TNHH Vật liệu xây dựng"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="staxCode">Mã số thuế</Label>
                {lookingUp && <span className="text-xs text-slate-400 animate-pulse">Đang tra cứu...</span>}
              </div>
              <Input
                id="staxCode"
                name="taxCode"
                onBlur={(e) => handleTaxBlur(e.target.value, createNameRef, createAddrRef)}
                placeholder="Mã số thuế..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="saddress">Địa chỉ</Label>
              <Input
                id="saddress"
                name="address"
                ref={createAddrRef}
                placeholder="Địa chỉ nhà cung cấp..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scontact">Liên hệ</Label>
              <Input
                id="scontact"
                name="contact"
                placeholder="Số điện thoại, email hoặc địa chỉ..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="snote">Ghi chú</Label>
              <Input
                id="snote"
                name="note"
                placeholder="Thông tin bổ sung..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="cursor-pointer">
                {isPending ? "Đang tạo..." : "Thêm mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chỉnh sửa nhà cung cấp */}
      <Dialog open={editingSupplier !== null} onOpenChange={(o) => { if (!o) setEditingSupplier(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhà cung cấp</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết nhà cung cấp.
            </DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <form onSubmit={handleEdit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="escode">Mã NCC <span className="text-destructive">*</span></Label>
                <Input
                  id="escode"
                  name="code"
                  required
                  defaultValue={editingSupplier.code}
                  placeholder="NCC001"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="esname">Tên nhà cung cấp <span className="text-destructive">*</span></Label>
                <Input
                  id="esname"
                  name="name"
                  ref={editNameRef}
                  required
                  defaultValue={editingSupplier.name}
                  placeholder="Công ty TNHH Vật liệu xây dựng"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="estaxCode">Mã số thuế</Label>
                  {lookingUp && <span className="text-xs text-slate-400 animate-pulse">Đang tra cứu...</span>}
                </div>
                <Input
                  id="estaxCode"
                  name="taxCode"
                  onBlur={(e) => handleTaxBlur(e.target.value, editNameRef, editAddrRef)}
                  defaultValue={editingSupplier.taxCode || ""}
                  placeholder="Mã số thuế..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="esaddress">Địa chỉ</Label>
                <Input
                  id="esaddress"
                  name="address"
                  ref={editAddrRef}
                  defaultValue={editingSupplier.address || ""}
                  placeholder="Địa chỉ nhà cung cấp..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="escontact">Liên hệ</Label>
                <Input
                  id="escontact"
                  name="contact"
                  defaultValue={editingSupplier.contact || ""}
                  placeholder="Số điện thoại, email hoặc địa chỉ..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="esnote">Ghi chú</Label>
                <Input
                  id="esnote"
                  name="note"
                  defaultValue={editingSupplier.note || ""}
                  placeholder="Thông tin bổ sung..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSupplier(null)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Đang cập nhật..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
