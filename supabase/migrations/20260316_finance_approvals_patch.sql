-- ATLAS-OPTIMUS-FINANCE-CLOSURE-023
-- APPROVALS SCHEMA ALIGNMENT PATCH
-- Apply if approvals table missing required columns

-- Add missing columns to approvals table (if not exists)
ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS title VARCHAR(300) NOT NULL DEFAULT 'Untitled Approval';

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2);

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS requestor_id VARCHAR(100) NOT NULL DEFAULT 'system';

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS requestor_name VARCHAR(200);

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS approver_id VARCHAR(100) NOT NULL DEFAULT 'system';

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS approver_name VARCHAR(200);

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS related_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE approvals 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'approvals' 
ORDER BY ordinal_position;
