-- ATLAS-OPTIMUS-TASK-OWNERSHIP-5015
-- Add mission_id column to tasks table (referenced by decompose route)

-- Add mission_id column if not exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_mission_id ON tasks(mission_id);

-- Verify
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'mission_id';
