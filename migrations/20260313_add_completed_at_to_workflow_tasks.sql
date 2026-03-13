-- ATLAS-GATE4-DB-RUNTIME-CLOSEOUT-703
-- Fix missing completed_at column in workflow_tasks table
-- This is blocking workflow task completion

ALTER TABLE workflow_tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to workflow_tasks
DROP TRIGGER IF EXISTS update_workflow_tasks_updated_at ON workflow_tasks;
CREATE TRIGGER update_workflow_tasks_updated_at
    BEFORE UPDATE ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
