-- ATLAS-SOPHIA-LEADS-MODULE-START-002
-- Leads Module Schema
-- Tables: leads, lead_activities, pipeline_stages, deals
-- Generated: 2026-03-16

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. LEADS TABLE
-- Core lead capture and scoring
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID,
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  
  -- Lead Scoring (0-100)
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  
  -- Source Tracking
  source TEXT, -- 'website', 'manychat', 'campaign', 'manual', 'import'
  source_detail TEXT, -- specific campaign ID, ManyChat flow, etc.
  campaign_id UUID,
  landing_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Classification
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost', 'archived'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  lead_type TEXT, -- 'hot', 'warm', 'cold'
  
  -- Assignment
  assigned_to TEXT, -- agent ID
  assigned_at TIMESTAMPTZ,
  
  -- Engagement Tracking
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  contact_attempts INTEGER DEFAULT 0,
  
  -- Estimated Value
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  
  -- Communication Preferences
  preferred_channel TEXT, -- 'email', 'phone', 'whatsapp', 'telegram'
  timezone TEXT,
  language TEXT DEFAULT 'en',
  
  -- Custom Fields / Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  -- GDPR/Compliance
  consent_status TEXT DEFAULT 'pending', -- 'granted', 'denied', 'pending', 'withdrawn'
  consent_date TIMESTAMPTZ,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT leads_score_check CHECK (score >= 0 AND score <= 100),
  CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived')),
  CONSTRAINT leads_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT leads_type_check CHECK (lead_type IN ('hot', 'warm', 'cold')),
  CONSTRAINT leads_consent_check CHECK (consent_status IN ('granted', 'denied', 'pending', 'withdrawn'))
);

-- Indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_hot ON leads(score, status) WHERE score >= 80 AND status = 'new';

-- ============================================
-- 2. LEAD_ACTIVITIES TABLE
-- Audit trail of all lead interactions
-- ============================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID,
  
  -- Activity Details
  activity_type TEXT NOT NULL, -- 'note', 'email', 'call', 'meeting', 'sms', 'whatsapp', 'status_change', 'score_change', 'assignment', 'deal_created'
  activity_subtype TEXT, -- 'inbound', 'outbound', 'automated'
  
  -- Content
  subject TEXT,
  content TEXT,
  summary TEXT, -- AI-generated summary
  
  -- Outcome
  outcome TEXT, -- 'completed', 'no_answer', 'voicemail', 'scheduled', 'interested', 'not_interested', 'callback_requested'
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  
  -- Metadata
  duration_seconds INTEGER,
  recording_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Actor
  performed_by TEXT, -- agent ID or 'system'
  performed_by_type TEXT, -- 'agent', 'system', 'integration', 'lead'
  
  -- Related Records
  deal_id UUID,
  task_id UUID,
  campaign_id UUID,
  
  -- Engagement Metrics
  opened BOOLEAN,
  clicked BOOLEAN,
  replied BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT lead_activities_type_check CHECK (activity_type IN ('note', 'email', 'call', 'meeting', 'sms', 'whatsapp', 'telegram', 'status_change', 'score_change', 'assignment', 'deal_created', 'task_created', 'imported', 'webhook')),
  CONSTRAINT lead_activities_subtype_check CHECK (activity_subtype IN ('inbound', 'outbound', 'automated', 'manual')),
  CONSTRAINT lead_activities_outcome_check CHECK (outcome IN ('completed', 'no_answer', 'voicemail', 'scheduled', 'interested', 'not_interested', 'callback_requested', 'follow_up_needed', 'qualified', 'unqualified')),
  CONSTRAINT lead_activities_performer_check CHECK (performed_by_type IN ('agent', 'system', 'integration', 'lead'))
);

-- Indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON lead_activities(performed_by);

-- ============================================
-- 3. PIPELINE_STAGES TABLE
-- Customizable deal pipeline stages
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID,
  
  -- Stage Configuration
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FF6A00', -- hex color for UI
  icon TEXT, -- lucide icon name
  
  -- Pipeline Position
  order_index INTEGER NOT NULL DEFAULT 0,
  pipeline_name TEXT DEFAULT 'Default', -- for multiple pipelines
  
  -- Stage Behavior
  is_starting_stage BOOLEAN DEFAULT FALSE,
  is_closed_won BOOLEAN DEFAULT FALSE,
  is_closed_lost BOOLEAN DEFAULT FALSE,
  
  -- Automation
  auto_move_rules JSONB DEFAULT '[]', -- [{"condition": "email_opened", "target_stage": "qualified"}]
  required_fields TEXT[] DEFAULT '{}',
  
  -- Forecasting
  probability_weight INTEGER DEFAULT 0, -- 0-100, for revenue forecasting
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT pipeline_stages_probability_check CHECK (probability_weight >= 0 AND probability_weight <= 100),
  UNIQUE(company_id, pipeline_name, order_index)
);

-- Indexes for pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_id ON pipeline_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_name);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(order_index);

