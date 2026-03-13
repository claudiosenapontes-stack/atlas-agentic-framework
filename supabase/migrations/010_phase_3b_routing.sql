-- Phase 3B: Command Classification, Agent Routing, and Task Dependencies
-- Atlas Agentic Framework

-- Add parent_task_id for hierarchical tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_order INTEGER DEFAULT 9999;

-- Create indexes for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(task_order);

-- Ensure task_dependencies table exists with proper constraints
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocking' CHECK (dependency_type IN ('blocking', 'non_blocking')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_task_id);

-- Ensure events table exists for canonical event logging
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'command.received', 
    'command.classified', 
    'command.approved', 
    'command.rejected', 
    'command.executed',
    'command.routed',
    'task.created', 
    'task.claimed', 
    'task.started', 
    'task.completed', 
    'task.failed',
    'task.dependency.added',
    'task.dependency.resolved',
    'agent.run.started', 
    'agent.run.completed', 
    'agent.run.failed',
    'approval.requested', 
    'approval.responded'
  )),
  
  -- Actor
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'cron')),
  actor_id TEXT NOT NULL,
  
  -- Target
  target_type TEXT CHECK (target_type IN ('command', 'task', 'agent_run', 'approval')),
  target_id UUID,
  
  -- Routing information
  routed_to_agent_id TEXT,
  routing_reason TEXT,
  model_used TEXT,
  
  -- Payload
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  source_channel TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_type, actor_id);

-- Enable realtime for events
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END$$;

-- Add agent_routing column to commands
ALTER TABLE commands ADD COLUMN IF NOT EXISTS routed_to_agent_id TEXT;
ALTER TABLE commands ADD COLUMN IF NOT EXISTS routing_reason TEXT;

-- Create indexes for agent routing
CREATE INDEX IF NOT EXISTS idx_commands_routed_to ON commands(routed_to_agent_id);
