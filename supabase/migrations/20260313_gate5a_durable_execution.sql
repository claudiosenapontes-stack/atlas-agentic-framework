-- Migration: Gate 5A Durable Execution Schema
-- ATLAS-GATE5A-DURABLE-EXECUTION-903
-- Created: 2026-03-13

BEGIN;

-- Step 1: Add durable execution columns to executions table
DO $$
BEGIN
    -- Lease tracking for claim/renew pattern
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'lease_expires_at') THEN
        ALTER TABLE executions ADD COLUMN lease_expires_at TIMESTAMPTZ;
    END IF;
    
    -- Output snapshot for durability (stores full output at checkpoint)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'output_snapshot') THEN
        ALTER TABLE executions ADD COLUMN output_snapshot JSONB;
    END IF;
    
    -- Failure classification for retry decisions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'failure_class') THEN
        ALTER TABLE executions ADD COLUMN failure_class VARCHAR(50) CHECK (failure_class IN ('transient', 'permanent', 'timeout', 'crash', null));
    END IF;
    
    -- Idempotency key for completion deduplication
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'idempotent_completion_key') THEN
        ALTER TABLE executions ADD COLUMN idempotent_completion_key UUID;
    END IF;
    
    -- Last heartbeat timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'last_heartbeat_at') THEN
        ALTER TABLE executions ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
    END IF;
    
    -- Heartbeat count for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'heartbeat_count') THEN
        ALTER TABLE executions ADD COLUMN heartbeat_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 2: Create execution_attempts table for retry tracking
CREATE TABLE IF NOT EXISTS execution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    output_snapshot JSONB,
    error_message TEXT,
    failure_class VARCHAR(50),
    tokens_used INTEGER DEFAULT 0,
    actual_cost_usd NUMERIC(10,6) DEFAULT 0,
    agent_id UUID,
    lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(execution_id, attempt_number)
);

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_execution_attempts_execution_id ON execution_attempts(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_attempts_status ON execution_attempts(status);

-- Step 3: Create execution_events table for audit trail
CREATE TABLE IF NOT EXISTS execution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_execution_events_execution_id ON execution_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_event_type ON execution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_execution_events_created_at ON execution_events(created_at);

-- Step 4: Create retry_policy table for configurable retry rules
CREATE TABLE IF NOT EXISTS retry_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    transient_retry_delay_ms INTEGER DEFAULT 5000,
    timeout_retry_delay_ms INTEGER DEFAULT 10000,
    crash_retry_delay_ms INTEGER DEFAULT 30000,
    permanent_failure_action VARCHAR(50) DEFAULT 'fail',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retry policy
INSERT INTO retry_policies (name, max_attempts, transient_retry_delay_ms, timeout_retry_delay_ms, crash_retry_delay_ms)
VALUES ('default', 3, 5000, 10000, 30000)
ON CONFLICT DO NOTHING;

-- Step 5: Update realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE execution_attempts';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'execution_attempts already in realtime publication';
        END;
        
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE execution_events';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'execution_events already in realtime publication';
        END;
    END IF;
END $$;

-- Step 6: Add comments
COMMENT ON COLUMN executions.lease_expires_at IS 'Timestamp when current lease expires';
COMMENT ON COLUMN executions.output_snapshot IS 'Full output snapshot for durability';
COMMENT ON COLUMN executions.failure_class IS 'Classification: transient, permanent, timeout, crash';
COMMENT ON COLUMN executions.idempotent_completion_key IS 'UUID for idempotent completion requests';
COMMENT ON TABLE execution_attempts IS 'Tracks each execution attempt for retry logic';
COMMENT ON TABLE execution_events IS 'Audit trail of execution lifecycle events';

COMMIT;
