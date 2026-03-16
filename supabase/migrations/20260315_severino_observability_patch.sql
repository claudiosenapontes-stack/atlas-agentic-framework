-- ATLAS-SEVERINO-OBSERVABILITY-PATCH-001
-- Migration: Agent Sessions, Cost Analytics, Integration Health Tables
-- Created: 2026-03-15

BEGIN;

-- ============================================================
-- 1. AGENT SESSIONS: Real-time session telemetry
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Agent Link
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Session Timing
    session_start TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    
    -- Context Window Telemetry
    context_tokens INTEGER DEFAULT 0,
    max_context INTEGER DEFAULT 128000, -- default for most models
    context_window_size INTEGER GENERATED ALWAYS AS (max_context) STORED,
    context_tokens_used INTEGER GENERATED ALWAYS AS (context_tokens) STORED,
    
    -- Session Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'terminated', 'error')),
    
    -- Session Metadata
    session_type TEXT DEFAULT 'standard' CHECK (session_type IN ('standard', 'workflow', 'adhoc', 'scheduled')),
    parent_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
    
    -- Runtime Info
    model TEXT,
    tools_available JSONB DEFAULT '[]',
    memory_refs JSONB DEFAULT '[]',
    
    -- Health
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON agent_sessions(agent_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_sessions_activity ON agent_sessions(last_activity DESC);

-- ============================================================
-- 2. DAILY COSTS: Aggregated daily cost analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Date (unique per agent per day)
    date DATE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Aggregates
    execution_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(12,6) DEFAULT 0,
    
    -- Breakdown
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    
    -- Model breakdown (stored as JSONB for flexibility)
    by_model JSONB DEFAULT '{}',
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_costs_date ON daily_costs(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_costs_agent ON daily_costs(agent_id, date DESC);

-- ============================================================
-- 3. MONTHLY COSTS: Aggregated monthly cost analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS monthly_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Month (unique per agent per month)
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Aggregates
    execution_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(12,6) DEFAULT 0,
    
    -- Breakdown
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    
    -- Model breakdown
    by_model JSONB DEFAULT '{}',
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(year, month, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_costs_period ON monthly_costs(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_costs_agent ON monthly_costs(agent_id, year DESC, month DESC);

-- ============================================================
-- 4. INTEGRATION HEALTH: Unified integration state tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Integration Identity
    integration_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('core', 'ai', 'infra', 'messaging', 'google')),
    
    -- Status (normalized schema)
    connected BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'AUTH_PENDING' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'DEGRADED', 'AUTH_PENDING', 'ERROR', 'UNAVAILABLE')),
    
    -- Capabilities
    capabilities JSONB DEFAULT '[]',
    
    -- Health Tracking
    last_check_at TIMESTAMPTZ,
    last_check_result JSONB DEFAULT '{}',
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Configuration (encrypted/sensitive data should be in secrets)
    config JSONB DEFAULT '{}',
    
    -- Metrics
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_latency_ms INTEGER,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_status ON integration_health(status);
CREATE INDEX IF NOT EXISTS idx_integration_health_category ON integration_health(category);

-- ============================================================
-- 5. TOKEN USAGE: Detailed token usage per execution
-- ============================================================

CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to execution
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Token counts
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    
    -- Cost
    cost_usd DECIMAL(12,6) DEFAULT 0,
    
    -- Model info
    model TEXT,
    provider TEXT,
    
    -- Timing
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_execution ON token_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent ON token_usage(agent_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_recorded ON token_usage(recorded_at DESC);

-- ============================================================
-- 6. Functions for cost aggregation
-- ============================================================

-- Function to calculate daily costs from executions
CREATE OR REPLACE FUNCTION calculate_daily_costs(target_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_costs (date, agent_id, execution_count, total_tokens, total_cost_usd)
    SELECT 
        DATE(e.created_at) as date,
        e.agent_id,
        COUNT(*) as execution_count,
        COALESCE(SUM(e.tokens_used), 0) as total_tokens,
        COALESCE(SUM(e.actual_cost_usd), 0) as total_cost_usd
    FROM executions e
    WHERE DATE(e.created_at) = target_date
      AND e.tokens_used IS NOT NULL
    GROUP BY DATE(e.created_at), e.agent_id
    ON CONFLICT (date, agent_id) 
    DO UPDATE SET
        execution_count = EXCLUDED.execution_count,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly costs
CREATE OR REPLACE FUNCTION calculate_monthly_costs(target_year INTEGER, target_month INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO monthly_costs (year, month, agent_id, execution_count, total_tokens, total_cost_usd)
    SELECT 
        EXTRACT(YEAR FROM dc.date)::INTEGER as year,
        EXTRACT(MONTH FROM dc.date)::INTEGER as month,
        dc.agent_id,
        SUM(dc.execution_count) as execution_count,
        SUM(dc.total_tokens) as total_tokens,
        SUM(dc.total_cost_usd) as total_cost_usd
    FROM daily_costs dc
    WHERE EXTRACT(YEAR FROM dc.date) = target_year
      AND EXTRACT(MONTH FROM dc.date) = target_month
    GROUP BY EXTRACT(YEAR FROM dc.date), EXTRACT(MONTH FROM dc.date), dc.agent_id
    ON CONFLICT (year, month, agent_id) 
    DO UPDATE SET
        execution_count = EXCLUDED.execution_count,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Triggers for auto-updating timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_health_updated_at
    BEFORE UPDATE ON integration_health
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
