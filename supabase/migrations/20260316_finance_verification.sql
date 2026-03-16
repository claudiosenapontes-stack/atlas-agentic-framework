-- ATLAS-HARVEY-OPTIMUS-FINANCE-CANONICAL-SCHEMA-RECOVERY-011
-- VERIFICATION QUERIES
-- Run these after schema deployment to confirm alignment

-- ============================================
-- 1. VERIFY TABLES EXIST
-- ============================================
SELECT 
    table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    ) as exists
FROM (VALUES 
    ('budgets'), 
    ('invoices'), 
    ('contracts'), 
    ('approvals')
) AS t(table_name);

-- ============================================
-- 2. VERIFY BUDGETS COLUMNS
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
ORDER BY ordinal_position;

-- Expected: id, company_id, fiscal_year, category, allocated, spent, remaining, 
--           owner, created_by, status, alert_threshold, created_at, updated_at

-- ============================================
-- 3. VERIFY INVOICES COLUMNS
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Expected: id, company_id, invoice_number, vendor_name, vendor_email, amount, 
--           tax_amount, discount_amount, total_amount, currency, due_date, 
--           description, status, budget_id, line_items, document_url, paid_at,
--           created_by, created_at, updated_at

-- ============================================
-- 4. VERIFY CONTRACTS COLUMNS
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;

-- Expected: id, company_id, title, description, contract_type, counterparty,
--           counterparty_email, contract_value, currency, start_date, end_date,
--           renewal_terms, termination_clause, status, is_privileged,
--           privileged_reason, document_url, created_by, created_at, updated_at

-- ============================================
-- 5. VERIFY APPROVALS COLUMNS
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'approvals'
ORDER BY ordinal_position;

-- Expected: id, company_id, request_type, title, description, amount, currency,
--           requestor_id, requestor_name, approver_id, approver_name, budget_id,
--           related_invoice_id, related_contract_id, status, category,
--           requested_at, decided_at, notes, created_at, updated_at

-- ============================================
-- 6. VERIFY CONSTRAINTS
-- ============================================
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('budgets', 'invoices', 'contracts', 'approvals')
AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;

-- Expected check constraints on: budgets.status, invoices.status, contracts.status, approvals.status

-- ============================================
-- 7. VERIFY INDEXES
-- ============================================
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('budgets', 'invoices', 'contracts', 'approvals')
ORDER BY tablename, indexname;

-- Expected: company indexes, status indexes, foreign key indexes

-- ============================================
-- 8. TEST DATA INSERT (Dry Run Validation)
-- ============================================
-- Start transaction (will rollback)
BEGIN;

-- Test budget insert
INSERT INTO budgets (company_id, fiscal_year, category, allocated, created_by)
VALUES ('ARQIA', 2026, 'Test Budget', 1000, 'verification_script');

-- Verify insert
SELECT 'Budget insert: OK' as test, COUNT(*) as count 
FROM budgets WHERE category = 'Test Budget';

-- Rollback test data
ROLLBACK;

-- ============================================
-- 9. API COMPATIBILITY CHECK
-- ============================================
-- Verify all required API fields exist
SELECT 'API Field Check' as check_type,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'company_id') as budgets_company_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'fiscal_year') as budgets_fiscal_year,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'category') as budgets_category,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'allocated') as budgets_allocated,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'created_by') as budgets_created_by,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'company_id') as invoices_company_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'vendor_name') as invoices_vendor_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_number') as invoices_invoice_number,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'company_id') as contracts_company_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'counterparty') as contracts_counterparty,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'contract_type') as contracts_contract_type,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'company_id') as approvals_company_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'request_type') as approvals_request_type,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'requestor_id') as approvals_requestor_id;

-- ============================================
-- 10. FINAL STATUS
-- ============================================
SELECT 
    'Finance Schema Ready' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'budgets') as budgets_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'invoices') as invoices_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'contracts') as contracts_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'approvals') as approvals_table,
    NOW() as verified_at;
