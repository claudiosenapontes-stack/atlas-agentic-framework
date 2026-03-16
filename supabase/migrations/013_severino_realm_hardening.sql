-- ATLAS-SEVERINO-REALM-FINAL-HARDENING-GO-1281
-- Database Schema for Agent Restart Audit and Efficiency Tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: agent_restarts
-- Purpose: Durable audit trail for agent restart operations
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_restarts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Agent Identification
    agent_id TEXT NOT NULL,
    agent_type TEXT,
    
    -- Task Context
    task_id UUID,
    execution_id UUID,
    workflow_execution_id UUID,
    
    -- Restart Metadata
    reason TEXT NOT NULL,
    reason_category TEXT CHECK (reason_category IN (
        'manual_boost',
        'efficiency_degraded',
        'context_overflow',
        'session_timeout',
        'heartbeat_stale',
        'memory_pressure',
        'operator_command',
        'auto_recovery'
    )),
    
    -- Memory Snapshot Summary
    snapshot_summary JSONB,
    context_usage_before INTEGER, -- percentage 0-100
    context_usage_after INTEGER,  -- percentage 0-100
    session_tokens_before INTEGER,
    session_tokens_after INTEGER,
    
    -- Session Tracking
    session_id_before TEXT,
    session_id_after TEXT,
    workspace_path TEXT,
    
    -- Recovery Context
    completed_steps JSONB,        -- Array of completed step IDs
    current_step_id TEXT,         -- Where agent left off
    next_step_id TEXT,            -- Next step to resume
    recovery_message_sent TEXT,   -- Full recovery context message
    
    -- Status Tracking
    restart_status TEXT DEFAULT 'initiated' CHECK (restart_status IN (
        'initiated',
        'snapshot_saved',
        'session_terminated',
        'session_started',
        'recovery_sent',
        'resumed',
        'failed',
        'cancelled'
    )),
    resume_status TEXT CHECK (resume_status IN (
        'pending',
        'in_progress',
        'completed',
        'failed',
        'partial',
        'timeout'
    )),
    
    -- Safety & Limits
    critical_write_active BOOLEAN DEFAULT false,
    restart_queued BOOLEAN DEFAULT false,
    restart_attempt_number INTEGER DEFAULT 1,
    hourly_restart_count INTEGER DEFAULT 1,
    
    -- Actor Tracking
    restarted_by TEXT NOT NULL,   -- operator_id or 'system'
    restarted_by_type TEXT CHECK (restarted_by_type IN ('operator', 'system', 'auto')),
    
    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    snapshot_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    recovery_sent_at TIMESTAMPTZ,
    resumed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_restarts_agent_id ON agent_restarts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_execution_id ON agent_restarts(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_task_id ON agent_restarts(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_status ON agent_restarts(restart_status);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_initiated_at ON agent_restarts(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_reason_category ON agent_restarts(reason_category);
CREATE INDEX IF NOT EXISTS idx_agent_restarts_hourly ON agent_restarts(agent_id, date_trunc('hour', initiated_at));

-- =====================================================
-- TABLE: agent_efficiency_metrics
-- Purpose: Track agent efficiency signals over time
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_efficiency_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    agent_id TEXT NOT NULL,
    session_id TEXT,
    
    -- Raw Signals
    context_usage_pct INTEGER,           -- 0-100
    response_latency_ms INTEGER,         -- API response time
    session_age_minutes INTEGER,         -- Session duration
    heartbeat_freshness_sec INTEGER,     -- Seconds since last heartbeat
    stalled_task_count INTEGER,          -- Number of stalled tasks
    consecutive_errors INTEGER,          -- Error streak
    memory_usage_mb INTEGER,             -- Process memory
    cpu_usage_pct INTEGER,               -- CPU percentage
    
    -- Derived State
    efficiency_state TEXT CHECK (efficiency_state IN (
        'healthy',
        'warning',
        'degraded',
        'restart_recommended',
        'critical'
    )),
    
    -- State Calculation Factors
    state_factors JSONB,                 -- Which thresholds triggered state
    
    -- Associated Task
    current_task_id UUID,
    current_execution_id UUID,
    
    -- Timestamp
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_efficiency_agent_id ON agent_efficiency_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_efficiency_state ON agent_efficiency_metrics(efficiency_state);
CREATE INDEX IF NOT EXISTS idx_efficiency_measured_at ON agent_efficiency_metrics(measured_at DESC);

-- =====================================================
-- TABLE: fleet_commands
-- Purpose: Audit log for global fleet control actions
-- =====================================================

CREATE TABLE IF NOT EXISTS fleet_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    command_type TEXT NOT NULL CHECK (command_type IN (
        'fleet_audit',
        'pause_all_agents',
        'resume_all_agents',
        'boost_restart_stuck',
        'emergency_stop',
        'graceful_shutdown',
        'health_check'
    )),
    
    -- Command Parameters
    parameters JSONB,
    dry_run BOOLEAN DEFAULT false,
    
    -- Execution Tracking
    initiated_by TEXT NOT NULL,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Results
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'running',
        'completed',
        'partial',
        'failed',
        'cancelled'
    )),
    
    -- Detailed Results
    agents_affected INTEGER DEFAULT 0,
    agents_success INTEGER DEFAULT 0,
    agents_failed INTEGER DEFAULT 0,
    agents_skipped INTEGER DEFAULT 0,
    
    result_summary JSONB,
    error_log TEXT,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_commands_type ON fleet_commands(command_type);
CREATE INDEX IF NOT EXISTS idx_fleet_commands_status ON fleet_commands(status);
CREATE INDEX IF NOT EXISTS idx_fleet_commands_initiated_at ON fleet_commands(initiated_at DESC);

-- =====================================================
-- VIEW: agent_restart_hourly_summary
-- Purpose: Track restart counts per agent per hour (for limits)
-- =====================================================

CREATE OR REPLACE VIEW agent_restart_hourly_summary AS
SELECT 
    agent_id,
    date_trunc('hour', initiated_at) as hour,
    COUNT(*) as restart_count,
    COUNT(*) FILTER (WHERE reason_category = 'manual_boost') as boost_count,
    COUNT(*) FILTER (WHERE restart_status = 'failed') as failed_count
FROM agent_restarts
WHERE initiated_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_id, date_trunc('hour', initiated_at);

-- =====================================================
-- VIEW: agent_efficiency_current
-- Purpose: Latest efficiency state for each agent
-- =====================================================

CREATE OR REPLACE VIEW agent_efficiency_current AS
SELECT DISTINCT ON (agent_id)
    id,
    agent_id,
    efficiency_state,
    context_usage_pct,
    response_latency_ms,
    session_age_minutes,
    stalled_task_count,
    measured_at,
    state_factors
FROM agent_efficiency_metrics
ORDER BY agent_id, measured_at DESC;

-- =====================================================
-- FUNCTION: check_restart_limit
-- Purpose: Enforce max 3 restarts per agent per hour
-- =====================================================

CREATE OR REPLACE FUNCTION check_restart_limit(
    p_agent_id TEXT,
    p_max_restarts INTEGER DEFAULT 3
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM agent_restarts
    WHERE agent_id = p_agent_id
      AND initiated_at > NOW() - INTERVAL '1 hour'
      AND restart_status NOT IN ('cancelled', 'failed');
    
    RETURN v_count < p_max_restarts;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_agent_recovery_context
-- Purpose: Build recovery message for resumed agent
-- =====================================================

CREATE OR REPLACE FUNCTION get_agent_recovery_context(
    p_restart_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_restart RECORD;
    v_task RECORD;
    v_execution RECORD;
BEGIN
    SELECT * INTO v_restart FROM agent_restarts WHERE id = p_restart_id;
    
    IF v_restart IS NULL THEN
        RETURN jsonb_build_object('error', 'Restart record not found');
    END IF;
    
    -- Get task details
    SELECT title, description, status, metadata 
    INTO v_task
    FROM tasks 
    WHERE id = v_restart.task_id;
    
    -- Get execution details
    SELECT status, progress_pct, started_at, input_snapshot, output_snapshot
    INTO v_execution
    FROM executions
    WHERE id = v_restart.execution_id;
    
    RETURN jsonb_build_object(
        'recovery_type', 'boost_restart',
        'agent_id', v_restart.agent_id,
        'task_id', v_restart.task_id,
        'execution_id', v_restart.execution_id,
        'task_title', v_task.title,
        'task_description', v_task.description,
        'task_status', v_task.status,
        'execution_status', v_execution.status,
        'execution_progress', v_execution.progress_pct,
        'completed_steps', v_restart.completed_steps,
        'current_step', v_restart.current_step_id,
        'next_step', v_restart.next_step_id,
        'where_you_left_off', format(
            'You were working on step "%s". Do NOT repeat completed work. Continue from next step.',
            v_restart.current_step_id
        ),
        'warning', '⚠️ This is a recovery session. Review completed steps before proceeding.',
        'previous_session_age', v_restart.session_age_minutes,
        'restart_reason', v_restart.reason,
        'restart_time', v_restart.initiated_at,
        'resumed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_restarts_updated_at ON agent_restarts;
CREATE TRIGGER update_agent_restarts_updated_at
    BEFORE UPDATE ON agent_restarts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES (Enable after testing)
-- =====================================================

-- ALTER TABLE agent_restarts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_efficiency_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fleet_commands ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE agent_restarts IS 'Audit trail for agent restart operations with full recovery context';
COMMENT ON TABLE agent_efficiency_metrics IS 'Real-time and historical agent efficiency signals';
COMMENT ON TABLE fleet_commands IS 'Global fleet control command audit log';

-- =====================================================
-- TABLE: agent_sessions
-- Purpose: Session telemetry for fleet monitoring
-- Updated: ATLAS-SEVERINO-TELEMETRY-EMITTER-UPDATE-001
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_id TEXT PRIMARY KEY,
    session_start TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    context_tokens_used INTEGER DEFAULT 0,
    max_context_tokens INTEGER DEFAULT 262000,
    response_latency_ms INTEGER DEFAULT 0,
    model TEXT,
    emitted_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'atlas-heartbeat-emitter'
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_activity 
    ON agent_sessions(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_emitted_at 
    ON agent_sessions(emitted_at DESC);

COMMENT ON TABLE agent_sessions IS 'Real-time session telemetry emitted by atlas-heartbeat-emitter';
