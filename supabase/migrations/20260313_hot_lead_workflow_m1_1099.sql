-- ATLAS-HOT-LEAD-WORKFLOW-M1-1099
-- Event-driven workflow schema for LeadScoredHot
-- Created: 2026-03-13

BEGIN;

-- ============================================
-- 1. WORKFLOW DEFINITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  event_trigger VARCHAR(100) NOT NULL,
  company_id UUID REFERENCES companies(id),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert hot lead workflow definition
INSERT INTO workflow_definitions (name, event_trigger, config) VALUES (
  'hot_lead_followup',
  'lead_scored_hot',
  '{
    "task_template": {
      "title": "Hot Lead Follow-up: {{lead_name}}",
      "priority": "high",
      "due_hours": 4
    },
    "owner_assignment": {
      "strategy": "round_robin",
      "team_role": "sales_rep",
      "fallback_user_id": null
    },
    "notification": {
      "channels": ["in_app", "email"],
      "template": "hot_lead_alert"
    },
    "dedup_window_hours": 24
  }'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_defs_trigger ON workflow_definitions(event_trigger) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_defs_company ON workflow_definitions(company_id);

-- RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS workflow_defs_service_all ON workflow_definitions FOR ALL USING (true);

-- ============================================
-- 2. WORKFLOW EXECUTIONS TABLE (Idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflow_definitions(id),
  company_id UUID NOT NULL,
  
  -- Idempotency key
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  
  -- Trigger context
  trigger_event_id UUID,
  trigger_event_type VARCHAR(100),
  trigger_payload JSONB,
  
  -- Execution state
  status VARCHAR(50) DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  output JSONB,
  error_message TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_exec_idempotency ON workflow_executions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_status ON workflow_executions(status) WHERE status IN ('running', 'retrying');
CREATE INDEX IF NOT EXISTS idx_workflow_exec_retry_at ON workflow_executions(retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_workflow_exec_company ON workflow_executions(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_event ON workflow_executions(trigger_event_id);

-- RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS workflow_exec_service_all ON workflow_executions FOR ALL USING (true);

-- ============================================
-- 3. WORKFLOW STEP EVENTS (Traceability)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_step_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  
  step_name VARCHAR(100) NOT NULL,
  step_order INTEGER NOT NULL,
  
  status VARCHAR(50),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  input_snapshot JSONB,
  output_snapshot JSONB,
  error_message TEXT,
  
  retryable BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_step_exec ON workflow_step_events(workflow_execution_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_step_company ON workflow_step_events(company_id, created_at);

-- RLS
ALTER TABLE workflow_step_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS workflow_step_service_all ON workflow_step_events FOR ALL USING (true);

-- ============================================
-- 4. UPDATE TASKS TABLE (Add workflow source)
-- ============================================
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source, source_id) WHERE source IS NOT NULL;

-- ============================================
-- 5. REALTIME PUBLICATION
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'workflow_executions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Publication supabase_realtime does not exist';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- SELECT * FROM workflow_definitions WHERE name = 'hot_lead_followup';
-- SELECT * FROM workflow_executions ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM workflow_step_events ORDER BY created_at DESC LIMIT 10;
