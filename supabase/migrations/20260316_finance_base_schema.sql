-- ATLAS-HARVEY-OPTIMUS-FINANCE-CANONICAL-SCHEMA-RECOVERY-011
-- BASE SCHEMA: Create core finance tables from scratch
-- Run this FIRST on canonical production

-- ============================================
-- 1. BUDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL CHECK (company_id IN ('ARQIA', 'XGROUP', 'SENA')),
    fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    category VARCHAR(100) NOT NULL,
    allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
    spent DECIMAL(15,2) DEFAULT 0,
    remaining DECIMAL(15,2) GENERATED ALWAYS AS (allocated - spent) STORED,
    owner VARCHAR(200),
    created_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'exceeded')),
    alert_threshold INTEGER DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE budgets IS 'Department budgets with spend tracking';
COMMENT ON COLUMN budgets.company_id IS 'Organization: ARQIA, XGROUP, or SENA';
COMMENT ON COLUMN budgets.alert_threshold IS 'Percentage at which to trigger budget alerts';

-- ============================================
-- 2. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL CHECK (company_id IN ('ARQIA', 'XGROUP', 'SENA')),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_email VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount - discount_amount) STORED,
    currency VARCHAR(3) DEFAULT 'USD',
    due_date DATE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'overdue', 'disputed')),
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    line_items JSONB DEFAULT '[]',
    document_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Vendor invoice management';
COMMENT ON COLUMN invoices.status IS 'Workflow: pending → approved → paid, or disputed/overdue';

-- ============================================
-- 3. CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL CHECK (company_id IN ('ARQIA', 'XGROUP', 'SENA')),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    contract_type VARCHAR(50) NOT NULL,
    counterparty VARCHAR(200) NOT NULL,
    counterparty_email VARCHAR(255),
    contract_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_terms TEXT,
    termination_clause TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'negotiating', 'active', 'expired', 'terminated')),
    is_privileged BOOLEAN DEFAULT FALSE,
    privileged_reason TEXT,
    document_url TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE contracts IS 'Legal contract lifecycle management';
COMMENT ON COLUMN contracts.is_privileged IS 'Attorney-client privilege marker';

-- ============================================
-- 4. APPROVALS TABLE (Finance Approvals)
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL CHECK (company_id IN ('ARQIA', 'XGROUP', 'SENA')),
    request_type VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    requestor_id VARCHAR(100) NOT NULL,
    requestor_name VARCHAR(200),
    approver_id VARCHAR(100) NOT NULL,
    approver_name VARCHAR(200),
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    related_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    category VARCHAR(100),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decided_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE approvals IS 'Finance approval workflow';
COMMENT ON COLUMN approvals.company_id IS 'Organization scope for approval routing';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_budget ON invoices(budget_id);

CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_privileged ON contracts(is_privileged);

CREATE INDEX IF NOT EXISTS idx_approvals_company ON approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_requestor ON approvals(requestor_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id);

-- ============================================
-- RLS POLICIES (Basic - customize as needed)
-- ============================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_select ON budgets FOR SELECT USING (true);
CREATE POLICY budgets_insert ON budgets FOR INSERT WITH CHECK (true);
CREATE POLICY budgets_update ON budgets FOR UPDATE USING (true);

CREATE POLICY invoices_select ON invoices FOR SELECT USING (true);
CREATE POLICY invoices_insert ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY invoices_update ON invoices FOR UPDATE USING (true);

CREATE POLICY contracts_select ON contracts FOR SELECT USING (true);
CREATE POLICY contracts_insert ON contracts FOR INSERT WITH CHECK (true);
CREATE POLICY contracts_update ON contracts FOR UPDATE USING (true);

CREATE POLICY approvals_select ON approvals FOR SELECT USING (true);
CREATE POLICY approvals_insert ON approvals FOR INSERT WITH CHECK (true);
CREATE POLICY approvals_update ON approvals FOR UPDATE USING (true);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER approvals_updated_at BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
