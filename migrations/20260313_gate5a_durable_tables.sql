-- ATLAS-GATE5A-SCHEMA-DEPLOY-902
-- Durable Execution Schema - Core Tables
-- Created: 2026-03-13

-- ============================================
-- 1. EXECUTION_ATTEMPTS TABLE
-- Tracks retry attempts for durable execution
-- ============================================
CREATE TABLE IF NOT EXISTS execution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    lease_owner VARCHAR(255),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    input_snapshot JSONB,
    output_snapshot JSONB,
    error_message TEXT,
    error_stack TEXT,
    failure_class VARCHAR(100),
    worker_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for execution lookup
CREATE INDEX IF NOT EXISTS idx_execution_attempts_execution_id 
    ON execution_attempts(execution_id);

-- Index for attempt ordering
CREATE INDEX IF NOT EXISTS idx_execution_attempts_number 
    ON execution_attempts(execution_id, attempt_number DESC);

-- ============================================
-- 2. EXECUTION_EVENTS TABLE
-- Event log for execution state changes
-- ============================================
CREATE TABLE IF NOT EXISTS execution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    emitted_by VARCHAR(255),
    worker_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for execution event streaming
CREATE INDEX IF NOT EXISTS idx_execution_events_execution_id 
    ON execution_events(execution_id, created_at DESC);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_execution_events_type 
    ON execution_events(event_type, created_at DESC);

-- ============================================
-- 3. HEARTBEAT_EVENTS TABLE
-- Worker heartbeat tracking for lease management
-- ============================================
CREATE TABLE IF NOT EXISTS heartbeat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
    execution_attempt_id UUID REFERENCES execution_attempts(id) ON DELETE CASCADE,
    worker_id VARCHAR(255) NOT NULL,
    heartbeat_type VARCHAR(50) NOT NULL DEFAULT 'alive',
    status VARCHAR(50) DEFAULT 'healthy',
    progress_pct INTEGER CHECK (progress_pct >= 0 AND progress_pct <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active heartbeat lookup
CREATE INDEX IF NOT EXISTS idx_heartbeat_events_execution 
    ON heartbeat_events(execution_id, created_at DESC);

-- Index for worker health monitoring
CREATE INDEX IF NOT EXISTS idx_heartbeat_events_worker 
    ON heartbeat_events(worker_id, created_at DESC);

-- ============================================
-- ENABLE RLS (Row Level Security)
-- ============================================
ALTER TABLE execution_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_events ENABLE ROW LEVEL SECURITY;

-- Allow all access for service role (application)
CREATE POLICY IF NOT EXISTS execution_attempts_service_all 
    ON execution_attempts FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS execution_events_service_all 
    ON execution_events FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS heartbeat_events_service_all 
    ON heartbeat_events FOR ALL USING (true);
