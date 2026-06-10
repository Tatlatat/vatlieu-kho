import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  ensurePermissionSeeded,
  getUserPermissionSnapshot,
  updateUserPermissions,
  userHasPermission,
} from "../lib/permissions/service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function assertSnapshotReadDoesNotSeedPermissions() {
  let seedAttemptCount = 0;
  const readOnlyDb = {
    permission: {
      upsert: async () => {
        seedAttemptCount += 1;
        throw new Error("Snapshot read attempted to seed permissions");
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        role: "STAFF",
        positionAssignments: [
          {
            position: {
              code: "THU_KHO",
              permissions: [{ permission: { code: "inventory.import.create" } }],
            },
          },
        ],
        permissionOverrides: [],
      }),
    },
  } as unknown as NonNullable<Parameters<typeof getUserPermissionSnapshot>[1]>;

  const snapshot = await getUserPermissionSnapshot("read-only-user", readOnlyDb);

  assert.equal(seedAttemptCount, 0);
  assert.deepEqual(snapshot.effectivePermissionCodes, ["inventory.import.create"]);
}

async function main() {
  await assertSnapshotReadDoesNotSeedPermissions();

  const owner = await prisma.user.create({
    data: {
      email: `perm-owner-${suffix}@example.com`,
      name: "Permission Owner",
      role: "OWNER",
      passwordHash: "x",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: `perm-staff-${suffix}@example.com`,
      name: "Permission Staff",
      role: "STAFF",
      passwordHash: "x",
    },
  });

  try {
    await ensurePermissionSeeded();

    assert.equal(await userHasPermission(owner.id, "permission.manage"), true);
    assert.equal(await userHasPermission(owner.id, "unknown.permission"), false);

    const fallbackSnapshot = await getUserPermissionSnapshot(staff.id);
    assert.deepEqual(fallbackSnapshot.positionCodes, ["THU_KHO"]);
    assert.equal(fallbackSnapshot.effectivePermissionCodes.includes("inventory.import.create"), true);

    await updateUserPermissions({
      targetUserId: staff.id,
      positionCodes: ["THU_KHO"],
      allowCodes: ["fund.view"],
      denyCodes: ["inventory.export.create"],
      actorUserId: owner.id,
    });

    const snapshot = await getUserPermissionSnapshot(staff.id);
    assert.equal(snapshot.isOwner, false);
    assert.deepEqual(snapshot.positionCodes, ["THU_KHO"]);
    assert.equal(snapshot.effectivePermissionCodes.includes("inventory.import.create"), true);
    assert.equal(snapshot.effectivePermissionCodes.includes("fund.view"), true);
    assert.equal(snapshot.effectivePermissionCodes.includes("inventory.export.create"), false);
    assert.equal(await userHasPermission(staff.id, "fund.view"), true);
    assert.equal(await userHasPermission(staff.id, "permission.manage"), false);

    const ownerSnapshot = await getUserPermissionSnapshot(owner.id);
    assert.equal(ownerSnapshot.isOwner, true);
    assert.equal(ownerSnapshot.effectivePermissionCodes.includes("permission.manage"), true);
    assert.equal(ownerSnapshot.denyOverrideCodes.length, 0);

    console.log("permission-service tests passed");
  } finally {
    await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: [owner.id, staff.id] } } });
    await prisma.userPositionAssignment.deleteMany({ where: { userId: { in: [owner.id, staff.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, staff.id] } } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
