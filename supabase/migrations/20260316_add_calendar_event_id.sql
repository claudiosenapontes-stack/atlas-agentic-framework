-- ATLAS-OPTIMUS-EO-CALENDAR-SCHEMA-FIX-001
-- Add missing calendar_event_id column to executive_events
-- Timestamp: 2026-03-16 03:35 EDT

-- Add the missing column
ALTER TABLE executive_events 
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_executive_events_calendar_event_id 
ON executive_events(calendar_event_id) 
WHERE calendar_event_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN executive_events.calendar_event_id IS 
'External calendar system event ID (Google Calendar, Outlook, etc.) - generic identifier';
