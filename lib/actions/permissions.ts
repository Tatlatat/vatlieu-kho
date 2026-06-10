"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { parsePermissionUpdateForm } from "@/lib/permissions/forms";
import { ensurePermissionSeeded, updateUserPermissions } from "@/lib/permissions/service";
import type { ActionResult } from "@/lib/actions/movements";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidatePermissionPaths() {
  revalidatePath("/");
  revalidatePath("/nguoi-dung");
  revalidatePath("/vat-lieu");
  revalidatePath("/cong-trinh");
  revalidatePath("/bao-cao");
  revalidatePath("/nhap");
  revalidatePath("/xuat");
  revalidatePath("/chuyen-kho");
  revalidatePath("/kiem-ke");
  revalidatePath("/lich-su");
}

export async function updateUserPermissionAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("permission.manage");

  try {
    const parsed = parsePermissionUpdateForm(formData);
    await updateUserPermissions({
      ...parsed,
      actorUserId: actor.id,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể cập nhật phân quyền" };
  }

  revalidatePermissionPaths();
  return { ok: true };
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("user.manage");
  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");

  if (!name) return { ok: false, error: "Vui lòng nhập tên người dùng" };
  if (!email || !email.includes("@")) return { ok: false, error: "Email không hợp lệ" };
  if (password.length < 6) return { ok: false, error: "Mật khẩu phải có ít nhất 6 ký tự" };

  try {
    await ensurePermissionSeeded();
    const duplicate = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (duplicate) return { ok: false, error: "Email này đã tồn tại" };

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "STAFF",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    const permissionForm = new FormData();
    permissionForm.set("targetUserId", user.id);
    const positionCodes = formData.getAll("positionCodes");
    if (positionCodes.length === 0) {
      permissionForm.append("positionCodes", "THU_KHO");
    } else {
      for (const code of positionCodes) {
        if (typeof code === "string") permissionForm.append("positionCodes", code);
      }
    }
    const parsed = parsePermissionUpdateForm(permissionForm);
    await updateUserPermissions({
      ...parsed,
      actorUserId: actor.id,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể tạo người dùng" };
  }

  revalidatePermissionPaths();
  return { ok: true };
}
