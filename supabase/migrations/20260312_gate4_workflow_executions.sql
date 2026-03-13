-- Migration: Create workflow_executions table for Gate 4 orchestration MVP
-- ATLAS-GATE4-MVP-241
-- Created: 2026-03-12

BEGIN;

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    
    -- Execution status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Initial input data
    initial_input JSONB DEFAULT '{}',
    
    -- Final output/result
    final_output JSONB DEFAULT '{}',
    
    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Progress tracking
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    failed_tasks INTEGER NOT NULL DEFAULT 0,
    
    -- Current task being executed
    current_task_id UUID,
    
    -- Execution context
    execution_context JSONB DEFAULT '{}', -- Runtime state, intermediate outputs, etc.
    
    -- Error tracking
    error_message TEXT,
    error_task_id UUID, -- Which task caused the failure
    
    -- Company/tenant isolation
    company_id UUID,
    
    -- User/agent who triggered the workflow
    triggered_by TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_company_id ON workflow_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_task ON workflow_executions(current_task_id);

-- Add FK constraints
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

-- Add FK constraint to companies
ALTER TABLE workflow_executions
    DROP CONSTRAINT IF EXISTS workflow_executions_company_id_fkey,
    ADD CONSTRAINT workflow_executions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Add table comment
COMMENT ON TABLE workflow_executions IS 'Gate 4: Runtime execution state for workflow orchestrations';
COMMENT ON COLUMN workflow_executions.execution_context IS 'Runtime state including intermediate outputs from completed tasks';

-- Create updated_at trigger
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

-- Add realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'workflow_executions already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
END $$;

COMMIT;
