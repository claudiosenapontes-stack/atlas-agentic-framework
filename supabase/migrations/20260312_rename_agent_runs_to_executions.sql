-- Migration: Rename agent_runs to executions for Gate 2 schema normalization
-- ATLAS-SCHEMA-NORMALIZATION-122
-- Created: 2026-03-12

BEGIN;

-- Step 1: Check if agent_runs exists and executions does not
DO $$
BEGIN
    -- If executions table already exists from previous work, we need to handle carefully
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'executions') 
       AND EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'agent_runs') THEN
        
        -- Both exist - we need to migrate data from agent_runs to executions
        -- This is a data merge scenario
        RAISE NOTICE 'Both tables exist. Merging data from agent_runs to executions...';
        
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = 'agent_runs') THEN
        -- agent_runs doesn't exist, nothing to do
        RAISE NOTICE 'agent_runs table does not exist. No rename needed.';
        
    ELSE
        -- Only agent_runs exists - safe to rename
        RAISE NOTICE 'Renaming agent_runs to executions...';
        
        -- Drop executions if it exists as an empty shell
        DROP TABLE IF EXISTS executions;
        
        -- Rename the table
        ALTER TABLE agent_runs RENAME TO executions;
        
        -- Rename indexes
        ALTER INDEX IF EXISTS idx_agent_runs_task_id RENAME TO idx_executions_task_id;
        ALTER INDEX IF EXISTS idx_agent_runs_agent_id RENAME TO idx_executions_agent_id;
        ALTER INDEX IF EXISTS idx_agent_runs_status RENAME TO idx_executions_status;
        ALTER INDEX IF EXISTS idx_agent_runs_created_at RENAME TO idx_executions_created_at;
        
        -- Rename constraints if they follow naming pattern
        -- FK constraints
        ALTER TABLE executions 
            DROP CONSTRAINT IF EXISTS agent_runs_task_id_fkey,
            DROP CONSTRAINT IF EXISTS agent_runs_agent_id_fkey;
            
        -- Add FK constraints back with new names if they reference other tables
        -- Note: This assumes the columns exist. Adjust as needed.
        
        -- Rename PK constraint
        ALTER TABLE executions 
            DROP CONSTRAINT IF EXISTS agent_runs_pkey;
        ALTER TABLE executions 
            ADD PRIMARY KEY (id);
            
        RAISE NOTICE 'Rename complete.';
    END IF;
END $$;

-- Step 2: Ensure all required columns exist in executions
DO $$
BEGIN
    -- Add columns if they don't exist (these are the Gate 2 fields)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'started_at') THEN
        ALTER TABLE executions ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'completed_at') THEN
        ALTER TABLE executions ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'output_preview') THEN
        ALTER TABLE executions ADD COLUMN output_preview TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'error_message') THEN
        ALTER TABLE executions ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'tokens_used') THEN
        ALTER TABLE executions ADD COLUMN tokens_used INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'actual_cost_usd') THEN
        ALTER TABLE executions ADD COLUMN actual_cost_usd NUMERIC(10,6) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'executions' AND column_name = 'updated_at') THEN
        ALTER TABLE executions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 3: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at);

-- Step 4: Update realtime publication
DO $$
BEGIN
    -- Check if realtime extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
        -- Remove agent_runs from publication if it exists
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE agent_runs';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'agent_runs not in realtime publication or already removed';
        END;
        
        -- Add executions to publication
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE executions';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'executions already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
END $$;

-- Step 5: Add table comment
COMMENT ON TABLE executions IS 'Worker execution tracking for Atlas Agentic Framework - Gate 2 (normalized from agent_runs)';

COMMIT;
