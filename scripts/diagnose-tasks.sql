-- ATLAS Task Persistence Diagnosis
-- Run this in Supabase SQL Editor

-- 1. Check tasks table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- 2. Check existing tasks count
SELECT COUNT(*) as task_count FROM tasks;

-- 3. Check tasks with their companies (verify FK)
SELECT t.id, t.title, t.status, t.company_id, c.name as company_name
FROM tasks t
LEFT JOIN companies c ON t.company_id = c.id
LIMIT 10;

-- 4. Check commands that should have created tasks
SELECT id, status, command_text, company_id, created_at
FROM commands
WHERE status IN ('executing', 'completed')
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test insert a task directly
INSERT INTO tasks (
    company_id, 
    title, 
    description, 
    status, 
    priority,
    task_type,
    assigned_agent_id
) VALUES (
    '29712e4c-a88a-4269-8adb-2802a79087a6',
    'DIAGNOSTIC: Test Task Insert',
    'Testing task persistence from Optimus diagnosis',
    'pending',
    'high',
    'diagnostic',
    'optimus'
)
RETURNING *;