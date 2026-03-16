-- ATLAS-HARVEY-OPTIMUS-FINANCE-CANONICAL-SCHEMA-RECOVERY-011
-- PHASE 1 PATCH ALIGNMENT
-- Run this SECOND (after base schema) if additional alignment needed

-- NOTE: The following fields are ALREADY included in base schema:
-- - budgets.name (mapped to 'category' for UI compatibility)
-- - budgets.status (with check constraint)
-- - invoices.status (with check constraint including 'disputed')
-- - contracts.title (as 'title')
-- - contracts.status (with check constraint including 'negotiating')
-- - approvals.company_id (required field)

-- ============================================
-- ALIGNMENT PATCHES (if base schema differs from API expectations)
-- ============================================

-- Patch 1: Add 'name' column to budgets if UI expects it separately
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS name VARCHAR(200) GENERATED ALWAYS AS (category) STORED;

-- Patch 2: Ensure invoices.status includes all workflow states
-- (Already covered in base schema: pending, approved, paid, overdue, disputed)
DO $$
BEGIN
    -- Validate constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'invoices' AND constraint_name LIKE '%status%'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
        CHECK (status IN ('pending', 'approved', 'paid', 'overdue', 'disputed'));
    END IF;
END $$;

-- Patch 3: Ensure contracts.status includes 'negotiating'
-- (Already covered in base schema: draft, negotiating, active, expired, terminated)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'contracts' AND constraint_name LIKE '%status%'
    ) THEN
        ALTER TABLE contracts ADD CONSTRAINT contracts_status_check 
        CHECK (status IN ('draft', 'negotiating', 'active', 'expired', 'terminated'));
    END IF;
END $$;

-- Patch 4: Add display_name virtual column for UI compatibility
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(300) GENERATED ALWAYS AS (
    category || ' (' || fiscal_year || ')'
) STORED;

-- Patch 5: Add remaining calculation for budgets (if not auto-generated)
-- (Already covered in base schema as GENERATED COLUMN)

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Seed budget for ARQIA if empty
INSERT INTO budgets (company_id, fiscal_year, category, allocated, owner, created_by, status)
SELECT 'ARQIA', 2026, 'Operations', 100000, 'Harvey', 'system', 'active'
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE company_id = 'ARQIA' LIMIT 1);

INSERT INTO budgets (company_id, fiscal_year, category, allocated, owner, created_by, status)
SELECT 'ARQIA', 2026, 'Technology', 150000, 'Optimus', 'system', 'active'
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE category = 'Technology' LIMIT 1);

INSERT INTO budgets (company_id, fiscal_year, category, allocated, owner, created_by, status)
SELECT 'ARQIA', 2026, 'Legal & Compliance', 75000, 'Harvey', 'system', 'active'
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE category = 'Legal & Compliance' LIMIT 1);

-- ============================================
-- VERIFICATION: Mark schema as aligned
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(200) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(100)
);

INSERT INTO schema_migrations (migration_name, applied_by)
VALUES ('20260316_finance_phase1_alignment', 'ATLAS-HARVEY-OPTIMUS')
ON CONFLICT (migration_name) DO UPDATE SET applied_at = NOW();
