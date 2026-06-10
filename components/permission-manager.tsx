"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction, updateUserPermissionAction } from "@/lib/actions/permissions";
import type { PermissionManagementData, PermissionManagementUser } from "@/lib/permissions/service";

type PermissionDefinition = PermissionManagementData["permissions"][number];
type PositionDefinition = PermissionManagementData["positions"][number];

function groupPermissions(permissions: readonly PermissionDefinition[]) {
  const groups = new Map<string, PermissionDefinition[]>();
  for (const permission of permissions) {
    const items = groups.get(permission.category) ?? [];
    items.push(permission);
    groups.set(permission.category, items);
  }
  return Array.from(groups.entries());
}

function basePermissionsForPositions(
  positions: readonly PositionDefinition[],
  positionCodes: readonly string[]
) {
  const selected = new Set(positionCodes);
  return new Set(
    positions
      .filter((position) => selected.has(position.code))
      .flatMap((position) => position.permissionCodes)
  );
}

function UserPermissionCard({
  user,
  permissions,
  positions,
}: {
  user: PermissionManagementUser;
  permissions: readonly PermissionDefinition[];
  positions: readonly PositionDefinition[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [positionCodes, setPositionCodes] = React.useState<string[]>(user.positionCodes);
  const [checkedCodes, setCheckedCodes] = React.useState<Set<string>>(
    () => new Set(user.effectivePermissionCodes)
  );

  const isOwner = user.isOwner;
  const permissionGroups = React.useMemo(() => groupPermissions(permissions), [permissions]);

  function togglePosition(code: string, checked: boolean) {
    setPositionCodes((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return Array.from(next).sort();
    });
  }

  function togglePermission(code: string, checked: boolean) {
    setCheckedCodes((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const baseCodes = basePermissionsForPositions(positions, positionCodes);
    const formData = new FormData();
    formData.set("targetUserId", user.userId);
    for (const code of positionCodes) formData.append("positionCodes", code);
    for (const code of checkedCodes) {
      if (!baseCodes.has(code)) formData.append("allowCodes", code);
    }
    for (const code of baseCodes) {
      if (!checkedCodes.has(code)) formData.append("denyCodes", code);
    }

    startTransition(async () => {
      const result = await updateUserPermissionAction(formData);
      if (result.ok) {
        toast.success("Đã cập nhật phân quyền");
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể cập nhật phân quyền");
      }
    });
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{user.name}</CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
        </div>
        <Badge variant={isOwner ? "default" : "outline"}>{isOwner ? "OWNER" : "STAFF"}</Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {positions.map((position) => (
              <label
                key={position.code}
                className="flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4"
                  disabled={isOwner || isPending}
                  checked={isOwner ? position.code === "ADMIN" : positionCodes.includes(position.code)}
                  onChange={(event) => togglePosition(position.code, event.target.checked)}
                />
                <span>{position.name}</span>
              </label>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {permissionGroups.map(([category, items]) => (
              <div key={category} className="rounded-md border p-3">
                <div className="mb-3 text-sm font-semibold">{category}</div>
                <div className="space-y-2">
                  {items.map((permission) => (
                    <label key={permission.code} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4"
                        disabled={isOwner || isPending}
                        checked={isOwner || checkedCodes.has(permission.code)}
                        onChange={(event) => togglePermission(permission.code, event.target.checked)}
                      />
                      <span>
                        <span className="font-medium">{permission.name}</span>
                        <span className="block text-xs text-muted-foreground">{permission.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isOwner || isPending}>
              {isPending ? "Đang lưu..." : "Lưu phân quyền"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PermissionManager({ data }: { data: PermissionManagementData }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result.ok) {
        toast.success("Đã tạo người dùng");
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể tạo người dùng");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-blue-600 text-white">
            <UserPlus className="size-5" />
          </div>
          <CardTitle className="text-lg">Tạo người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="new-user-name">Tên</Label>
              <Input id="new-user-name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-password">Mật khẩu</Label>
              <Input id="new-user-password" name="password" type="password" minLength={6} required />
            </div>
            <div className="flex items-end">
              <input type="hidden" name="positionCodes" value="THU_KHO" />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Đang tạo..." : "Tạo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Phân quyền người dùng</h2>
      </div>

      <div className="space-y-4">
        {data.users.map((user) => (
          <UserPermissionCard
            key={`${user.userId}:${user.positionCodes.join(",")}:${user.effectivePermissionCodes.join(",")}`}
            user={user}
            permissions={data.permissions}
            positions={data.positions}
          />
        ))}
      </div>
    </div>
  );
}
