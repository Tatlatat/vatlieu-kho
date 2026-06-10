-- Harden Supabase public schema for a server-rendered Prisma application.
-- The app connects through the database owner; browser clients must not access
-- accounting/inventory tables through Supabase anon/authenticated API roles.

-- ---------------------------------------------------------------------------
-- 1) Add indexes for foreign keys that Supabase Performance Advisor reports.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "StockMovement_createdById_idx" ON "StockMovement"("createdById");
CREATE INDEX IF NOT EXISTS "InventoryDocument_updatedById_idx" ON "InventoryDocument"("updatedById");
CREATE INDEX IF NOT EXISTS "InventoryDocument_postedById_idx" ON "InventoryDocument"("postedById");
CREATE INDEX IF NOT EXISTS "InventoryDocument_voidedById_idx" ON "InventoryDocument"("voidedById");
CREATE INDEX IF NOT EXISTS "MaterialNorm_createdById_idx" ON "MaterialNorm"("createdById");
CREATE INDEX IF NOT EXISTS "MaterialNorm_updatedById_idx" ON "MaterialNorm"("updatedById");
CREATE INDEX IF NOT EXISTS "FundDocument_postedById_idx" ON "FundDocument"("postedById");
CREATE INDEX IF NOT EXISTS "FundDocument_voidedById_idx" ON "FundDocument"("voidedById");
CREATE INDEX IF NOT EXISTS "Stocktake_warehouseId_idx" ON "Stocktake"("warehouseId");
CREATE INDEX IF NOT EXISTS "Stocktake_createdById_idx" ON "Stocktake"("createdById");
CREATE INDEX IF NOT EXISTS "Stocktake_approvedById_idx" ON "Stocktake"("approvedById");
CREATE INDEX IF NOT EXISTS "StocktakeItem_stocktakeId_idx" ON "StocktakeItem"("stocktakeId");
CREATE INDEX IF NOT EXISTS "StocktakeItem_materialId_idx" ON "StocktakeItem"("materialId");

-- Legacy tables still exist in deployed databases from the initial iteration.
-- Keep them indexed too so production advisors stay quiet while old data is
-- retained for audit/history.
DO $$
BEGIN
  IF to_regclass('public."CashEntry"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "CashEntry_createdById_idx" ON "CashEntry"("createdById");
    CREATE INDEX IF NOT EXISTS "CashEntry_voidedById_idx" ON "CashEntry"("voidedById");
  END IF;

  IF to_regclass('public."Document"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "Document_approvedById_idx" ON "Document"("approvedById");
    CREATE INDEX IF NOT EXISTS "Document_createdById_idx" ON "Document"("createdById");
    CREATE INDEX IF NOT EXISTS "Document_fromWarehouseId_idx" ON "Document"("fromWarehouseId");
    CREATE INDEX IF NOT EXISTS "Document_supplierId_idx" ON "Document"("supplierId");
    CREATE INDEX IF NOT EXISTS "Document_toWarehouseId_idx" ON "Document"("toWarehouseId");
    CREATE INDEX IF NOT EXISTS "Document_voidedById_idx" ON "Document"("voidedById");
    CREATE INDEX IF NOT EXISTS "Document_warehouseId_idx" ON "Document"("warehouseId");
  END IF;

  IF to_regclass('public."DocumentLine"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "DocumentLine_materialId_idx" ON "DocumentLine"("materialId");
  END IF;

  IF to_regclass('public."EquipmentLog"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "EquipmentLog_createdById_idx" ON "EquipmentLog"("createdById");
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Lock public schema access for Supabase API roles.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', role_name);

      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', role_name);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Enable RLS and make the API-deny policy explicit on every public table.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  table_record record;
  api_roles_exist boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    INTO api_roles_exist;

  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );

    IF api_roles_exist THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "deny_api_access" ON %I.%I',
        table_record.schemaname,
        table_record.tablename
      );
      EXECUTE format(
        'CREATE POLICY "deny_api_access" ON %I.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        table_record.schemaname,
        table_record.tablename
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Fix mutable search_path warning for public PL/pgSQL functions.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.fn_apply_stocktake_adjustments()') IS NOT NULL THEN
    ALTER FUNCTION public.fn_apply_stocktake_adjustments() SET search_path = public, pg_temp;
  END IF;
END $$;
