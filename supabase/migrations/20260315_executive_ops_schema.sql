-- ATLAS-EXECUTIVE-OPS-SCHEMA-001
-- Migration: Executive Operations Schema
-- Created: 2026-03-15

BEGIN;

-- 1. EXECUTIVE_EVENTS
CREATE TABLE IF NOT EXISTS executive_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'call', 'deadline', 'reminder', 'travel', 'focus_time')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    is_all_day BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    owner_email TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    attendees JSONB DEFAULT '[]',
    attendee_count INTEGER DEFAULT 0,
    location TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    meet_link TEXT,
    zoom_link TEXT,
    google_event_id TEXT,
    outlook_event_id TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled', 'completed', 'no_show')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'confidential')),
    recurrence_rule TEXT,
    recurring_event_id UUID REFERENCES executive_events(id) ON DELETE SET NULL,
    agenda TEXT,
    prep_required BOOLEAN DEFAULT FALSE,
    prep_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    sync_source TEXT DEFAULT 'manual' CHECK (sync_source IN ('manual', 'google_calendar', 'outlook', 'calendly')),
    etag TEXT
);

CREATE INDEX IF NOT EXISTS idx_executive_events_owner ON executive_events(owner_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_executive_events_company ON executive_events(company_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_executive_events_time_range ON executive_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_executive_events_status ON executive_events(status) WHERE status IN ('confirmed', 'tentative');

-- 2. MEETING_RECORDS
CREATE TABLE IF NOT EXISTS meeting_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES executive_events(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('notes', 'transcript', 'recording', 'summary', 'action_items')),
    content TEXT NOT NULL,
    content_json JSONB DEFAULT '{}',
    source TEXT CHECK (source IN ('manual', 'plaud', 'otter', 'zoom', 'meet', 'agent')),
    source_url TEXT,
    processed_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    processing_status TEXT DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processing', 'completed', 'error')),
    key_points JSONB DEFAULT '[]',
    decisions JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    language TEXT DEFAULT 'en',
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_records_event ON meeting_records(event_id, record_type);
CREATE INDEX IF NOT EXISTS idx_meeting_records_type ON meeting_records(record_type);

-- 3. MEETING_DECISIONS
CREATE TABLE IF NOT EXISTS meeting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES executive_events(id) ON DELETE CASCADE,
    record_id UUID REFERENCES meeting_records(id) ON DELETE SET NULL,
    decision TEXT NOT NULL,
    context TEXT,
    category TEXT CHECK (category IN ('strategic', 'operational', 'financial', 'personnel', 'product', 'technical', 'other')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'deferred', 'implemented')),
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by JSONB DEFAULT '[]',
    approved_at TIMESTAMPTZ,
    implementation_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    implemented_at TIMESTAMPTZ,
    proposed_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    extracted_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_event ON meeting_decisions(event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_status ON meeting_decisions(status) WHERE status IN ('proposed', 'approved');
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_category ON meeting_decisions(category);

-- 4. MEETING_TASKS
CREATE TABLE IF NOT EXISTS meeting_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES executive_events(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    record_id UUID REFERENCES meeting_records(id) ON DELETE SET NULL,
    extracted_from_transcript BOOLEAN DEFAULT FALSE,
    transcript_timestamp TEXT,
    context_quote TEXT,
    assigned_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    priority_at_creation TEXT,
    due_date_at_creation TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_tasks_event ON meeting_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_task ON meeting_tasks(task_id);

-- 5. WATCH_RULES
CREATE TABLE IF NOT EXISTS watch_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('email_subject', 'email_sender', 'email_body', 'email_attachment', 'file_created', 'calendar_invite', 'keyword_match', 'regex_match')),
    pattern TEXT NOT NULL,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    email_account TEXT,
    folder_pattern TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'create_event', 'notify', 'escalate', 'tag', 'forward', 'archive', 'alert')),
    action_payload JSONB DEFAULT '{}',
    auto_execute BOOLEAN DEFAULT FALSE,
    require_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    match_count INTEGER DEFAULT 0,
    last_match_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    watch_schedule TEXT DEFAULT 'continuous' CHECK (watch_schedule IN ('continuous', 'hourly', 'daily', 'manual')),
    last_check_at TIMESTAMPTZ,
    created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_rules_owner ON watch_rules(owner_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_watch_rules_company ON watch_rules(company_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_watch_rules_type ON watch_rules(rule_type);

-- 6. WATCH_ALERTS
CREATE TABLE IF NOT EXISTS watch_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watch_rule_id UUID NOT NULL REFERENCES watch_rules(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('email', 'file', 'calendar_event', 'message', 'document')),
    content_id TEXT,
    content_preview TEXT,
    content_url TEXT,
    matched_pattern TEXT,
    match_confidence DECIMAL(3,2),
    source_account TEXT,
    source_sender TEXT,
    source_subject TEXT,
    received_at TIMESTAMPTZ,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'actioned', 'ignored', 'escalated', 'error')),
    action_taken TEXT,
    actioned_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    actioned_at TIMESTAMPTZ,
    auto_action_triggered BOOLEAN DEFAULT FALSE,
    auto_action_success BOOLEAN,
    auto_action_error TEXT,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    event_id UUID REFERENCES executive_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_alerts_status ON watch_alerts(status) WHERE status IN ('new', 'escalated');
CREATE INDEX IF NOT EXISTS idx_watch_alerts_owner ON watch_alerts(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_alerts_rule ON watch_alerts(watch_rule_id, created_at DESC);

-- 7. APPROVALS
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type TEXT NOT NULL CHECK (request_type IN ('expense', 'contract', 'hire', 'termination', 'budget', 'travel', 'meeting_schedule', 'task_delegation', 'data_access', 'system_change', 'vendor_selection', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    requested_by UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    requester_notes TEXT,
    approver_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    approver_role TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled', 'expired')),
    approved_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approver_notes TEXT,
    rejected_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    escalated_to UUID REFERENCES agents(id) ON DELETE SET NULL,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    expires_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_event_id UUID REFERENCES executive_events(id) ON DELETE SET NULL,
    external_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_requester ON approvals(requested_by, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(request_type, status);

-- 8. DECISION_QUEUE
CREATE TABLE IF NOT EXISTS decision_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL CHECK (item_type IN ('approval', 'meeting_decision', 'watch_alert', 'task_escalation', 'system_alert')),
    source_id UUID NOT NULL,
    source_table TEXT NOT NULL CHECK (source_table IN ('approvals', 'meeting_decisions', 'watch_alerts', 'tasks')),
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES agents(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
    urgency_score INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    context_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'snoozed', 'resolved', 'delegated', 'expired')),
    resolved_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_action TEXT CHECK (resolution_action IN ('approved', 'rejected', 'deferred', 'delegated', 'dismissed')),
    resolution_notes TEXT,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    next_reminder_at TIMESTAMPTZ,
    tags JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_queue_owner ON decision_queue(owner_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_decision_queue_assigned ON decision_queue(assigned_to, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_decision_queue_due ON decision_queue(due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_decision_queue_priority ON decision_queue(priority, created_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_decision_queue_type ON decision_queue(item_type, status);

COMMIT;
