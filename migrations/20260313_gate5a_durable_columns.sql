-- ATLAS-GATE5A-SCHEMA-DEPLOY-902
-- Durable Execution Columns - Add to executions table
-- Created: 2026-03-13

-- ============================================
-- ADD DURABLE EXECUTION COLUMNS TO EXECUTIONS
-- ============================================

-- Lease management columns
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS lease_owner VARCHAR(255),
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lease_attempt INTEGER DEFAULT 0;

-- Heartbeat tracking columns
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS heartbeat_timeout_sec INTEGER DEFAULT 60;

-- Retry and attempt tracking
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS retry_of_execution_id UUID REFERENCES executions(id),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Snapshot columns for durability
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS input_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS output_snapshot JSONB;

-- Failure analysis columns
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS failure_class VARCHAR(100),
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Progress tracking
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0 
        CHECK (progress_pct >= 0 AND progress_pct <= 100);

-- State change tracking
ALTER TABLE executions 
    ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INDEXES FOR DURABLE EXECUTION QUERIES
-- ============================================

-- Index for expired lease queries (lease recovery)
CREATE INDEX IF NOT EXISTS idx_executions_expired_leases 
    ON executions(lease_expires_at) 
    WHERE status = 'running' AND lease_expires_at IS NOT NULL;

-- Index for active workflow executions
CREATE INDEX IF NOT EXISTS idx_executions_workflow_active 
    ON executions(workflow_execution_id, status) 
    WHERE status IN ('running', 'pending', 'retrying');

-- Index for retry queue (failed executions ordered by retry time)
CREATE INDEX IF NOT EXISTS idx_executions_retry_queue 
    ON executions(status, updated_at) 
    WHERE status IN ('failed', 'retrying');

-- Unique index for idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_executions_idempotency_key 
    ON executions(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Index for lease owner queries (worker claiming)
CREATE INDEX IF NOT EXISTS idx_executions_lease_owner 
    ON executions(lease_owner, lease_expires_at);

-- Index for heartbeat monitoring
CREATE INDEX IF NOT EXISTS idx_executions_heartbeat 
    ON executions(heartbeat_at) 
    WHERE status = 'running';

-- ============================================
-- UPDATE TRIGGER FOR STATE CHANGE TRACKING
-- ============================================
CREATE OR REPLACE FUNCTION track_execution_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.state_changed_at = NOW();
        
        -- Insert state change event
        INSERT INTO execution_events (
            execution_id,
            event_type,
            previous_state,
            new_state,
            created_at
        ) VALUES (
            NEW.id,
            'status_changed',
            OLD.status,
            NEW.status,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists to avoid errors
DROP TRIGGER IF EXISTS execution_state_change_trigger ON executions;

-- Create trigger
CREATE TRIGGER execution_state_change_trigger
    BEFORE UPDATE ON executions
    FOR EACH ROW
    EXECUTE FUNCTION track_execution_state_change();
