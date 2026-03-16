-- ATLAS-OPTIMUS-EO-CLOSEOUT-090
-- Fix EO production blockers
-- 1. Add company_id to watchlist_items
-- 2. Add indexes for performance
-- 3. Verify approval_requests schema

-- Fix 1: Add company_id to watchlist_items if missing
ALTER TABLE IF EXISTS watchlist_items 
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Add index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_items_company_id 
ON watchlist_items(company_id);

-- Fix 2: Add indexes for approval_requests performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_id 
ON approval_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_id 
ON approval_requests(approver_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status 
ON approval_requests(status);

-- Fix 3: Add indexes for followup worker performance
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_task_id 
ON meeting_tasks(task_id);

CREATE INDEX IF NOT EXISTS idx_meeting_tasks_event_id 
ON meeting_tasks(event_id);

CREATE INDEX IF NOT EXISTS idx_executive_events_prep_required 
ON executive_events(prep_required, start_time) 
WHERE prep_required = true;

-- Verify tables exist and log status
DO $$
BEGIN
    -- Check watchlist_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'watchlist_items') THEN
        RAISE NOTICE 'watchlist_items table exists';
    ELSE
        RAISE NOTICE 'watchlist_items table MISSING - needs creation';
    END IF;
    
    -- Check approval_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests') THEN
        RAISE NOTICE 'approval_requests table exists';
    ELSE
        RAISE NOTICE 'approval_requests table MISSING - needs creation';
    END IF;
    
    -- Check meeting_tasks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_tasks') THEN
        RAISE NOTICE 'meeting_tasks table exists';
    ELSE
        RAISE NOTICE 'meeting_tasks table MISSING - needs creation';
    END IF;
    
    -- Check executive_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'executive_events') THEN
        RAISE NOTICE 'executive_events table exists';
    ELSE
        RAISE NOTICE 'executive_events table MISSING - needs creation';
    END IF;
END $$;

-- Log completion
INSERT INTO schema_migrations (name, applied_at)
VALUES ('20260316_eo_closeout_090_fixes', NOW())
ON CONFLICT (name) DO NOTHING;
