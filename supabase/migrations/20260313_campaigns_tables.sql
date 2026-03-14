-- Campaigns data model for ARQIA marketing performance tracking
-- Migration: campaigns_tables

-- Companies table (if not exists)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    source_platform TEXT DEFAULT 'csv_manual',
    campaign_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign daily metrics table
CREATE TABLE IF NOT EXISTS campaign_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    metric_date DATE NOT NULL,
    spend DECIMAL(12,2) DEFAULT 0,
    leads INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    calls_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, metric_date)
);

-- Import tracking table
CREATE TABLE IF NOT EXISTS campaign_imports (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    rows_received INTEGER DEFAULT 0,
    rows_accepted INTEGER DEFAULT 0,
    rows_quarantined INTEGER DEFAULT 0,
    campaigns_normalized INTEGER DEFAULT 0,
    summary JSONB,
    quarantine_details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert ARQIA company
INSERT INTO companies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'ARQIA', 'arqia')
ON CONFLICT (slug) DO UPDATE SET name = 'ARQIA';

-- RLS policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_all ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY campaign_daily_metrics_all ON campaign_daily_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY campaign_imports_all ON campaign_imports FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON campaign_daily_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON campaign_daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_company_date ON campaign_daily_metrics(company_id, metric_date);
