-- ATLAS-OPTIMUS-AUTONOMY-BACKEND-FOUNDATION-004
-- Task Orchestration Schema Enhancements
-- Enables Henry to create parent tasks, spawn children, track acceptance, aggregate results

-- ============================================
-- 1. TASKS TABLE ENHANCEMENTS
-- Add missing orchestration columns
-- ============================================

-- Add acceptance tracking columns (if not exist)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS accepted_by_agent_id TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acceptance_notes TEXT;

-- Add result aggregation columns
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS result_payload JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS result_summary TEXT,
ADD COLUMN IF NOT EXISTS child_results_summary JSONB DEFAULT '{}';

-- Add orchestration metadata
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS orchestration_id TEXT,
ADD COLUMN IF NOT EXISTS expected_children INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_children INTEGER DEFAULT 0;

-- Add retry metadata fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"strategy": "exponential_backoff", "base_delay_ms": 1000, "max_delay_ms": 60000}'::jsonb,
ADD COLUMN IF NOT EXISTS first_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retry_reason TEXT;

-- ============================================
-- 2. TASK_ACCEPTANCES TABLE
-- Durable acceptance tracking
-- ============================================

CREATE TABLE IF NOT EXISTS task_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    acceptance_type TEXT DEFAULT 'assignment', -- 'assignment', 'delegation', 'claim'
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_acceptances_task_id ON task_acceptances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_acceptances_agent_id ON task_acceptances(agent_id);

-- ============================================
-- 3. TASK_RESULTS TABLE
-- Structured result storage for aggregation
-- ============================================

CREATE TABLE IF NOT EXISTS task_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    result_type TEXT NOT NULL DEFAULT 'output', -- 'output', 'artifact', 'decision', 'error'
    result_data JSONB NOT NULL DEFAULT '{}',
    result_summary TEXT,
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_results_task_id ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_agent_id ON task_results(agent_id);

-- ============================================
-- 4. TASK_STATE_TRANSITIONS TABLE
-- Audit trail for state changes
-- ============================================

CREATE TABLE IF NOT EXISTS task_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    previous_state TEXT NOT NULL,
    new_state TEXT NOT NULL,
    transitioned_by TEXT, -- agent_id or 'system'
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_state_transitions_task_id ON task_state_transitions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_state_transitions_created_at ON task_state_transitions(created_at DESC);

-- ============================================
-- 5. UPDATE PARENT TASK PROGRESS FUNCTION
-- Automatically tracks child completion
-- ============================================

CREATE OR REPLACE FUNCTION update_parent_task_progress()
RETURNS TRIGGER AS $$
DECLARE
    parent_id UUID;
    total_children INTEGER;
    completed_children INTEGER;
    parent_status TEXT;
BEGIN
    -- Only process if this task has a parent
    IF NEW.parent_task_id IS NOT NULL THEN
        parent_id := NEW.parent_task_id;
        
        -- Count total and completed children
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'completed')
        INTO total_children, completed_children
        FROM tasks
        WHERE parent_task_id = parent_id;
        
        -- Update parent with counts
        UPDATE tasks 
        SET 
            expected_children = total_children,
            completed_children = completed_children,
            child_results_summary = (
                SELECT jsonb_object_agg(id, jsonb_build_object('status', status, 'result_summary', result_summary))
                FROM tasks
                WHERE parent_task_id = parent_id
            ),
            updated_at = NOW()
        WHERE id = parent_id;
        
        -- If all children complete, mark parent ready for aggregation
        IF total_children > 0 AND total_children = completed_children THEN
            SELECT status INTO parent_status FROM tasks WHERE id = parent_id;
            IF parent_status = 'in_progress' THEN
                UPDATE tasks 
                SET status = 'ready_for_aggregation',
                    updated_at = NOW()
                WHERE id = parent_id;
                
                -- Log the state transition
                INSERT INTO task_state_transitions (task_id, previous_state, new_state, transitioned_by, reason)
                VALUES (parent_id, 'in_progress', 'ready_for_aggregation', 'system', 'All child tasks completed');
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run on task status changes
DROP TRIGGER IF EXISTS trigger_update_parent_progress ON tasks;
CREATE TRIGGER trigger_update_parent_progress
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_parent_task_progress();

-- ============================================
-- 6. LOG TASK STATE TRANSITION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_task_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_state_transitions (task_id, previous_state, new_state, transitioned_by, reason)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.assigned_agent_id, 'system'), 'Status update');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for all task status changes
DROP TRIGGER IF EXISTS trigger_log_state_transition ON tasks;
CREATE TRIGGER trigger_log_state_transition
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_task_state_transition();

-- ============================================
-- 7. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_state_transitions ENABLE ROW LEVEL SECURITY;

