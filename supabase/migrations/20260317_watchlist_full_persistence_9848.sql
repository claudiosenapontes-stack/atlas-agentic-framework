-- ATLAS-OPTIMUS-WATCHLIST-REAL-PERSISTENCE-9848
-- Create watch_rules table with full metadata support
-- Eliminates split between runtime config and DB

BEGIN;

-- WATCH_RULES TABLE - Full metadata persistence
CREATE TABLE IF NOT EXISTS watch_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core rule fields
    name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    rule_type TEXT DEFAULT 'keyword_match' CHECK (rule_type IN ('keyword_match', 'regex_match', 'sender_match', 'domain_match', 'subject_match', 'body_match', 'composite')),
    action_type TEXT DEFAULT 'alert' CHECK (action_type IN ('alert', 'auto_reply', 'escalate', 'tag', 'forward', 'summarize')),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Keywords and classification (STORED IN DB, not memory)
    critical_keywords TEXT[] DEFAULT '{}',
    high_keywords TEXT[] DEFAULT '{}',
    medium_keywords TEXT[] DEFAULT '{}',
    exclude_keywords TEXT[] DEFAULT '{}',
    classification_rules JSONB DEFAULT '{}',
    
    -- Reply and behavior configuration
    reply_scope TEXT DEFAULT 'none' CHECK (reply_scope IN ('none', 'single', 'thread', 'channel')),
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_template TEXT,
    
    -- Follow-up timing (STORED IN DB)
    follow_up_default_hours INTEGER DEFAULT 24,
    follow_up_urgent_hours INTEGER DEFAULT 4,
    follow_up_critical_hours INTEGER DEFAULT 1,
    auto_summarize BOOLEAN DEFAULT FALSE,
    
    -- Recipient chain and routing
    notify_agent_ids UUID[] DEFAULT '{}',
    notify_emails TEXT[] DEFAULT '{}',
    escalation_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Scope and filtering
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    email_account TEXT,
    folder_pattern TEXT DEFAULT 'inbox',
    watch_schedule JSONB DEFAULT '{"type": "realtime"}',
    
    -- Execution config
    auto_execute BOOLEAN DEFAULT FALSE,
    require_approval BOOLEAN DEFAULT FALSE,
    max_daily_alerts INTEGER DEFAULT 100,
    cooldown_minutes INTEGER DEFAULT 5,
    
    -- Metadata and tracking
    description TEXT,
    action_payload JSONB DEFAULT '{}',
    rule_metadata JSONB DEFAULT '{}',
    match_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMPTZ,
    last_alert_at TIMESTAMPTZ,
    
    -- Ownership
    owner_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_watch_rules_active ON watch_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_watch_rules_owner ON watch_rules(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_watch_rules_company ON watch_rules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_watch_rules_priority ON watch_rules(priority, is_active);
CREATE INDEX IF NOT EXISTS idx_watch_rules_type ON watch_rules(rule_type, action_type);
CREATE INDEX IF NOT EXISTS idx_watch_rules_pattern ON watch_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_watch_rules_keywords ON watch_rules USING GIN(critical_keywords);
CREATE INDEX IF NOT EXISTS idx_watch_rules_high_keywords ON watch_rules USING GIN(high_keywords);

-- RLS
ALTER TABLE watch_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS watch_rules_service_all ON watch_rules FOR ALL USING (true);

-- WATCH_ALERTS TABLE - Stores matched alerts
CREATE TABLE IF NOT EXISTS watch_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES watch_rules(id) ON DELETE CASCADE,
    
    -- Matched content
    source_type TEXT NOT NULL CHECK (source_type IN ('email', 'chat', 'form', 'api', 'system')),
    source_id TEXT,
    source_subject TEXT,
    source_sender TEXT,
    source_preview TEXT,
    
    -- Classification results
    matched_keywords TEXT[] DEFAULT '{}',
    classification_score INTEGER DEFAULT 0,
    priority_detected TEXT,
    
    -- Alert status
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'notified', 'acknowledged', 'dismissed', 'escalated', 'resolved')),
    notified_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Response tracking
    auto_replied BOOLEAN DEFAULT FALSE,
    reply_sent_at TIMESTAMPTZ,
    reply_content TEXT,
    
    -- Linked entities
    created_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
    
    -- Metadata
    alert_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_alerts_rule ON watch_alerts(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_alerts_status ON watch_alerts(status) WHERE status IN ('new', 'notified');
CREATE INDEX IF NOT EXISTS idx_watch_alerts_source ON watch_alerts(source_type, source_id);

ALTER TABLE watch_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS watch_alerts_service_all ON watch_alerts FOR ALL USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_watch_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS watch_rules_updated_at
    BEFORE UPDATE ON watch_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_watch_rules_timestamp();

-- Migration note
COMMENT ON TABLE watch_rules IS 'Watch rules with full metadata persistence - ATLAS-OPTIMUS-WATCHLIST-REAL-PERSISTENCE-9848';
COMMENT ON TABLE watch_alerts IS 'Alerts generated from watch rule matches';

COMMIT;
