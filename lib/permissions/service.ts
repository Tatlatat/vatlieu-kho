import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasOwnerAccess } from "@/lib/roles";
import {
  KNOWN_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
  POSITION_PRESETS,
  type PositionCode,
} from "@/lib/permissions/catalog";
import {
  calculateEffectivePermissionCodes,
  canAccessPermission,
  normalizePermissionCodes,
} from "@/lib/permissions/effective";

type PermissionDb = PrismaClient | Prisma.TransactionClient;

export interface UserPermissionSnapshot {
  userId: string;
  role: string;
  isOwner: boolean;
  positionCodes: string[];
  allowOverrideCodes: string[];
  denyOverrideCodes: string[];
  effectivePermissionCodes: string[];
}

export interface PermissionManagementUser extends UserPermissionSnapshot {
  email: string;
  name: string;
}

export interface PermissionManagementData {
  permissions: typeof PERMISSION_DEFINITIONS;
  positions: Array<{
    code: PositionCode;
    name: string;
    description: string;
    permissionCodes: string[];
  }>;
  users: PermissionManagementUser[];
}

export interface UpdateUserPermissionsInput {
  targetUserId: string;
  positionCodes: string[];
  allowCodes: string[];
  denyCodes: string[];
  actorUserId: string;
}

function knownPositionCodes(codes: string[]): PositionCode[] {
  return Array.from(
    new Set(codes.filter((code): code is PositionCode => code in POSITION_PRESETS))
  ).sort();
}

function normalizeOverrides(codes: string[]): string[] {
  return normalizePermissionCodes(codes);
}

function positionPresets() {
  return Object.values(POSITION_PRESETS);
}

