-- ATLAS-SOPHIA-LEADS-SCHEMA-PATCH-005
-- Patch SQL to align schema with Hot Leads UI requirements
-- Execute this AFTER the main schema is deployed

-- ============================================
-- ADD MISSING FIELDS TO LEADS TABLE
-- For SLA/ task tracking integration
-- ============================================

-- Add task tracking fields to leads table
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS task_id UUID,
  ADD COLUMN IF NOT EXISTS sla_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- Index for task lookups
CREATE INDEX IF NOT EXISTS idx_leads_task_id ON leads(task_id);
CREATE INDEX IF NOT EXISTS idx_leads_due_at ON leads(due_at);

-- ============================================
-- AUTO-SET due_at ON INSERT/UPDATE
-- Trigger to automatically calculate due_at based on sla_minutes
-- ============================================

CREATE OR REPLACE FUNCTION set_lead_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set due_at based on sla_minutes from created_at or now
  IF NEW.due_at IS NULL AND NEW.sla_minutes IS NOT NULL THEN
    NEW.due_at := COALESCE(NEW.created_at, NOW()) + (NEW.sla_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_set_lead_due_date ON leads;
CREATE TRIGGER trigger_set_lead_due_date
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_lead_due_date();

-- Update existing rows to have due_at calculated
UPDATE leads 
  SET due_at = COALESCE(created_at, NOW()) + (COALESCE(sla_minutes, 30) || ' minutes')::INTERVAL
  WHERE due_at IS NULL;

-- ============================================
-- VERIFY PATCH
-- ============================================
SELECT 
  'Patch applied successfully' as status,
  COUNT(*) as total_leads,
  COUNT(task_id) as leads_with_task,
  COUNT(due_at) as leads_with_due_date
FROM leads;
