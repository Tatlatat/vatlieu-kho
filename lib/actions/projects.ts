"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/actions/movements";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseNormQty(formData: FormData): number {
  const raw = formString(formData, "normQty");
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value < 0) {
    throw new Error("Định mức phải là số không âm");
  }
  return value;
}

function validateCode(code: string, label: string): string {
  if (!code) throw new Error(`Vui lòng nhập ${label}`);
  return code;
}

async function uniqueFundCode(baseCode: string): Promise<string> {
  const base = `QUY-${baseCode}`;
  const existing = await prisma.fund.findUnique({ where: { code: base } });
  return existing ? `${base}-${Date.now().toString(36).toUpperCase()}` : base;
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  await requirePermission("project.manage");

  const code = validateCode(formString(formData, "code"), "mã công trình");
  const name = formString(formData, "name");
  const warehouseId = formString(formData, "warehouseId") || null;
  const note = formString(formData, "note") || null;
  if (!name) return { ok: false, error: "Vui lòng nhập tên công trình" };
  if (!warehouseId) return { ok: false, error: "Vui lòng chọn kho của công trình" };

  const duplicate = await prisma.project.findUnique({ where: { code } });
  if (duplicate) return { ok: false, error: `Mã công trình "${code}" đã tồn tại` };

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) return { ok: false, error: "Kho công trình không tồn tại" };
  const fundCode = await uniqueFundCode(code);

  await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        code,
        name,
        warehouseId,
        note,
        workItems: {
          create: {
            code: "CHUNG",
            name: "Chung",
            isDefault: true,
          },
        },
      },
    });

    await tx.fund.create({
      data: {
        code: fundCode,
        name: `Quỹ ${name}`,
        projectId: project.id,
      },
    });
  });

  revalidatePath("/cong-trinh");
  revalidatePath("/vat-lieu");
  revalidatePath("/xuat/moi");
  return { ok: true };
}

export async function updateProject(projectId: string, formData: FormData): Promise<ActionResult> {
  await requirePermission("project.manage");

  const code = validateCode(formString(formData, "code"), "mã công trình");
  const name = formString(formData, "name");
  const warehouseId = formString(formData, "warehouseId") || null;
  const status = formString(formData, "status");
  const note = formString(formData, "note") || null;
  if (!name) return { ok: false, error: "Vui lòng nhập tên công trình" };
  if (!warehouseId) return { ok: false, error: "Vui lòng chọn kho của công trình" };
  if (status !== "ACTIVE" && status !== "CLOSED") {
    return { ok: false, error: "Trạng thái công trình không hợp lệ" };
  }

  const duplicate = await prisma.project.findFirst({
    where: { code, NOT: { id: projectId } },
  });
  if (duplicate) return { ok: false, error: `Mã công trình "${code}" đã được dùng` };

  await prisma.project.update({
    where: { id: projectId },
    data: { code, name, warehouseId, status, note },
  });

  revalidatePath("/cong-trinh");
  revalidatePath("/vat-lieu");
  revalidatePath("/xuat/moi");
  revalidatePath(`/cong-trinh?project=${projectId}`);
  return { ok: true };
}

export async function createProjectWorkItem(formData: FormData): Promise<ActionResult> {
  await requirePermission("project.manage");

  const projectId = formString(formData, "projectId");
  const code = formString(formData, "code") || null;
  const name = formString(formData, "name");
  if (!projectId) return { ok: false, error: "Thiếu công trình" };
  if (!name) return { ok: false, error: "Vui lòng nhập tên hạng mục" };

  try {
    await prisma.projectWorkItem.create({
      data: {
        projectId,
        code,
        name,
        isDefault: false,
      },
    });
  } catch {
    return { ok: false, error: "Không thể tạo hạng mục. Tên hạng mục có thể đã tồn tại." };
  }

  revalidatePath("/cong-trinh");
  revalidatePath("/vat-lieu");
  revalidatePath("/xuat/moi");
  return { ok: true };
}

export async function upsertMaterialNorm(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("norm.manage");

  try {
    const projectId = formString(formData, "projectId");
    const workItemId = formString(formData, "workItemId");
    const materialId = formString(formData, "materialId");
    const note = formString(formData, "note") || null;
    const normQty = parseNormQty(formData);

    if (!projectId) throw new Error("Thiếu công trình");
    if (!workItemId) throw new Error("Thiếu hạng mục");
    if (!materialId) throw new Error("Vui lòng chọn vật tư");

    const workItem = await prisma.projectWorkItem.findUnique({
      where: { id: workItemId },
      select: { projectId: true },
    });
    if (!workItem || workItem.projectId !== projectId) {
      throw new Error("Hạng mục không thuộc công trình đã chọn");
    }

    await prisma.materialNorm.upsert({
      where: { workItemId_materialId: { workItemId, materialId } },
      update: {
        projectId,
        normQty,
        note,
        updatedById: user.id,
      },
      create: {
        projectId,
        workItemId,
        materialId,
        normQty,
        note,
        createdById: user.id,
      },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể lưu định mức" };
  }

  revalidatePath("/cong-trinh");
  revalidatePath("/vat-lieu");
  return { ok: true };
}
