-- Migration: Add metadata column to tasks table for Gate 4 workflow integration
-- ATLAS-GATE4-ENGINE-ADVANCE-340
-- Created: 2026-03-13

BEGIN;

-- Add metadata JSONB column for workflow context storage
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_tasks_metadata_workflow ON tasks USING GIN ((metadata->'workflow_execution_id'));

COMMENT ON COLUMN tasks.metadata IS 'Gate 4: Workflow execution context and step configuration';

COMMIT;
