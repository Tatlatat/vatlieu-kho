"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createUserSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/movements";

/** Tạo tài khoản mới (OWNER). Mật khẩu băm bcrypt cost 10 (khớp auth.ts/seed). */
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: "OWNER" | "STAFF";
}): Promise<ActionResult> {
  await requireRole("OWNER");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { ok: false, error: `Email "${d.email}" đã được dùng.` };

  const passwordHash = await bcrypt.hash(d.password, 10);
  await prisma.user.create({
    data: { email: d.email, name: d.name, role: d.role, passwordHash },
  });
  revalidatePath("/nguoi-dung");
  return { ok: true };
}

/** Đổi vai trò user (OWNER). CHẶN tự hạ quyền chính mình (tránh khóa hệ thống). */
export async function updateUserRole(
  id: string,
  role: "OWNER" | "STAFF"
): Promise<ActionResult> {
  const me = await requireRole("OWNER");
  if (id === me.id && role !== "OWNER") {
    return { ok: false, error: "Không thể tự hạ quyền chính mình." };
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, error: "Không tìm thấy người dùng" };

  // Không cho hạ OWNER cuối cùng xuống STAFF (tránh mất quyền quản trị).
  if (user.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.user.count({ where: { role: "OWNER" } });
    if (ownerCount <= 1) return { ok: false, error: "Phải còn ít nhất 1 chủ tài khoản." };
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/nguoi-dung");
  return { ok: true };
}

/** Đặt lại mật khẩu cho user (OWNER). */
export async function resetPassword(id: string, newPassword: string): Promise<ActionResult> {
  await requireRole("OWNER");
  if (!newPassword || newPassword.length < 6)
    return { ok: false, error: "Mật khẩu tối thiểu 6 ký tự" };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, error: "Không tìm thấy người dùng" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/nguoi-dung");
  return { ok: true };
}