-- Service role policies (application access)
CREATE POLICY IF NOT EXISTS task_acceptances_service_all ON task_acceptances FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS task_results_service_all ON task_results FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS task_state_transitions_service_all ON task_state_transitions FOR ALL USING (true);

-- ============================================
-- 8. TASK_RETRY_LOG TABLE
-- Durable retry history
-- ============================================

CREATE TABLE IF NOT EXISTS task_retry_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    retry_number INTEGER NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    retry_reason TEXT,
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    retried_by TEXT, -- agent_id or 'system'
    retry_delay_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_retry_log_task_id ON task_retry_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_retry_log_created_at ON task_retry_log(created_at DESC);

ALTER TABLE task_retry_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS task_retry_log_service_all ON task_retry_log FOR ALL USING (true);

-- ============================================
-- 9. RETRY TASK FUNCTION
-- Handles retry logic with exponential backoff
-- ============================================

CREATE OR REPLACE FUNCTION retry_task(
    p_task_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_retried_by TEXT DEFAULT 'system'
) RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_retry_count INTEGER;
    v_max_retries INTEGER;
    v_retry_policy JSONB;
    v_base_delay_ms INTEGER;
    v_max_delay_ms INTEGER;
    v_retry_delay_ms INTEGER;
    v_next_retry_at TIMESTAMPTZ;
    v_strategy TEXT;
BEGIN
    -- Get task details
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task not found');
    END IF;
    
    -- Check if task is in a retryable state
    IF v_task.status NOT IN ('failed', 'error', 'stuck') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task status not retryable: ' || v_task.status);
    END IF;
    
    v_retry_count := COALESCE(v_task.retry_count, 0);
    v_max_retries := COALESCE(v_task.max_retries, 3);
    v_retry_policy := COALESCE(v_task.retry_policy, '{"strategy": "exponential_backoff", "base_delay_ms": 1000, "max_delay_ms": 60000}'::jsonb);
    v_strategy := v_retry_policy->>'strategy';
    v_base_delay_ms := (v_retry_policy->>'base_delay_ms')::INTEGER;
    v_max_delay_ms := (v_retry_policy->>'max_delay_ms')::INTEGER;
    
    -- Check max retries
    IF v_retry_count >= v_max_retries THEN
        RETURN jsonb_build_object('success', false, 'error', 'Max retries exceeded', 'retry_count', v_retry_count, 'max_retries', v_max_retries);
    END IF;
    
    -- Calculate retry delay
    IF v_strategy = 'exponential_backoff' THEN
        v_retry_delay_ms := LEAST(v_base_delay_ms * POWER(2, v_retry_count), v_max_delay_ms);
    ELSIF v_strategy = 'linear' THEN
        v_retry_delay_ms := LEAST(v_base_delay_ms * (v_retry_count + 1), v_max_delay_ms);
    ELSIF v_strategy = 'fixed' THEN
        v_retry_delay_ms := v_base_delay_ms;
    ELSE
        v_retry_delay_ms := v_base_delay_ms;
    END IF;
    
    v_next_retry_at := NOW() + (v_retry_delay_ms || ' milliseconds')::INTERVAL;
    
    -- Log the retry
    INSERT INTO task_retry_log (
        task_id, retry_number, previous_status, new_status, 
        retry_reason, retried_by, retry_delay_ms
    ) VALUES (
        p_task_id, v_retry_count + 1, v_task.status, 'pending',
        p_reason, p_retried_by, v_retry_delay_ms
    );
    
    -- Update task for retry
    UPDATE tasks SET
        status = 'pending',
        retry_count = v_retry_count + 1,
        last_retry_at = NOW(),
        next_retry_at = v_next_retry_at,
        retry_reason = p_reason,
        first_attempt_at = COALESCE(v_task.first_attempt_at, v_task.created_at),
        assigned_agent_id = NULL, -- Reset for re-assignment
        accepted_by_agent_id = NULL, -- Reset acceptance
        accepted_at = NULL,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'retry_count', v_retry_count + 1,
        'max_retries', v_max_retries,
        'next_retry_at', v_next_retry_at,
        'retry_delay_ms', v_retry_delay_ms
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TASK_DEPENDENCIES TABLE
-- Child ordering and dependency management
-- ============================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    is_blocking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS task_dependencies_service_all ON task_dependencies FOR ALL USING (true);

-- ============================================
-- 11. ROLLBACK-READY FIELDS (V1 Lightweight)
-- ============================================

-- Add rollback snapshot fields to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS rollback_snapshot JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rollback_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rollback_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS previous_status TEXT,
ADD COLUMN IF NOT EXISTS previous_result_payload JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS previous_assigned_agent_id TEXT,
ADD COLUMN IF NOT EXISTS checkpoint_count INTEGER DEFAULT 0;

-- ============================================
-- 12. TASK_CHECKPOINTS TABLE
-- For full rollback capability
-- ============================================

