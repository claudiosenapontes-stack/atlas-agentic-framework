-- Migration: Enhance executions table for Gate 2 worker execution tracking
-- ATLAS-AGENT-RUNS-SCHEMA-053

-- Add missing columns to executions table
ALTER TABLE executions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS output_preview TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_cost_usd NUMERIC(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at);

-- Add comment for documentation
COMMENT ON TABLE executions IS 'Worker execution tracking for Atlas Agentic Framework - Gate 2';
