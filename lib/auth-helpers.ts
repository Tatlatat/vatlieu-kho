import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type Role = "ADMIN" | "MANAGER" | "KEEPER";

/** Cấp vai trò (phân cấp lồng nhau): ADMIN ⊃ MANAGER ⊃ KEEPER. */
const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };

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

/** Yêu cầu cấp >= minRole (phân cấp lồng nhau). Thấp hơn thì đẩy về trang chính. */
export async function requireAtLeast(minRole: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) redirect("/");
  return user;
}

/** Nhãn vai trò tiếng Việt (dùng ở UI). */
export function roleLabel(role: Role): string {
  return role === "ADMIN" ? "Quản trị" : role === "MANAGER" ? "Quản lý" : "Thủ kho";
}