export async function ensurePermissionSeeded(db: PermissionDb = prisma): Promise<void> {
  for (const permission of PERMISSION_DEFINITIONS) {
    await db.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        category: permission.category,
        description: permission.description,
      },
      create: {
        code: permission.code,
        name: permission.name,
        category: permission.category,
        description: permission.description,
      },
    });
  }

  for (const preset of positionPresets()) {
    const position = await db.userPosition.upsert({
      where: { code: preset.code },
      update: {
        name: preset.name,
        description: preset.description,
      },
      create: {
        code: preset.code,
        name: preset.name,
        description: preset.description,
      },
    });

    const permissions = await db.permission.findMany({
      where: { code: { in: preset.permissionCodes } },
      select: { id: true },
    });

    await db.positionPermission.deleteMany({ where: { positionId: position.id } });
    if (permissions.length > 0) {
      await db.positionPermission.createMany({
        data: permissions.map((permission) => ({
          positionId: position.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  const defaultPositions = await db.userPosition.findMany({
    where: { code: { in: ["ADMIN", "THU_KHO"] } },
    select: { id: true, code: true },
  });
  const adminPositionId = defaultPositions.find((position) => position.code === "ADMIN")?.id;
  const keeperPositionId = defaultPositions.find((position) => position.code === "THU_KHO")?.id;
  if (!adminPositionId || !keeperPositionId) return;

  const unconfiguredUsers = await db.user.findMany({
    select: {
      id: true,
      role: true,
      positionAssignments: { select: { id: true }, take: 1 },
      permissionOverrides: { select: { id: true }, take: 1 },
    },
  });
  for (const user of unconfiguredUsers) {
    if (user.positionAssignments.length > 0 || user.permissionOverrides.length > 0) continue;
    await db.userPositionAssignment.create({
      data: {
        userId: user.id,
        positionId: hasOwnerAccess(user.role) ? adminPositionId : keeperPositionId,
      },
    });
  }
}

async function getSnapshotFromUser(userId: string, db: PermissionDb): Promise<UserPermissionSnapshot | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      positionAssignments: {
        include: {
          position: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      permissionOverrides: {
        include: { permission: true },
      },
    },
  });
  if (!user) return null;

  const isOwner = hasOwnerAccess(user.role);
  const positionCodes = user.positionAssignments
    .map((assignment) => assignment.position.code)
    .sort();
  const positionPermissionCodes = user.positionAssignments.flatMap((assignment) =>
    assignment.position.permissions.map((positionPermission) => positionPermission.permission.code)
  );
  const allowOverrideCodes = user.permissionOverrides
    .filter((override) => override.effect === "ALLOW")
    .map((override) => override.permission.code)
    .sort();
  const denyOverrideCodes = user.permissionOverrides
    .filter((override) => override.effect === "DENY")
    .map((override) => override.permission.code)
    .sort();

  return {
    userId: user.id,
    role: user.role,
    isOwner,
    positionCodes,
    allowOverrideCodes,
    denyOverrideCodes,
    effectivePermissionCodes: calculateEffectivePermissionCodes({
      isOwner,
      positionPermissionCodes,
      allowOverrideCodes,
      denyOverrideCodes,
    }),
  };
}

export async function getUserPermissionSnapshot(
  userId: string,
  db: PermissionDb = prisma
): Promise<UserPermissionSnapshot> {
  await ensurePermissionSeeded(db);
  const snapshot = await getSnapshotFromUser(userId, db);
  if (!snapshot) throw new Error("Không tìm thấy người dùng");
  return snapshot;
}

export async function userHasPermission(userId: string, code: string): Promise<boolean> {
  if (!KNOWN_PERMISSION_CODES.has(code)) return false;
  const snapshot = await getUserPermissionSnapshot(userId);
  return canAccessPermission(snapshot, code);
}

async function assertPermissionManagerInvariant(db: Prisma.TransactionClient): Promise<void> {
  const owner = await db.user.findFirst({
    where: { role: "OWNER" },
    select: { id: true },
  });
  if (owner) return;

  const managerPermission = await db.permission.findUnique({
    where: { code: "permission.manage" },
    select: { id: true },
  });
  if (!managerPermission) {
    throw new Error("Thiếu quyền permission.manage trong hệ thống");
  }

  const users = await db.user.findMany({ select: { id: true } });
  for (const user of users) {
    const snapshot = await getSnapshotFromUser(user.id, db);
    if (snapshot && canAccessPermission(snapshot, "permission.manage")) return;
  }

  throw new Error("Hệ thống phải còn ít nhất một người có quyền phân quyền");
}

export async function updateUserPermissions(input: UpdateUserPermissionsInput): Promise<void> {
  const positionCodes = knownPositionCodes(input.positionCodes);
  const denyCodes = normalizeOverrides(input.denyCodes);
  const allowCodes = normalizeOverrides(input.allowCodes).filter((code) => !denyCodes.includes(code));

  await prisma.$transaction(async (tx) => {
    await ensurePermissionSeeded(tx);

    const [actor, target] = await Promise.all([
      getSnapshotFromUser(input.actorUserId, tx),
      tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true, role: true } }),
    ]);
    if (!actor || !canAccessPermission(actor, "permission.manage")) {
      throw new Error("Bạn không có quyền phân quyền");
    }
    if (!target) throw new Error("Không tìm thấy người dùng cần phân quyền");

    await tx.userPositionAssignment.deleteMany({ where: { userId: input.targetUserId } });
    if (positionCodes.length > 0) {
      const positions = await tx.userPosition.findMany({
        where: { code: { in: positionCodes } },
        select: { id: true },
      });
      await tx.userPositionAssignment.createMany({
        data: positions.map((position) => ({
          userId: input.targetUserId,
          positionId: position.id,
        })),
        skipDuplicates: true,
      });
    }

    await tx.userPermissionOverride.deleteMany({ where: { userId: input.targetUserId } });
    const overrideCodes = [...allowCodes, ...denyCodes];
    if (overrideCodes.length > 0) {
      const permissions = await tx.permission.findMany({
        where: { code: { in: overrideCodes } },
        select: { id: true, code: true },
      });
      await tx.userPermissionOverride.createMany({
        data: permissions.map((permission) => ({
          userId: input.targetUserId,
          permissionId: permission.id,
          effect: allowCodes.includes(permission.code) ? "ALLOW" : "DENY",
        })),
        skipDuplicates: true,
      });
    }

    await assertPermissionManagerInvariant(tx);
  });
}

export async function getPermissionManagementData(): Promise<PermissionManagementData> {
  await ensurePermissionSeeded();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, email: true, name: true },
  });
  const snapshots = await Promise.all(
    users.map(async (user) => ({
      ...user,
      ...(await getUserPermissionSnapshot(user.id)),
    }))
  );

  return {
    permissions: PERMISSION_DEFINITIONS,
    positions: positionPresets().map((position) => ({
      code: position.code as PositionCode,
      name: position.name,
      description: position.description,
      permissionCodes: [...position.permissionCodes],
    })),
    users: snapshots,
  };
}
