-- Migration: MVP Cost Tracking Schema
-- ATLAS-COST-MVP-357
-- Created: 2026-03-13
-- Purpose: Minimal cost observability for Gates 1-4

BEGIN;

-- ============================================================
-- 1. EXECUTION_COSTS: Source of truth for all cost data
-- ============================================================

CREATE TABLE IF NOT EXISTS execution_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Attribution (all nullable for flexibility)
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Cost data
    model TEXT NOT NULL, -- e.g., 'gpt-4', 'claude-3-opus'
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
    total_cost_usd NUMERIC(12,8) NOT NULL DEFAULT 0,
    
    -- Context
    cost_type TEXT DEFAULT 'llm' CHECK (cost_type IN ('llm', 'embedding', 'image', 'tool')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_execution_costs_execution_id ON execution_costs(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_costs_task_id ON execution_costs(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_costs_workflow_execution_id ON execution_costs(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_costs_agent_id ON execution_costs(agent_id);
CREATE INDEX IF NOT EXISTS idx_execution_costs_company_id ON execution_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_execution_costs_created_at ON execution_costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_costs_model ON execution_costs(model);

-- ============================================================
-- 2. Rollup columns on existing tables (for fast queries)
-- ============================================================

-- Add cost columns to executions table
ALTER TABLE executions 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_entries_count INTEGER DEFAULT 0;

-- Add cost columns to workflow_executions table
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_entries_count INTEGER DEFAULT 0;

-- Add cost columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;

-- Add cost columns to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;

-- ============================================================
-- 3. Rollup trigger (updates parent tables on insert)
-- ============================================================

CREATE OR REPLACE FUNCTION update_cost_rollups()
RETURNS TRIGGER AS $$
BEGIN
    -- Update execution
    IF NEW.execution_id IS NOT NULL THEN
        UPDATE executions
        SET 
            total_cost_usd = COALESCE((SELECT SUM(total_cost_usd) FROM execution_costs WHERE execution_id = NEW.execution_id), 0),
            cost_entries_count = (SELECT COUNT(*) FROM execution_costs WHERE execution_id = NEW.execution_id),
            updated_at = NOW()
        WHERE id = NEW.execution_id;
    END IF;
    
    -- Update workflow_execution
    IF NEW.workflow_execution_id IS NOT NULL THEN
        UPDATE workflow_executions
        SET 
            total_cost_usd = COALESCE((SELECT SUM(total_cost_usd) FROM execution_costs WHERE workflow_execution_id = NEW.workflow_execution_id), 0),
            cost_entries_count = (SELECT COUNT(*) FROM execution_costs WHERE workflow_execution_id = NEW.workflow_execution_id),
            updated_at = NOW()
        WHERE id = NEW.workflow_execution_id;
    END IF;
    
    -- Update task
    IF NEW.task_id IS NOT NULL THEN
        UPDATE tasks
        SET 
            total_cost_usd = COALESCE((SELECT SUM(total_cost_usd) FROM execution_costs WHERE task_id = NEW.task_id), 0),
            execution_count = (SELECT COUNT(DISTINCT execution_id) FROM execution_costs WHERE task_id = NEW.task_id),
            updated_at = NOW()
        WHERE id = NEW.task_id;
    END IF;
    
    -- Update agent
    IF NEW.agent_id IS NOT NULL THEN
        UPDATE agents
        SET 
            total_cost_usd = COALESCE((SELECT SUM(total_cost_usd) FROM execution_costs WHERE agent_id = NEW.agent_id), 0),
            total_tokens_used = COALESCE((SELECT SUM(total_tokens) FROM execution_costs WHERE agent_id = NEW.agent_id), 0),
            updated_at = NOW()
        WHERE id = NEW.agent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS execution_costs_rollup_trigger ON execution_costs;
CREATE TRIGGER execution_costs_rollup_trigger
    AFTER INSERT ON execution_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_rollups();

-- ============================================================
-- 4. Views for reporting
-- ============================================================

-- Cost summary by agent
CREATE OR REPLACE VIEW cost_by_agent AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COUNT(ec.id) as call_count,
    SUM(ec.tokens_input) as total_input_tokens,
    SUM(ec.tokens_output) as total_output_tokens,
    SUM(ec.total_tokens) as total_tokens,
    SUM(ec.total_cost_usd) as total_cost_usd,
    COUNT(DISTINCT ec.model) as models_used
FROM agents a
LEFT JOIN execution_costs ec ON ec.agent_id = a.id
GROUP BY a.id, a.name;

-- Cost summary by company
CREATE OR REPLACE VIEW cost_by_company AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(ec.id) as call_count,
    SUM(ec.total_tokens) as total_tokens,
    SUM(ec.total_cost_usd) as total_cost_usd,
    COUNT(DISTINCT ec.agent_id) as active_agents
FROM companies c
LEFT JOIN execution_costs ec ON ec.company_id = c.id
GROUP BY c.id, c.name;

-- Cost summary by workflow
CREATE OR REPLACE VIEW cost_by_workflow_execution AS
SELECT 
    we.id as workflow_execution_id,
    w.name as workflow_name,
    we.status,
    COUNT(ec.id) as call_count,
    SUM(ec.total_tokens) as total_tokens,
    SUM(ec.total_cost_usd) as total_cost_usd,
    COUNT(DISTINCT ec.agent_id) as agents_involved
FROM workflow_executions we
JOIN workflows w ON w.id = we.workflow_id
LEFT JOIN execution_costs ec ON ec.workflow_execution_id = we.id
GROUP BY we.id, w.name, we.status;

-- Daily cost rollup
CREATE OR REPLACE VIEW cost_daily_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as entry_count,
    SUM(tokens_input) as total_input_tokens,
    SUM(tokens_output) as total_output_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost_usd) as total_cost_usd,
    COUNT(DISTINCT agent_id) as active_agents,
    COUNT(DISTINCT company_id) as active_companies
FROM execution_costs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================
-- 5. Comments
-- ============================================================

COMMENT ON TABLE execution_costs IS 'MVP cost tracking - source of truth for all execution costs';
COMMENT ON COLUMN execution_costs.total_cost_usd IS 'Total cost in USD for this execution';
COMMENT ON COLUMN execution_costs.model IS 'LLM model used (gpt-4, claude-3-opus, etc.)';

COMMIT;
