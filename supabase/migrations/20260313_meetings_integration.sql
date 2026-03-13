-- Migration: Meetings and Calendar Integration Schema
-- ATLAS-MEETINGS-INTEGRATION-356
-- Created: 2026-03-13
-- Purpose: Store calendar events, Meet links, attendees, notes, and follow-ups

BEGIN;

-- ============================================================
-- 1. MEETINGS: Core calendar event storage
-- ============================================================

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- External Calendar IDs
    google_event_id TEXT,
    microsoft_event_id TEXT,
    
    -- Event Metadata
    title TEXT NOT NULL,
    description TEXT,
    
    -- Timing (stored in UTC)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    recurring_event_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    
    -- Meeting Links
    meet_link TEXT,
    zoom_link TEXT,
    teams_link TEXT,
    custom_link TEXT,
    dial_in_number TEXT,
    
    -- Organizer
    organizer_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    organizer_email TEXT,
    organizer_name TEXT,
    
    -- Status & Type
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled', 'completed', 'no_show')),
    meeting_type TEXT DEFAULT 'internal' CHECK (meeting_type IN ('internal', 'external', 'client', 'prospect', 'vendor', 'interview', 'standup', 'review')),
    visibility TEXT DEFAULT 'default' CHECK (visibility IN ('default', 'public', 'private', 'confidential')),
    
    -- Location
    location TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    is_hybrid BOOLEAN DEFAULT FALSE,
    
    -- Business Context
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    deal_id UUID,
    project_id UUID,
    
    -- Meeting Content
    agenda TEXT,
    meeting_notes JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '[]',
    decisions JSONB DEFAULT '[]',
    
    -- Recording & Transcript
    recording_url TEXT,
    transcript_text TEXT,
    transcript_summary TEXT,
    
    -- Follow-up Tracking
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_due_date TIMESTAMPTZ,
    follow_up_completed_at TIMESTAMPTZ,
    follow_up_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Sentiment & Outcome
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    outcome TEXT CHECK (outcome IN ('successful', 'needs_follow_up', 'cancelled', 'rescheduled', 'no_show')),
    next_steps TEXT,
    
    -- Sync Metadata
    last_synced_at TIMESTAMPTZ,
    sync_source TEXT DEFAULT 'manual' CHECK (sync_source IN ('manual', 'google_calendar', 'outlook', 'calendly')),
    etag TEXT,
    
    -- Audit
    created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_company_id ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_google_event_id ON meetings(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_follow_up_required ON meetings(follow_up_required) WHERE follow_up_required = TRUE;

-- ============================================================
-- 2. MEETING_ATTENDEES: Attendee tracking with RSVP status
-- ============================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    
    -- Attendee Identity
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT,
    
    -- RSVP Status
    response_status TEXT DEFAULT 'needsAction' CHECK (response_status IN ('needsAction', 'declined', 'tentative', 'accepted')),
    responded_at TIMESTAMPTZ,
    
    -- Attendance Tracking
    attended BOOLEAN,
    attended_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    attendance_duration_minutes INTEGER,
    
    -- Role
    is_organizer BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    role TEXT CHECK (role IN ('participant', 'observer', 'presenter', 'decision_maker')),
    
    notes TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meeting_id, email)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_agent_id ON meeting_attendees(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_email ON meeting_attendees(email);

-- ============================================================
-- 3. MEETING_TASKS: Link meetings to tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS meeting_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    link_type TEXT NOT NULL DEFAULT 'derived' CHECK (link_type IN (
        'preparation', 'agenda_item', 'action_item', 'follow_up', 'derived', 'blocked'
    )),
    
    context TEXT,
    extracted_from_transcript BOOLEAN DEFAULT FALSE,
    transcript_timestamp TEXT,
    assigned_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(meeting_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting_id ON meeting_tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_task_id ON meeting_tasks(task_id);

-- ============================================================
-- 4. MEETING_COMMUNICATIONS: Link meetings to emails/messages
-- ============================================================

CREATE TABLE IF NOT EXISTS meeting_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'message', 'call', 'note')),
    email_id TEXT,
    message_id TEXT,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    direction TEXT CHECK (direction IN ('incoming', 'outgoing', 'internal')),
    sent_at TIMESTAMPTZ,
    subject TEXT,
    sender_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_communications_meeting_id ON meeting_communications(meeting_id);

