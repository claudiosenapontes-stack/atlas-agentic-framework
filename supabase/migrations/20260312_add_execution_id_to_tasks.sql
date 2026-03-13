-- Migration: Add execution_id to tasks table for Gate 3 result visibility
-- Created: 2026-03-12
-- Command: ATLAS-GATE3-RESULT-PERSISTENCE-FIX-202

-- Add execution_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES executions(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tasks_execution_id ON tasks(execution_id);

-- Add comment for documentation
COMMENT ON COLUMN tasks.execution_id IS 'References the current/active execution for this task. Set when task is claimed, updated on execution completion.';
