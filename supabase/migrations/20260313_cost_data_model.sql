-- Migration: Cost tracking schema for Atlas Framework
-- ATLAS-COST-DATA-MODEL-348
-- Created: 2026-03-13

BEGIN;

-- ============================================================
-- 1. COST_ENTRIES: Granular cost tracking for every LLM call
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hierarchical context (at least one must be set)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    
    -- Attribution
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID, -- For future user attribution
    
    -- Cost classification
    cost_type TEXT NOT NULL CHECK (cost_type IN (
        'llm_input',        -- Input tokens to LLM
        'llm_output',       -- Output tokens from LLM
        'llm_cached',       -- Cached input tokens (discounted)
        'embedding',        -- Embedding API calls
        'image_generation', -- Image model calls
        'tool_execution',   -- External tool/API costs
        'storage',          -- Data storage costs
        'compute',          -- Compute time costs
        'retry_waste',      -- Wasted cost from retries
        'failed_waste'      -- Wasted cost from failed executions
    )),
    
    -- Model information
    model TEXT NOT NULL, -- e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro'
    model_provider TEXT, -- e.g., 'openai', 'anthropic', 'google'
    
    -- Token usage (for LLM calls)
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    tokens_cached INTEGER DEFAULT 0, -- Cached input tokens
    
    -- Cost calculation
    cost_usd NUMERIC(12,8) NOT NULL DEFAULT 0, -- Precise cost in USD
    cost_currency TEXT DEFAULT 'USD',
    
    -- Pricing metadata (for audit/verification)
    price_per_1m_input NUMERIC(10,6),  -- Price per 1M input tokens
    price_per_1m_output NUMERIC(10,6), -- Price per 1M output tokens
    
    -- Execution context
    execution_status TEXT CHECK (execution_status IN ('success', 'failure', 'partial')),
    retry_count INTEGER DEFAULT 0, -- Which retry attempt this was
    
    -- Metadata
    request_id TEXT, -- External API request ID for tracing
    latency_ms INTEGER, -- Request latency
    metadata JSONB DEFAULT '{}', -- Additional context
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cost query patterns
CREATE INDEX IF NOT EXISTS idx_cost_entries_task_id ON cost_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_execution_id ON cost_entries(execution_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_workflow_execution_id ON cost_entries(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_agent_id ON cost_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_company_id ON cost_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_created_at ON cost_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_entries_cost_type ON cost_entries(cost_type);
CREATE INDEX IF NOT EXISTS idx_cost_entries_model ON cost_entries(model);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cost_entries_company_created ON cost_entries(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_entries_agent_created ON cost_entries(agent_id, created_at DESC);

-- ============================================================
-- 2. COST_BUDGETS: Budget tracking and alerts (future Gate 5A)
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget scope
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- NULL = company-wide
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE, -- NULL = not workflow-specific
    
    -- Budget period
    budget_type TEXT NOT NULL CHECK (budget_type IN ('daily', 'weekly', 'monthly', 'project')),
    budget_period_start TIMESTAMPTZ NOT NULL,
    budget_period_end TIMESTAMPTZ,
    
    -- Budget limits
    budget_usd NUMERIC(12,2) NOT NULL,
    alert_threshold_50 BOOLEAN DEFAULT FALSE, -- Alert sent at 50%
    alert_threshold_80 BOOLEAN DEFAULT FALSE, -- Alert sent at 80%
    alert_threshold_100 BOOLEAN DEFAULT FALSE, -- Alert sent at 100%
    
    -- Current spend (rolled up from cost_entries)
    spent_usd NUMERIC(12,8) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'exceeded', 'archived')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_budgets_company_id ON cost_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_agent_id ON cost_budgets(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_status ON cost_budgets(status);

-- ============================================================
-- 3. Update existing tables with cost rollups
-- ============================================================

-- Add cost columns to executions table (if not exists)
ALTER TABLE executions 
ADD COLUMN IF NOT EXISTS cost_entries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_cost_usd NUMERIC(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS model TEXT; -- Track which model was used

-- Add cost columns to workflow_executions table
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_entries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_waste_usd NUMERIC(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_waste_usd NUMERIC(10,6) DEFAULT 0;

-- Add cost columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add cost columns to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;

-- ============================================================
-- 4. Cost aggregation views for reporting
-- ============================================================

-- Daily cost rollup by company
CREATE OR REPLACE VIEW cost_daily_by_company AS
SELECT 
    company_id,
    DATE(created_at) as date,
    COUNT(*) as entry_count,
    SUM(tokens_input) as total_input_tokens,
    SUM(tokens_output) as total_output_tokens,
    SUM(cost_usd) as total_cost_usd,
    SUM(CASE WHEN cost_type = 'retry_waste' THEN cost_usd ELSE 0 END) as retry_waste_usd,
    SUM(CASE WHEN cost_type = 'failed_waste' THEN cost_usd ELSE 0 END) as failed_waste_usd,
    COUNT(DISTINCT agent_id) as active_agents,
    COUNT(DISTINCT task_id) as tasks_executed
FROM cost_entries
WHERE company_id IS NOT NULL
GROUP BY company_id, DATE(created_at);

-- Cost by agent and model
CREATE OR REPLACE VIEW cost_by_agent_model AS
SELECT 
    agent_id,
    model,
    COUNT(*) as call_count,
    SUM(tokens_input + tokens_output) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    AVG(latency_ms) as avg_latency_ms,
    MIN(created_at) as first_used,
    MAX(created_at) as last_used
FROM cost_entries
WHERE agent_id IS NOT NULL AND model IS NOT NULL
GROUP BY agent_id, model;

-- Workflow cost summary
CREATE OR REPLACE VIEW cost_workflow_summary AS
SELECT 
    we.id as workflow_execution_id,
    we.workflow_id,
    we.company_id,
    we.status,
    we.started_at,
    we.completed_at,
    EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) as duration_seconds,
    we.total_tasks,
    we.completed_tasks,
    we.failed_tasks,
    COALESCE(SUM(ce.cost_usd), 0) as actual_cost_usd,
    we.total_cost_usd as rolled_up_cost_usd,
    SUM(CASE WHEN ce.cost_type = 'retry_waste' THEN ce.cost_usd ELSE 0 END) as retry_waste_usd,
    SUM(CASE WHEN ce.cost_type = 'failed_waste' THEN ce.cost_usd ELSE 0 END) as failed_waste_usd,
    COUNT(ce.id) as cost_entry_count
FROM workflow_executions we
LEFT JOIN cost_entries ce ON ce.workflow_execution_id = we.id
GROUP BY we.id, we.workflow_id, we.company_id, we.status, we.started_at, we.completed_at, 
         we.total_tasks, we.completed_tasks, we.failed_tasks, we.total_cost_usd;

-- ============================================================
-- 5. Triggers for cost rollup updates
-- ============================================================

-- Function to update execution cost rollups
CREATE OR REPLACE FUNCTION update_execution_cost_rollup()
RETURNS TRIGGER AS $$
BEGIN
    -- Update execution record with aggregated costs
    UPDATE executions
    SET 
        actual_cost_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE execution_id = NEW.execution_id
        ),
        tokens_used = (
            SELECT COALESCE(SUM(tokens_input + tokens_output), 0)
            FROM cost_entries 
            WHERE execution_id = NEW.execution_id AND cost_type IN ('llm_input', 'llm_output', 'llm_cached')
        ),
        cost_entries_count = (
            SELECT COUNT(*) FROM cost_entries WHERE execution_id = NEW.execution_id
        ),
        updated_at = NOW()
    WHERE id = NEW.execution_id;
    
    -- Update workflow execution if linked
    UPDATE workflow_executions
    SET 
        total_cost_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE workflow_execution_id = NEW.workflow_execution_id
        ),
        cost_entries_count = (
            SELECT COUNT(*) FROM cost_entries WHERE workflow_execution_id = NEW.workflow_execution_id
        ),
        retry_waste_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE workflow_execution_id = NEW.workflow_execution_id AND cost_type = 'retry_waste'
        ),
        failed_waste_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE workflow_execution_id = NEW.workflow_execution_id AND cost_type = 'failed_waste'
        ),
        updated_at = NOW()
    WHERE id = NEW.workflow_execution_id;
    
    -- Update task cost rollups
    UPDATE tasks
    SET 
        total_cost_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE task_id = NEW.task_id
        ),
        execution_count = (
            SELECT COUNT(DISTINCT execution_id) FROM cost_entries WHERE task_id = NEW.task_id
        ),
        updated_at = NOW()
    WHERE id = NEW.task_id;
    
    -- Update agent cost rollups
    UPDATE agents
    SET 
        total_cost_usd = (
            SELECT COALESCE(SUM(cost_usd), 0) 
            FROM cost_entries 
            WHERE agent_id = NEW.agent_id
        ),
        total_tokens_used = (
            SELECT COALESCE(SUM(tokens_input + tokens_output), 0)
            FROM cost_entries 
            WHERE agent_id = NEW.agent_id AND cost_type IN ('llm_input', 'llm_output', 'llm_cached')
        ),
        updated_at = NOW()
    WHERE id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rollups after cost entry insert
