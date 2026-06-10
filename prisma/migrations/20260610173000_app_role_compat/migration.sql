DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_app') THEN
      EXECUTE 'DROP TYPE "Role_app"';
    END IF;

    EXECUTE 'CREATE TYPE "Role_app" AS ENUM (''OWNER'', ''STAFF'')';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = 'role'
    ) THEN
      EXECUTE 'ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT';
      EXECUTE 'ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_app" USING (
        CASE
          WHEN "role"::text IN (''OWNER'', ''ADMIN'') THEN ''OWNER''
          ELSE ''STAFF''
        END
      )::"Role_app"';
      EXECUTE 'ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT ''STAFF''::"Role_app"';
    END IF;

    EXECUTE 'DROP TYPE "Role"';
    EXECUTE 'ALTER TYPE "Role_app" RENAME TO "Role"';
  END IF;
END $$;
