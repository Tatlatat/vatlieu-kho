import { auth } from "@/auth";
import { hasOwnerAccess, normalizeAppRole, type AppRole } from "@/lib/roles";
import { getUserPermissionSnapshot, userHasPermission } from "@/lib/permissions/service";
import { redirect } from "next/navigation";
import { cache } from "react";

export type Role = AppRole;

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

/** Lấy user hiện tại, nếu chưa đăng nhập thì đẩy về /login. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: normalizeAppRole(session.user.role),
  };
});

/** Yêu cầu đúng vai trò, sai thì đẩy về trang chính. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (role === "OWNER" && !hasOwnerAccess(user.role)) redirect("/");
  if (role === "STAFF" && user.role !== "STAFF") redirect("/");
  return user;
}

/** Yêu cầu quyền chức năng; UI chỉ hỗ trợ, server action vẫn phải gọi helper này. */
export async function requirePermission(permissionCode: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await userHasPermission(user.id, permissionCode))) redirect("/");
  return user;
}

export async function can(userId: string, permissionCode: string): Promise<boolean> {
  return userHasPermission(userId, permissionCode);
}

export const getCurrentUserPermissionSnapshot = cache(async () => {
  const user = await requireUser();
  return getUserPermissionSnapshot(user.id);
});
