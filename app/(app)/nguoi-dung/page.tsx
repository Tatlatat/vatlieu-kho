import { requirePermission } from "@/lib/auth-helpers";
import { getPermissionManagementData } from "@/lib/permissions/service";
import { PermissionManager } from "@/components/permission-manager";

export default async function NguoiDungPage() {
  await requirePermission("permission.manage");
  const data = await getPermissionManagementData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Người dùng</h1>
        <p className="text-sm text-muted-foreground">Tạo người dùng và tick quyền chức năng.</p>
      </div>
      <PermissionManager data={data} />
    </div>
  );
}
