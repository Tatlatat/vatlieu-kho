import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type Role = "OWNER" | "STAFF";

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
  return session.user as unknown as SessionUser;
}

/** Yêu cầu đúng vai trò, sai thì đẩy về trang chính. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}
