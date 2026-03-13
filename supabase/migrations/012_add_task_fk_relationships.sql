-- Migration: Add FK relationships for tasks table
-- Fixes API join failures in /api/tasks

-- Add company_id FK if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN company_id UUID;
    END IF;
END $$;

-- Add assigned_agent_id as TEXT (matches agents.id type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assigned_agent_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assigned_agent_id TEXT;
    END IF;
END $$;

-- Add FK constraint to companies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_company_id_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add FK constraint to agents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assigned_agent_id_fkey' AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_assigned_agent_id_fkey 
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Update existing NULL company_ids to default company for orphaned tasks
UPDATE tasks 
SET company_id = '29712e4c-a88a-4269-8adb-2802a79087a6'
WHERE company_id IS NULL;

COMMENT ON TABLE tasks IS 'Atlas tasks with FK relationships to companies and agents';