CREATE TABLE IF NOT EXISTS task_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    checkpoint_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    result_payload JSONB DEFAULT '{}',
    assigned_agent_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_checkpoints_task_id ON task_checkpoints(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checkpoints_number ON task_checkpoints(task_id, checkpoint_number DESC);

ALTER TABLE task_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS task_checkpoints_service_all ON task_checkpoints FOR ALL USING (true);

-- ============================================
-- 13. CREATE CHECKPOINT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_task_checkpoint(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_checkpoint_number INTEGER;
BEGIN
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task not found');
    END IF;
    
    -- Get next checkpoint number
    SELECT COALESCE(MAX(checkpoint_number), 0) + 1 INTO v_checkpoint_number
    FROM task_checkpoints
    WHERE task_id = p_task_id;
    
    -- Create checkpoint
    INSERT INTO task_checkpoints (
        task_id, checkpoint_number, status, result_payload, assigned_agent_id
    ) VALUES (
        p_task_id, v_checkpoint_number, v_task.status, 
        v_task.result_payload, v_task.assigned_agent_id
    );
    
    -- Update task with rollback availability
    UPDATE tasks SET
        rollback_available = TRUE,
        rollback_expires_at = NOW() + INTERVAL '24 hours',
        checkpoint_count = v_checkpoint_number,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'checkpoint_number', v_checkpoint_number,
        'rollback_available', true,
        'rollback_expires_at', NOW() + INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. ROLLBACK TASK FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION rollback_task(
    p_task_id UUID,
    p_checkpoint_number INTEGER DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_checkpoint RECORD;
BEGIN
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task not found');
    END IF;
    
    -- Check rollback availability
    IF NOT COALESCE(v_task.rollback_available, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rollback not available for this task');
    END IF;
    
    IF v_task.rollback_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rollback window has expired');
    END IF;
    
    -- Get checkpoint (latest if not specified)
    IF p_checkpoint_number IS NULL THEN
        SELECT * INTO v_checkpoint
        FROM task_checkpoints
        WHERE task_id = p_task_id
        ORDER BY checkpoint_number DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_checkpoint
        FROM task_checkpoints
        WHERE task_id = p_task_id AND checkpoint_number = p_checkpoint_number;
    END IF;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Checkpoint not found');
    END IF;
    
    -- Store current state before rollback
    UPDATE tasks SET
        previous_status = status,
        previous_result_payload = result_payload,
        previous_assigned_agent_id = assigned_agent_id,
        rollback_snapshot = jsonb_build_object(
            'status', status,
            'result_payload', result_payload,
            'assigned_agent_id', assigned_agent_id,
            'checkpoint_number', v_checkpoint.checkpoint_number,
            'rolled_back_at', NOW(),
            'reason', p_reason
        ),
        -- Restore checkpoint state
        status = v_checkpoint.status,
        result_payload = v_checkpoint.result_payload,
        assigned_agent_id = v_checkpoint.assigned_agent_id,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    -- Log the rollback
    INSERT INTO task_state_transitions (task_id, previous_state, new_state, transitioned_by, reason)
    VALUES (p_task_id, v_task.status, v_checkpoint.status, 'system', 'ROLLBACK: ' || COALESCE(p_reason, 'User initiated'));
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'restored_to_checkpoint', v_checkpoint.checkpoint_number,
        'previous_status', v_task.status,
        'new_status', v_checkpoint.status,
        'rolled_back_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. CHECK DEPENDENCIES FUNCTION
-- Returns tasks ready to run (dependencies met)
-- ============================================

CREATE OR REPLACE FUNCTION get_tasks_with_unmet_dependencies(p_parent_id UUID)
RETURNS TABLE (
    task_id UUID,
    task_title TEXT,
    blocked_by UUID[],
    blocking_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        ARRAY_AGG(td.depends_on_task_id) FILTER (WHERE td.is_blocking) AS blocked_by,
        COUNT(td.depends_on_task_id) FILTER (WHERE td.is_blocking)::INTEGER AS blocking_count
    FROM tasks t
    LEFT JOIN task_dependencies td ON t.id = td.task_id
    LEFT JOIN tasks dep ON td.depends_on_task_id = dep.id AND td.is_blocking
    WHERE t.parent_task_id = p_parent_id
    AND (dep.status IS NULL OR dep.status != 'completed')
    GROUP BY t.id, t.title;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. INDEXES FOR ORCHESTRATION QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_orchestration_id ON tasks(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_accepted ON tasks(parent_task_id, accepted_by_agent_id) WHERE accepted_by_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_children ON tasks(status) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_next_retry ON tasks(next_retry_at) WHERE status = 'pending' AND retry_count > 0;
CREATE INDEX IF NOT EXISTS idx_tasks_rollback_available ON tasks(rollback_expires_at) WHERE rollback_available = TRUE;