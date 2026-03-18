-- ATLAS-OPTIMUS-CALENDAR-EVENTS-9864
-- Migration: Create calendar_events table for Google Calendar sync
-- Created: 2026-03-18
-- Task: 9864-E (Calendar Events Table)

BEGIN;

-- calendar_events: Stores synced Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_event_id TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'confirmed',
    html_link TEXT,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_id ON calendar_events(calendar_event_id);

COMMIT;
