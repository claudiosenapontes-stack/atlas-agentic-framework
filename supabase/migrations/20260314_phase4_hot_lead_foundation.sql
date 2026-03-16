-- ATLAS-PHASE4-HOT-LEAD-FOUNDATION-1211
-- Phase 4: Lead Scoring, SLA Tracking, Attribution Schema
-- Created: 2026-03-14

BEGIN;

-- ============================================
-- 1. LEAD SCORING SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Score components
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_version INTEGER DEFAULT 1,
  
  -- Component breakdown
  demographic_score INTEGER DEFAULT 0,
  behavioral_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  fit_score INTEGER DEFAULT 0,
  
  -- Scoring metadata
  scored_at TIMESTAMPTZ DEFAULT NOW(),
  scored_by VARCHAR(100), -- 'model', 'rule', 'manual'
  model_version VARCHAR(50),
  
  -- Trigger flags
  is_hot BOOLEAN DEFAULT false,
  threshold_reached_at TIMESTAMPTZ,
  
  -- Raw signals
  signals JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_company ON lead_scores(company_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_hot ON lead_scores(is_hot, threshold_reached_at) WHERE is_hot = true;
CREATE INDEX IF NOT EXISTS idx_lead_scores_range ON lead_scores(score) WHERE score >= 80;

-- RLS
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS lead_scores_service_all ON lead_scores FOR ALL USING (true);

-- ============================================
-- 2. SLA TRACKING SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  
  -- SLA targets
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER,
  
  -- Business hours
  business_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "timezone": "America/New_York"}',
  exclude_weekends BOOLEAN DEFAULT true,
  exclude_holidays BOOLEAN DEFAULT true,
  
  -- Priority mappings
  priority_config JSONB DEFAULT '{
    "hot": {"response_minutes": 15, "resolution_hours": 4},
    "high": {"response_minutes": 60, "resolution_hours": 24},
    "medium": {"response_minutes": 240, "resolution_hours": 72},
    "low": {"response_minutes": 480, "resolution_hours": 168}
  }',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA tracking per task/execution
