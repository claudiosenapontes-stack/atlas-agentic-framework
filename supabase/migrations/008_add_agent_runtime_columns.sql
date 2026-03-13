-- Migration: Add runtime tracking columns to agents table
-- Phase 1 schema update for Atlas Agentic Framework

-- Add columns for webhook-derived state tracking
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS session_key TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS context_tokens INTEGER,
ADD COLUMN IF NOT EXISTS memory_usage_mb INTEGER,
ADD COLUMN IF NOT EXISTS cpu_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS queue_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_task TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at DESC);

-- Enable realtime for agents table (if not already enabled)
-- Note: Run this in Supabase dashboard if needed
-- alter publication supabase_realtime add table agents;

-- Verify columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;
