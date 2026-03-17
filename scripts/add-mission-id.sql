-- Add mission_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mission_id TEXT;

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;
