-- ATLAS-GATE4-SCHEMA-RECON-264
-- Comprehensive schema reconciliation for Gate 4 MVP
-- Fixes ALL missing columns in workflow_executions and workflow_tasks
-- Created: 2026-03-12

BEGIN;

-- ============================================
-- WORKFLOW_EXECUTIONS: Add ALL missing columns
-- ============================================

-- Progress tracking columns
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS total_tasks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS completed_tasks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS failed_tasks INTEGER NOT NULL DEFAULT 0;

-- Company/tenant isolation
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS company_id UUID;

-- Current task tracking
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS current_task_id UUID;

-- Execution context
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}';

-- Error tracking
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS error_task_id UUID;

-- Triggered by
ALTER TABLE workflow_executions 
    ADD COLUMN IF NOT EXISTS triggered_by TEXT;

-- ============================================
-- WORKFLOW_TASKS: Add ALL missing columns
-- ============================================

-- Config overrides
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS config_overrides JSONB DEFAULT '{}';

-- Execution order
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS execution_order INTEGER NOT NULL DEFAULT 0;

-- Dependencies array
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS dependencies UUID[] DEFAULT '{}';

-- Input/output mapping
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS input_mapping JSONB DEFAULT '{}';

ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS output_mapping JSONB DEFAULT '{}';

-- Error tracking
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Task reference
ALTER TABLE workflow_tasks 
    ADD COLUMN IF NOT EXISTS task_id UUID;

-- ============================================
-- CREATE INDEXES
-- ============================================

-- workflow_executions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_company_id ON workflow_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_task ON workflow_executions(current_task_id);

-- workflow_tasks indexes
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow_id ON workflow_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_task_id ON workflow_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_execution_order ON workflow_tasks(workflow_id, execution_order);

-- ============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- workflow_executions FKs
ALTER TABLE workflow_executions
    DROP CONSTRAINT IF EXISTS workflow_executions_workflow_id_fkey,
    ADD CONSTRAINT workflow_executions_workflow_id_fkey
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;

ALTER TABLE workflow_executions
    DROP CONSTRAINT IF EXISTS workflow_executions_current_task_id_fkey,
    ADD CONSTRAINT workflow_executions_current_task_id_fkey
    FOREIGN KEY (current_task_id) REFERENCES workflow_tasks(id) ON DELETE SET NULL;

ALTER TABLE workflow_executions
    DROP CONSTRAINT IF EXISTS workflow_executions_error_task_id_fkey,
    ADD CONSTRAINT workflow_executions_error_task_id_fkey
    FOREIGN KEY (error_task_id) REFERENCES workflow_tasks(id) ON DELETE SET NULL;

ALTER TABLE workflow_executions
    DROP CONSTRAINT IF EXISTS workflow_executions_company_id_fkey,
    ADD CONSTRAINT workflow_executions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- workflow_tasks FKs
ALTER TABLE workflow_tasks
    DROP CONSTRAINT IF EXISTS workflow_tasks_workflow_id_fkey,
    ADD CONSTRAINT workflow_tasks_workflow_id_fkey
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;

ALTER TABLE workflow_tasks
    DROP CONSTRAINT IF EXISTS workflow_tasks_task_id_fkey,
    ADD CONSTRAINT workflow_tasks_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================
-- CREATE UPDATED_AT TRIGGERS
-- ============================================

-- workflow_executions trigger
CREATE OR REPLACE FUNCTION update_workflow_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_executions_updated_at();

-- workflow_tasks trigger
CREATE OR REPLACE FUNCTION update_workflow_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_tasks_updated_at ON workflow_tasks;
CREATE TRIGGER workflow_tasks_updated_at
    BEFORE UPDATE ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_tasks_updated_at();

-- ============================================
-- ADD TABLE COMMENTS
-- ============================================

COMMENT ON TABLE workflow_executions IS 'Gate 4: Runtime execution state for workflow orchestrations';
COMMENT ON COLUMN workflow_executions.execution_context IS 'Runtime state including intermediate outputs from completed tasks';

COMMENT ON TABLE workflow_tasks IS 'Gate 4: Individual tasks within a workflow orchestration';
COMMENT ON COLUMN workflow_tasks.dependencies IS 'Array of workflow_task IDs that must complete before this task can run';
COMMENT ON COLUMN workflow_tasks.execution_order IS 'Sequential execution order (for simple linear workflows)';

COMMIT;