-- Insert default pipeline stages for ARQIA
INSERT INTO pipeline_stages (company_id, name, description, color, order_index, pipeline_name, is_starting_stage, probability_weight) VALUES
(NULL, 'New Lead', 'Initial contact or inquiry', '#6B7280', 0, 'Sales Pipeline', TRUE, 10),
(NULL, 'Contacted', 'First outreach made', '#3B82F6', 1, 'Sales Pipeline', FALSE, 20),
(NULL, 'Qualified', 'Qualified as potential opportunity', '#F59E0B', 2, 'Sales Pipeline', FALSE, 40),
(NULL, 'Proposal Sent', 'Proposal or quote delivered', '#8B5CF6', 3, 'Sales Pipeline', FALSE, 60),
(NULL, 'Negotiation', 'Terms being negotiated', '#EC4899', 4, 'Sales Pipeline', FALSE, 80),
(NULL, 'Closed Won', 'Deal successfully closed', '#10B981', 5, 'Sales Pipeline', FALSE, 100),
(NULL, 'Closed Lost', 'Deal lost or abandoned', '#EF4444', 6, 'Sales Pipeline', FALSE, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. DEALS TABLE
-- Opportunity/deal tracking
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID,
  
  -- Deal Information
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financials
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  recurring_value NUMERIC(12,2), -- Monthly recurring value
  
  -- Pipeline Position
  stage_id UUID REFERENCES pipeline_stages(id),
  pipeline_name TEXT DEFAULT 'Sales Pipeline',
  
  -- Related Records
  lead_id UUID REFERENCES leads(id),
  contact_ids UUID[], -- array of lead IDs involved
  
  -- Assignment
  owner_id TEXT, -- agent ID
  co_owner_ids TEXT[] DEFAULT '{}',
  
  -- Timeline
  expected_close_date DATE,
  actual_close_date TIMESTAMPTZ,
  
  -- Deal Stage History
  stage_history JSONB DEFAULT '[]', -- [{"stage_id": "...", "entered_at": "...", "duration_days": 5}]
  
  -- Source
  source TEXT,
  source_detail TEXT,
  campaign_id UUID,
  
  -- Probability (overrides stage default)
  probability INTEGER, -- 0-100
  
  -- Deal Status
  status TEXT DEFAULT 'open', -- 'open', 'won', 'lost', 'stalled', 'deleted'
  lost_reason TEXT, -- 'price', 'competitor', 'timing', 'features', 'budget', 'no_response', 'other'
  lost_reason_detail TEXT,
  
  -- Products/Services
  products JSONB DEFAULT '[]', -- [{"name": "Consulting", "quantity": 1, "price": 5000}]
  
  -- Custom Fields
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT deals_value_check CHECK (value >= 0),
  CONSTRAINT deals_status_check CHECK (status IN ('open', 'won', 'lost', 'stalled', 'deleted')),
  CONSTRAINT deals_lost_reason_check CHECK (lost_reason IN ('price', 'competitor', 'timing', 'features', 'budget', 'no_response', 'other')),
  CONSTRAINT deals_probability_check CHECK (probability >= 0 AND probability <= 100)
);

-- Indexes for deals
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

-- ============================================
-- 5. UPDATE TRIGGERS
-- Auto-update updated_at timestamps
-- ============================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to pipeline_stages
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to deals
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. LEAD SCORING FUNCTION
-- Calculate lead score based on source, engagement, and keywords
-- ============================================
CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_source TEXT,
  p_name TEXT,
  p_email TEXT,
  p_notes TEXT,
  p_custom_fields JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_source_weight INTEGER;
  v_engagement_score INTEGER := 0;
  v_urgency_score INTEGER := 0;
  v_combined_text TEXT;
BEGIN
  -- Source Weight (0-40 points)
  v_source_weight := CASE p_source
    WHEN 'manychat' THEN 35
    WHEN 'campaign' THEN 30
    WHEN 'website' THEN 25
    WHEN 'referral' THEN 35
    WHEN 'linkedin' THEN 20
    WHEN 'event' THEN 25
    WHEN 'import' THEN 15
    WHEN 'manual' THEN 20
    ELSE 10
  END;
  
  -- Engagement Score (0-30 points) - based on data completeness
  v_engagement_score := 10; -- base score
  
  IF p_email IS NOT NULL AND p_email != '' THEN
    v_engagement_score := v_engagement_score + 10;
  END IF;
  
  IF p_name IS NOT NULL AND LENGTH(p_name) > 3 THEN
    v_engagement_score := v_engagement_score + 10;
  END IF;
  
  -- Urgency Keywords (0-30 points)
  v_combined_text := LOWER(COALESCE(p_name, '') || ' ' || COALESCE(p_notes, '') || ' ' || COALESCE(p_custom_fields::TEXT, ''));
  
  -- High urgency keywords (+15 points)
  IF v_combined_text ~* '(urgent|asap|immediately|emergency|critical|ready to buy|decision made|budget approved)' THEN
    v_urgency_score := v_urgency_score + 15;
  END IF;
  
  -- Medium urgency keywords (+10 points)
  IF v_combined_text ~* '(send quote|call me|interested|pricing|demo|meeting|call)' THEN
    v_urgency_score := v_urgency_score + 10;
  END IF;
  
  -- Priority indicators (+5 points)
  IF v_combined_text ~* '(hot|priority|vip|important)' THEN
    v_urgency_score := v_urgency_score + 5;
  END IF;
  
  -- Calculate total (cap at 100)
  v_score := LEAST(100, v_source_weight + v_engagement_score + v_urgency_score);
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead score: source_weight + engagement_score + urgency_keywords. Max 100 points.';
