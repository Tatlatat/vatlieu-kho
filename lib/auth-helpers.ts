import { auth } from "@/auth";
import { hasOwnerAccess, normalizeAppRole, type AppRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export type Role = AppRole;

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

/** Lấy user hiện tại, nếu chưa đăng nhập thì đẩy về /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: normalizeAppRole(session.user.role),
  };
}

/** Yêu cầu đúng vai trò, sai thì đẩy về trang chính. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (role === "OWNER" && !hasOwnerAccess(user.role)) redirect("/");
  if (role === "STAFF" && user.role !== "STAFF") redirect("/");
  return user;
}