CREATE TABLE IF NOT EXISTS sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
  company_id UUID NOT NULL,
  sla_policy_id UUID REFERENCES sla_policies(id),
  
  -- SLA metrics
  priority VARCHAR(50) NOT NULL,
  target_response_at TIMESTAMPTZ,
  target_resolution_at TIMESTAMPTZ,
  
  -- Actual times
  first_response_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- SLA status
  response_breached BOOLEAN DEFAULT false,
  resolution_breached BOOLEAN DEFAULT false,
  breach_reason TEXT,
  
  -- Pause tracking (for blocked/waiting states)
  paused_at TIMESTAMPTZ,
  paused_duration_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sla_policies_company ON sla_policies(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_task ON sla_tracking(task_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_execution ON sla_tracking(execution_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_breach ON sla_tracking(response_breached, resolution_breached) WHERE response_breached = true OR resolution_breached = true;
CREATE INDEX IF NOT EXISTS idx_sla_tracking_targets ON sla_tracking(target_response_at, target_resolution_at);

-- RLS
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS sla_policies_service_all ON sla_policies FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS sla_tracking_service_all ON sla_tracking FOR ALL USING (true);

-- ============================================
-- 3. ATTRIBUTION SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS attribution_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Touchpoint details
  touchpoint_type VARCHAR(100) NOT NULL, -- 'ad_click', 'email_open', 'website_visit', 'form_submit', 'call', 'meeting'
  channel VARCHAR(100), -- 'meta', 'linkedin', 'google', 'email', 'organic', 'direct'
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  ad_id VARCHAR(255),
  creative_id VARCHAR(255),
  
  -- UTM parameters
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  
  -- Engagement data
  engagement_value DECIMAL(10,2),
  engagement_duration_seconds INTEGER,
  
  -- Attribution weight (calculated)
  attribution_weight DECIMAL(5,4) DEFAULT 0.0000,
  attribution_model VARCHAR(50), -- 'first_touch', 'last_touch', 'linear', 'position_based', 'time_decay'
  
  -- Timestamps
  touched_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Device/location
  device_type VARCHAR(50),
  referrer_url TEXT,
  landing_page TEXT,
  ip_hash VARCHAR(64), -- hashed IP for privacy
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution summary (materialized view alternative - aggregated table)
CREATE TABLE IF NOT EXISTS attribution_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- First touch
  first_touch_channel VARCHAR(100),
  first_touch_campaign VARCHAR(255),
  first_touch_at TIMESTAMPTZ,
  
  -- Last touch
  last_touch_channel VARCHAR(100),
  last_touch_campaign VARCHAR(255),
  last_touch_at TIMESTAMPTZ,
  
  -- Multi-touch summary
  total_touchpoints INTEGER DEFAULT 0,
  unique_channels INTEGER DEFAULT 0,
  unique_campaigns INTEGER DEFAULT 0,
  
  -- Channel distribution
  channel_distribution JSONB DEFAULT '{}',
  
  -- Conversion
  converted_at TIMESTAMPTZ,
  conversion_value DECIMAL(10,2),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attribution_lead ON attribution_touchpoints(lead_id, touched_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_company ON attribution_touchpoints(company_id, touched_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_channel ON attribution_touchpoints(channel, touchpoint_type);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON attribution_touchpoints(campaign_id, touched_at);
CREATE INDEX IF NOT EXISTS idx_attribution_summary_lead ON attribution_summaries(lead_id);

-- RLS
ALTER TABLE attribution_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS attribution_touch_service_all ON attribution_touchpoints FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS attribution_summary_service_all ON attribution_summaries FOR ALL USING (true);

-- ============================================
-- 4. WORKFLOW EVENTS TABLE (Unified Event Stream)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  
  -- Event classification
  event_type VARCHAR(100) NOT NULL, -- 'lead_scored_hot', 'task_completed', 'sla_breach', 'attribution_trigger'
  event_subtype VARCHAR(100),
  
  -- Source
  source VARCHAR(100) NOT NULL, -- 'lead_score', 'sla_tracker', 'attribution', 'manual', 'webhook'
  source_id UUID,
  
  -- Payload
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Processing state
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Workflow linking
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_events_type ON workflow_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_unprocessed ON workflow_events(processed, created_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_workflow_events_company ON workflow_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_source ON workflow_events(source, source_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_exec ON workflow_events(workflow_execution_id);

-- RLS
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS workflow_events_service_all ON workflow_events FOR ALL USING (true);

-- ============================================
-- 5. REALTIME PUBLICATION
-- ============================================

DO $$
BEGIN
  -- Lead scores
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lead_scores;
  END IF;
  
  -- SLA tracking
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sla_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sla_tracking;
  END IF;
  
  -- Workflow events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_events;
  END IF;
  
  -- Attribution touchpoints
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attribution_touchpoints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attribution_touchpoints;
  END IF;
  
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Publication supabase_realtime does not exist';
END $$;

-- ============================================
-- 6. DEFAULT SLA POLICY INSERT
-- ============================================

INSERT INTO sla_policies (name, company_id, response_time_minutes, resolution_time_minutes, priority_config) VALUES (
  'default_hot_lead_sla',
  (SELECT id FROM companies LIMIT 1),
  15,
  240,
  '{
    "hot": {"response_minutes": 15, "resolution_hours": 4},
    "high": {"response_minutes": 60, "resolution_hours": 24},
    "medium": {"response_minutes": 240, "resolution_hours": 72},
    "low": {"response_minutes": 480, "resolution_hours": 168}
  }'::jsonb
) ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT * FROM lead_scores WHERE is_hot = true ORDER BY scored_at DESC LIMIT 10;
-- SELECT * FROM sla_tracking WHERE response_breached = true;
-- SELECT * FROM attribution_touchpoints ORDER BY touched_at DESC LIMIT 10;
-- SELECT * FROM workflow_events WHERE processed = false ORDER BY created_at DESC;
