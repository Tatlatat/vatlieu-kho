import { requireUser } from "@/lib/auth-helpers";
import { Nav } from "@/components/nav";
import { getUserPermissionSnapshot } from "@/lib/permissions/service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const permissions = await getUserPermissionSnapshot(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Nav
        role={user.role}
        name={user.name ?? "Người dùng"}
        permissionCodes={permissions.effectivePermissionCodes}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
