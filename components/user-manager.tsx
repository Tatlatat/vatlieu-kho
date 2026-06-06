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
import { createUser, updateUserRole, resetPassword } from "@/lib/actions/users";
import { toast } from "sonner";

type Role = "ADMIN" | "MANAGER" | "KEEPER";
const ROLE_LABEL: Record<Role, string> = { ADMIN: "Quản trị", MANAGER: "Quản lý", KEEPER: "Thủ kho" };

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date | string;
}

interface UserManagerProps {
  users: User[];
  currentUserId: string;
}

export function UserManager({ users, currentUserId }: UserManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [resettingUser, setResettingUser] = React.useState<User | null>(null);

  // State for form Select
  const [createRole, setCreateRole] = React.useState<Role>("KEEPER");

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const name = fd.get("name") as string;
    const password = fd.get("password") as string;

    startTransition(async () => {
      try {
        const res = await createUser({
          email,
          name,
          password,
          role: createRole,
        });
        if (res.ok) {
          toast.success("Đã thêm người dùng thành công");
          setIsCreateOpen(false);
          setCreateRole("KEEPER");
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleChangeRole = (user: User, newRole: Role) => {
    if (newRole === user.role) return;
    startTransition(async () => {
      try {
        const res = await updateUserRole(user.id, newRole);
        if (res.ok) {
          toast.success(`Đã cập nhật vai trò cho ${user.name}`);
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể kết nối máy chủ");
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resettingUser) return;
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;

    startTransition(async () => {
      try {
        const res = await resetPassword(resettingUser.id, newPassword);
        if (res.ok) {
          toast.success(`Đã đặt lại mật khẩu cho ${resettingUser.name}`);
          setResettingUser(null);
          router.refresh();
        } else {
          toast.error(res.error || "Có lỗi xảy ra");
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
          Thêm người dùng
        </Button>
      </div>

      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Chưa có người dùng nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">STT</TableHead>
                    <TableHead>Tên người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead className="w-[280px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, index) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/35 dark:text-blue-200"
                              : u.role === "MANAGER"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {u.id !== currentUserId ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                            disabled={isPending}
                            aria-label={`Đổi vai trò cho ${u.name}`}
                            className="inline-flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="ADMIN">Quản trị</option>
                            <option value="MANAGER">Quản lý</option>
                            <option value="KEEPER">Thủ kho</option>
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground italic px-2">
                            Tài khoản hiện tại
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResettingUser(u)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          Đặt lại mật khẩu
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

      {/* Dialog thêm mới người dùng */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng mới</DialogTitle>
            <DialogDescription>
              Nhập các thông tin để tạo tài khoản mới.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="cemail">Email</Label>
              <Input
                id="cemail"
                name="email"
                type="email"
                required
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cname">Họ và tên</Label>
              <Input
                id="cname"
                name="name"
                required
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cpassword">Mật khẩu</Label>
              <Input
                id="cpassword"
                name="password"
                type="password"
                required
                placeholder="Mật khẩu tối thiểu 6 ký tự"
                minLength={6}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="crole">Vai trò</Label>
              <select
                id="crole"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as Role)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ADMIN">Quản trị</option>
                <option value="MANAGER">Quản lý</option>
                <option value="KEEPER">Thủ kho</option>
              </select>
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

      {/* Dialog đặt lại mật khẩu */}
      <Dialog open={resettingUser !== null} onOpenChange={(o) => { if (!o) setResettingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho người dùng {resettingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          {resettingUser && (
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="rpassword">Mật khẩu mới</Label>
                <Input
                  id="rpassword"
                  name="newPassword"
                  type="password"
                  required
                  placeholder="Mật khẩu mới tối thiểu 6 ký tự"
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResettingUser(null)}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
