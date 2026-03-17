#!/bin/bash
# ATLAS-OPTIMUS-TASK-OWNERSHIP-INTEGRITY-5008
# Manual migration execution for owner_id column

echo "=== Migration: Add owner_id to tasks ==="
echo ""
echo "Run this SQL in your Supabase SQL Editor:"
echo ""
cat << 'SQL'
-- ATLAS-OPTIMUS-TASK-OWNERSHIP-INTEGRITY-5008
-- Add owner_id column to tasks table

-- Step 1: Add column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);

-- Step 3: Backfill existing tasks
UPDATE tasks 
SET owner_id = assigned_agent_id 
WHERE owner_id IS NULL 
AND assigned_agent_id IS NOT NULL;

-- Step 4: Verify
SELECT 
    COUNT(*) as total_tasks,
    COUNT(owner_id) as with_owner_id,
    COUNT(assigned_agent_id) as with_assigned_agent_id
FROM tasks;
SQL
echo ""
echo "=== End Migration ==="
