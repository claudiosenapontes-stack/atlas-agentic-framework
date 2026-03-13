-- Fix events table schema and refresh PostgREST cache
-- Run this in Supabase Dashboard SQL Editor

-- First, let's see current events table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Check if company_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE events ADD COLUMN company_id UUID REFERENCES companies(id);
        RAISE NOTICE 'Added company_id column to events table';
    ELSE
        RAISE NOTICE 'company_id column already exists';
    END IF;
END $$;

-- Ensure all required columns exist for canonical events
ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS actor_type TEXT CHECK (actor_type IN ('user', 'agent', 'system', 'cron')),
    ADD COLUMN IF NOT EXISTS actor_id TEXT,
    ADD COLUMN IF NOT EXISTS target_type TEXT CHECK (target_type IN ('command', 'task', 'agent_run', 'approval')),
    ADD COLUMN IF NOT EXISTS target_id TEXT,
    ADD COLUMN IF NOT EXISTS routed_to_agent_id TEXT,
    ADD COLUMN IF NOT EXISTS routing_reason TEXT,
    ADD COLUMN IF NOT EXISTS model_used TEXT,
    ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS source_channel TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the schema is correct
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;