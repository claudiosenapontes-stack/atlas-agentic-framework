-- Phase 3A: Command Bus Schema
-- Normalized command pipeline for Atlas Agentic Framework

-- Commands table: incoming actions from all sources
CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Source tracking
  source_channel TEXT NOT NULL CHECK (source_channel IN ('telegram', 'mission_control', 'cron', 'webhook', 'api')),
  source_user_id TEXT,
  source_message_id TEXT,
  
  -- Command content
  command_type TEXT NOT NULL CHECK (command_type IN ('spawn_agent', 'kill_agent', 'create_task', 'deploy', 'query_status', 'approve_action', 'reject_action', 'report')),
  command_text TEXT,
  parsed_intent JSONB DEFAULT '{}',
  
  -- Model routing (resolved by intent classifier)
  target_model TEXT NOT NULL DEFAULT 'openrouter/moonshotai/kimi-k2',
  model_routing_reason TEXT,
  
  -- Command lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'classifying', 'awaiting_approval', 'approved', 'rejected', 'executing', 'completed', 'failed')),
  
  -- Risk assessment
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_approval BOOLEAN DEFAULT false,
  estimated_cost_usd DECIMAL(10,4),
  
  -- Execution tracking
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  executed_by_agent TEXT,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table: normalized task representation
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  command_id UUID REFERENCES commands(id),
  
  -- Task classification
  task_type TEXT NOT NULL CHECK (task_type IN ('deployment', 'investigation', 'implementation', 'review', 'analysis', 'maintenance')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  
  -- Human-readable
  title TEXT NOT NULL,
  description TEXT,
  
  -- Assignment
  assigned_agent_id TEXT,
  claimed_by_session TEXT,
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'claimed', 'in_progress', 'blocked', 'completed', 'failed', 'canceled')),
  
  -- Runtime linkage
  execution_id UUID,
  openclaw_job_id TEXT,
  
  -- Cost tracking
  actual_cost_usd DECIMAL(10,4),
  tokens_used INTEGER,
  duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocking' CHECK (dependency_type IN ('blocking', 'non_blocking')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Agent runs: execution instances
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  command_id UUID REFERENCES commands(id),
  
  agent_id TEXT NOT NULL,
  session_key TEXT,
  
  -- Runtime metrics
  model TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'killed')),
  
  context_tokens_used INTEGER,
  context_tokens_total INTEGER DEFAULT 262144,
  memory_usage_mb INTEGER,
  cpu_percent DECIMAL(5,2),
  
  -- Cost
  cost_usd DECIMAL(10,4),
  
  -- Output
  output_preview TEXT,
  error_message TEXT,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  command_id UUID REFERENCES commands(id),
  task_id UUID REFERENCES tasks(id),
  
  -- What needs approval
  approval_type TEXT NOT NULL CHECK (approval_type IN ('deployment', 'agent_spawn', 'agent_kill', 'high_cost', 'infrastructure_change')),
  requested_by TEXT NOT NULL,
  
  -- Risk context
  risk_level TEXT NOT NULL,
  estimated_cost_usd DECIMAL(10,4),
  justification TEXT,
  
  -- Approval state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'expired')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Escalation
  escalation_level INTEGER DEFAULT 1,
  escalated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Events table: canonical event log
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN ('command.received', 'command.classified', 'command.approved', 'command.rejected', 'command.executed', 'task.created', 'task.claimed', 'task.started', 'task.completed', 'task.failed', 'agent.run.started', 'agent.run.completed', 'agent.run.failed', 'approval.requested', 'approval.responded')),
  
  -- Actor
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'cron')),
  actor_id TEXT NOT NULL,
  
  -- Target
  target_type TEXT CHECK (target_type IN ('command', 'task', 'agent_run', 'approval')),
  target_id UUID,
  
  -- Payload
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  source_channel TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_company ON commands(company_id);
CREATE INDEX IF NOT EXISTS idx_commands_created ON commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- Enable realtime
alter publication supabase_realtime add table commands;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table agent_runs;
alter publication supabase_realtime add table approvals;
alter publication supabase_realtime add table events;