-- ============================================================
-- 5. MEETING_TEMPLATES: Reusable meeting structures
-- ============================================================

CREATE TABLE IF NOT EXISTS meeting_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    default_title TEXT,
    default_description TEXT,
    default_agenda TEXT,
    default_duration_minutes INTEGER DEFAULT 30,
    default_meeting_type TEXT DEFAULT 'internal',
    default_is_virtual BOOLEAN DEFAULT TRUE,
    default_attendees JSONB DEFAULT '[]',
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_templates_company_id ON meeting_templates(company_id);

-- ============================================================
-- 6. CALENDAR_SYNC_STATE: Track calendar synchronization
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'apple', 'calendly')),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_sync_token TEXT,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'failed')),
    last_sync_error TEXT,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_direction TEXT DEFAULT 'bidirectional',
    sync_window_days INTEGER DEFAULT 30,
    sync_past_days INTEGER DEFAULT 7,
    calendar_ids JSONB DEFAULT '[]',
    excluded_event_patterns JSONB DEFAULT '[]',
    webhook_channel_id TEXT,
    webhook_resource_id TEXT,
    webhook_expiration TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, email, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_state_agent_id ON calendar_sync_state(agent_id);

-- ============================================================
-- 7. Add meeting-related columns to existing tables
-- ============================================================

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meeting_context JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON tasks(meeting_id) WHERE meeting_id IS NOT NULL;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS last_meeting_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meeting_frequency_days INTEGER;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_meeting_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- ============================================================
-- 8. Views for common queries
-- ============================================================

CREATE OR REPLACE VIEW upcoming_meetings AS
SELECT 
    m.*,
    c.name as company_name,
    COUNT(ma.id) as attendee_count,
    COUNT(CASE WHEN ma.response_status = 'accepted' THEN 1 END) as accepted_count
FROM meetings m
LEFT JOIN companies c ON c.id = m.company_id
LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
WHERE m.start_time > NOW()
  AND m.status NOT IN ('cancelled', 'completed')
GROUP BY m.id, c.name
ORDER BY m.start_time ASC;

CREATE OR REPLACE VIEW meetings_requiring_follow_up AS
SELECT 
    m.*,
    c.name as company_name,
    mt.task_id as follow_up_task_id,
    t.status as follow_up_task_status
FROM meetings m
LEFT JOIN companies c ON c.id = m.company_id
LEFT JOIN meeting_tasks mt ON mt.meeting_id = m.id AND mt.link_type = 'follow_up'
LEFT JOIN tasks t ON t.id = mt.task_id
WHERE m.follow_up_required = TRUE
  AND (m.follow_up_completed_at IS NULL OR m.follow_up_completed_at > NOW() - INTERVAL '30 days')
ORDER BY m.follow_up_due_date ASC NULLS LAST;

CREATE OR REPLACE VIEW company_meeting_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(m.id) as total_meetings,
    COUNT(CASE WHEN m.start_time > NOW() - INTERVAL '30 days' THEN 1 END) as meetings_last_30_days,
    MAX(m.start_time) as last_meeting_date
FROM companies c
LEFT JOIN meetings m ON m.company_id = c.id AND m.status != 'cancelled'
GROUP BY c.id, c.name;

-- ============================================================
-- 9. Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;
CREATE TRIGGER meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_meetings_updated_at();

CREATE OR REPLACE FUNCTION update_meeting_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meeting_attendees_updated_at ON meeting_attendees;
CREATE TRIGGER meeting_attendees_updated_at
    BEFORE UPDATE ON meeting_attendees
    FOR EACH ROW EXECUTE FUNCTION update_meeting_attendees_updated_at();

-- ============================================================
-- 10. Realtime publication
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
        BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE meetings'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE meeting_attendees'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE meeting_tasks'; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
END $$;

COMMIT;
