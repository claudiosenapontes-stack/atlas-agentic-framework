-- Create agent_heartbeats table for ATLAS fleet monitoring
-- ATLAS-FLEET-HEARTBEAT-CRON-502

CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    context_size INT,
    active_sessions INT,
    active_tasks INT,
    model_used TEXT,
    status TEXT NOT NULL DEFAULT 'unknown'
);

-- Index for efficient querying by agent and time
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON agent_heartbeats(timestamp DESC);