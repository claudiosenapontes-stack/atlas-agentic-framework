-- Migration: Add Gate 3 delegation fields to tasks table
-- Command: ATLAS-GATE3-IMPLEMENT-157
-- Date: 2026-03-12

-- Add parent_task_id for hierarchical task relationships
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add delegated_by to track which agent created the delegation
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Add delegated_at timestamp
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_by ON tasks(delegated_by);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_at ON tasks(delegated_at);

-- Add comment for documentation
COMMENT ON COLUMN tasks.parent_task_id IS 'Reference to parent task for hierarchical delegation';
COMMENT ON COLUMN tasks.delegated_by IS 'Agent who delegated this task to another agent';
COMMENT ON COLUMN tasks.delegated_at IS 'Timestamp when this task was delegated';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('parent_task_id', 'delegated_by', 'delegated_at')
ORDER BY ordinal_position;
