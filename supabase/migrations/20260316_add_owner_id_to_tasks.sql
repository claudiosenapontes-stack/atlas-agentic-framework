-- ATLAS-OPTIMUS-TASK-OWNERSHIP-INTEGRITY-5008
-- Add owner_id column to tasks table for deterministic ownership

-- Add owner_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN owner_id TEXT;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
        
        -- Backfill: set owner_id = assigned_agent_id where owner_id is null
        UPDATE tasks 
        SET owner_id = assigned_agent_id 
        WHERE owner_id IS NULL AND assigned_agent_id IS NOT NULL;
        
        RAISE NOTICE 'Added owner_id column and backfilled % rows', (SELECT COUNT(*) FROM tasks WHERE owner_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'owner_id column already exists';
    END IF;
END $$;
