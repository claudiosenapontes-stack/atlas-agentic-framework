-- ATLAS-RUNTIME-SESSION-SNAPSHOT-DEPLOY-1289
-- Agent Session Snapshot Persistence
-- Created: 2026-03-15 02:40 UTC

-- Drop if exists (for idempotent migration)
DROP TABLE IF EXISTS agent_session_snapshots CASCADE;

-- Create agent_session_snapshots table
CREATE TABLE agent_session_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    task_id UUID,
    execution_id UUID,
    snapshot_payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_agent_session_snapshots_agent_id 
    ON agent_session_snapshots(agent_id);

CREATE INDEX idx_agent_session_snapshots_task_id 
    ON agent_session_snapshots(task_id);

CREATE INDEX idx_agent_session_snapshots_execution_id 
    ON agent_session_snapshots(execution_id);

CREATE INDEX idx_agent_session_snapshots_created_at 
    ON agent_session_snapshots(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX idx_agent_session_snapshots_agent_created 
    ON agent_session_snapshots(agent_id, created_at DESC);

-- Enable Row Level Security (if needed for multi-tenant)
ALTER TABLE agent_session_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can read their own snapshots
CREATE POLICY agent_read_own_snapshots ON agent_session_snapshots
    FOR SELECT USING (true);  -- Adjust based on auth requirements

-- Policy: Agents can insert their own snapshots
CREATE POLICY agent_insert_own_snapshots ON agent_session_snapshots
    FOR INSERT WITH CHECK (true);  -- Adjust based on auth requirements

-- Policy: Agents can update their own snapshots
CREATE POLICY agent_update_own_snapshots ON agent_session_snapshots
    FOR UPDATE USING (true);  -- Adjust based on auth requirements

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_session_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_session_snapshots_updated_at
    BEFORE UPDATE ON agent_session_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_session_snapshots_updated_at();

-- Comment for documentation
COMMENT ON TABLE agent_session_snapshots IS 
    'Stores agent session snapshots for runtime continuity and restart recovery. ATLAS-RUNTIME-SESSION-SNAPSHOT-DEPLOY-1289';

COMMENT ON COLUMN agent_session_snapshots.snapshot_payload IS 
    'JSON payload containing: current_task, workflow_step, execution_payload, context_summary';
