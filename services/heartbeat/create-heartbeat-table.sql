-- Create agent_heartbeats table for ATLAS fleet monitoring
-- ATLAS-FLEET-HEARTBEAT-CRON-502

CREATE TABLE IF NOT EXISTS public.agent_heartbeats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_size INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    active_tasks INTEGER DEFAULT 0,
    model_used VARCHAR(100) DEFAULT 'unknown',
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'stale', 'dead', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status_time ON public.agent_heartbeats(status, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow CRUD operations on heartbeats (read-only for anon users)
CREATE POLICY "Allow read access to heartbeats" ON public.agent_heartbeats FOR SELECT TO anon USING (true);

-- Insert some sample data to verify the table works
-- This will be overwritten by the actual heartbeat collection
INSERT INTO public.agent_heartbeats (agent_id, context_size, active_sessions, active_tasks, model_used, status)
SELECT id, 0, 0, 0, 'unknown', 'unknown' FROM public.agents LIMIT 1;