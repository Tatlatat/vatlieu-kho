DO $$
BEGIN
  CREATE TYPE "UserPermissionEffect" AS ENUM ('ALLOW', 'DENY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPosition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PositionPermission" (
  "id" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PositionPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPositionAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPositionAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPermissionOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "effect" "UserPermissionEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPosition_code_key" ON "UserPosition"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "PositionPermission_positionId_permissionId_key" ON "PositionPermission"("positionId", "permissionId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPositionAssignment_userId_positionId_key" ON "UserPositionAssignment"("userId", "positionId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPermissionOverride_userId_permissionId_key" ON "UserPermissionOverride"("userId", "permissionId");

CREATE INDEX IF NOT EXISTS "PositionPermission_permissionId_idx" ON "PositionPermission"("permissionId");
CREATE INDEX IF NOT EXISTS "UserPositionAssignment_positionId_idx" ON "UserPositionAssignment"("positionId");
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_permissionId_idx" ON "UserPermissionOverride"("permissionId");
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_effect_idx" ON "UserPermissionOverride"("effect");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PositionPermission_positionId_fkey'
  ) THEN
    ALTER TABLE "PositionPermission"
      ADD CONSTRAINT "PositionPermission_positionId_fkey"
      FOREIGN KEY ("positionId") REFERENCES "UserPosition"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PositionPermission_permissionId_fkey'
  ) THEN
    ALTER TABLE "PositionPermission"
      ADD CONSTRAINT "PositionPermission_permissionId_fkey"
      FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPositionAssignment_userId_fkey'
  ) THEN
    ALTER TABLE "UserPositionAssignment"
      ADD CONSTRAINT "UserPositionAssignment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPositionAssignment_positionId_fkey'
  ) THEN
    ALTER TABLE "UserPositionAssignment"
      ADD CONSTRAINT "UserPositionAssignment_positionId_fkey"
      FOREIGN KEY ("positionId") REFERENCES "UserPosition"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionOverride_userId_fkey'
  ) THEN
    ALTER TABLE "UserPermissionOverride"
      ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionOverride_permissionId_fkey'
  ) THEN
    ALTER TABLE "UserPermissionOverride"
      ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey"
      FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
