import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  ensurePermissionSeeded,
  getUserPermissionSnapshot,
  updateUserPermissions,
  userHasPermission,
} from "../lib/permissions/service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function main() {
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
