-- Migration: Create workflow_tasks table for Gate 4 orchestration MVP
-- ATLAS-GATE4-MVP-241
-- Created: 2026-03-12

BEGIN;

-- Create workflow_tasks table
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    
    -- Task reference (links to tasks table)
    task_id UUID,
    
    -- Task configuration within workflow context
    name TEXT NOT NULL,
    description TEXT,
    agent_id TEXT,  -- Which agent should execute this task
    
    -- Dependency resolution
    dependencies UUID[] DEFAULT '{}', -- Array of workflow_task IDs this task depends on
    
    -- Execution order (for sequential orchestration)
    execution_order INTEGER NOT NULL DEFAULT 0,
    
    -- Status within workflow context
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'ready', 'in_progress', 'completed', 'failed', 'skipped')),
    
    -- Input/output configuration
    input_mapping JSONB DEFAULT '{}',  -- How to map previous outputs to this task's input
    output_mapping JSONB DEFAULT '{}', -- How to map this task's output to workflow result
    
    -- Configuration overrides
    config_overrides JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow_id ON workflow_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_task_id ON workflow_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_execution_order ON workflow_tasks(workflow_id, execution_order);

-- Add FK constraints
ALTER TABLE workflow_tasks
    DROP CONSTRAINT IF EXISTS workflow_tasks_workflow_id_fkey,
    ADD CONSTRAINT workflow_tasks_workflow_id_fkey
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;

ALTER TABLE workflow_tasks
    DROP CONSTRAINT IF EXISTS workflow_tasks_task_id_fkey,
    ADD CONSTRAINT workflow_tasks_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- Add table comment
COMMENT ON TABLE workflow_tasks IS 'Gate 4: Individual tasks within a workflow orchestration';
COMMENT ON COLUMN workflow_tasks.dependencies IS 'Array of workflow_task IDs that must complete before this task can run';
COMMENT ON COLUMN workflow_tasks.execution_order IS 'Sequential execution order (for simple linear workflows)';

-- Create updated_at trigger
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

COMMIT;