DROP TRIGGER IF EXISTS cost_entries_rollup_trigger ON cost_entries;
CREATE TRIGGER cost_entries_rollup_trigger
    AFTER INSERT ON cost_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_cost_rollup();

-- Updated_at trigger for cost_entries
CREATE OR REPLACE FUNCTION update_cost_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cost_entries_updated_at ON cost_entries;
CREATE TRIGGER cost_entries_updated_at
    BEFORE UPDATE ON cost_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_entries_updated_at();

-- ============================================================
-- 6. Realtime publication for cost monitoring
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE cost_entries';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'cost_entries already in realtime publication or error: %', SQLERRM;
        END;
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE cost_budgets';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'cost_budgets already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================================
-- 7. Comments for documentation
-- ============================================================

COMMENT ON TABLE cost_entries IS 'Granular cost tracking for every billable operation in Atlas';
COMMENT ON COLUMN cost_entries.cost_type IS 'Type of cost: llm_input, llm_output, retry_waste, failed_waste, etc.';
COMMENT ON COLUMN cost_entries.retry_count IS 'Which retry attempt generated this cost (0 = first attempt)';
COMMENT ON COLUMN cost_entries.execution_status IS 'Whether the operation succeeded, failed, or partially succeeded';

COMMENT ON TABLE cost_budgets IS 'Budget tracking and alerting for cost control (Gate 5A)';
COMMENT ON VIEW cost_daily_by_company IS 'Daily aggregated cost report by company';
COMMENT ON VIEW cost_by_agent_model IS 'Cost breakdown by agent and LLM model';
COMMENT ON VIEW cost_workflow_summary IS 'Cost summary for each workflow execution';

COMMIT;
