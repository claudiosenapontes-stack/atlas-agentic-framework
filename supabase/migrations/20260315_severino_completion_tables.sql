-- ATLAS-SEVERINO-REALM-COMPLETION-GO-1289
-- Missing tables for full closeout: worker_heartbeats, token_usage, integration_configs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: worker_heartbeats
-- Purpose: Track worker/agent heartbeat signals
-- =====================================================

CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Worker Identification
    worker_id TEXT NOT NULL,
    worker_type TEXT NOT NULL DEFAULT 'agent', -- agent, service, cron
    
    -- Heartbeat Data
    status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN (
        'healthy',
        'degraded',
        'unhealthy',
        'offline'
    )),
    
    -- Metrics
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    uptime_seconds INTEGER,
    
    -- Task Context
    current_task_id UUID,
    current_execution_id UUID,
    current_workflow_id UUID,
    
    -- Session Info
    session_id TEXT,
    workspace_path TEXT,
    
    -- Timestamp
    heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_worker_id ON worker_heartbeats(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status ON worker_heartbeats(status);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_heartbeat_at ON worker_heartbeats(heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_task_id ON worker_heartbeats(current_task_id);

-- =====================================================
-- TABLE: token_usage
-- Purpose: Track AI model token usage and costs
-- =====================================================

CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Provider and Model
    provider TEXT NOT NULL, -- openrouter, openai, anthropic, google
    model TEXT NOT NULL,
    
    -- Token Counts
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Cost (USD)
    estimated_cost_usd DECIMAL(12,8),
    exact_cost_usd DECIMAL(12,8),
    
    -- Attribution
    agent_id TEXT,
    task_id UUID,
    execution_id UUID,
    session_id TEXT,
    
    -- Request Context
    request_type TEXT, -- completion, chat, embedding
    prompt_hash TEXT, -- hash of prompt for deduplication
    
    -- Timestamp
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_task_id ON token_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_execution_id ON token_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_used_at ON token_usage(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider_model ON token_usage(provider, model);
CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(DATE(used_at));

-- =====================================================
-- TABLE: integration_configs
-- Purpose: Store integration configurations and status
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Integration Identity
    integration_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- core, messaging, ai, storage, calendar
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT, -- encrypted API keys
    
    -- Status
    status TEXT NOT NULL DEFAULT 'AUTH_PENDING' CHECK (status IN (
        'CONNECTED',
        'DISCONNECTED',
        'DEGRADED',
        'AUTH_PENDING',
        'ERROR',
        'UNAVAILABLE'
    )),
    
    -- Health Check
    last_check_at TIMESTAMPTZ,
    last_check_result JSONB,
    last_error TEXT,
    
    -- Capabilities
    capabilities TEXT[] DEFAULT '{}',
    
    -- Timestamps
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON integration_configs(status);
CREATE INDEX IF NOT EXISTS idx_integration_configs_category ON integration_configs(category);
CREATE INDEX IF NOT EXISTS idx_integration_configs_last_check ON integration_configs(last_check_at DESC);

-- =====================================================
-- VIEW: token_usage_daily_summary
-- Purpose: Daily aggregated token usage and costs
-- =====================================================

CREATE OR REPLACE VIEW token_usage_daily_summary AS
SELECT 
    DATE(used_at) as date,
    provider,
    model,
    COUNT(*) as request_count,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(COALESCE(estimated_cost_usd, 0)) as total_estimated_cost,
    SUM(COALESCE(exact_cost_usd, 0)) as total_exact_cost
FROM token_usage
GROUP BY DATE(used_at), provider, model;

-- =====================================================
-- VIEW: token_usage_agent_summary
-- Purpose: Per-agent token usage and costs
-- =====================================================

CREATE OR REPLACE VIEW token_usage_agent_summary AS
SELECT 
    agent_id,
    DATE(used_at) as date,
    provider,
    model,
    COUNT(*) as request_count,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(COALESCE(estimated_cost_usd, 0)) as total_estimated_cost
FROM token_usage
WHERE agent_id IS NOT NULL
GROUP BY agent_id, DATE(used_at), provider, model;

-- =====================================================
-- FUNCTION: calculate_token_cost
-- Purpose: Calculate estimated cost based on provider/model
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_token_cost(
    p_provider TEXT,
    p_model TEXT,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER
) RETURNS DECIMAL(12,8) AS $$
DECLARE
    v_prompt_price DECIMAL(12,8);
    v_completion_price DECIMAL(12,8);
    v_total DECIMAL(12,8);
BEGIN
    -- Default pricing (per 1K tokens in USD)
    -- These should be updated with actual pricing
    CASE 
        -- OpenRouter models
        WHEN p_provider = 'openrouter' AND p_model LIKE '%claude%' THEN
            v_prompt_price := 0.003;
            v_completion_price := 0.015;
        WHEN p_provider = 'openrouter' AND p_model LIKE '%gpt-4%' THEN
            v_prompt_price := 0.03;
            v_completion_price := 0.06;
        WHEN p_provider = 'openrouter' AND p_model LIKE '%gpt-3.5%' THEN
            v_prompt_price := 0.0005;
            v_completion_price := 0.0015;
        -- OpenAI models
        WHEN p_provider = 'openai' AND p_model LIKE '%gpt-4%' THEN
            v_prompt_price := 0.03;
            v_completion_price := 0.06;
        WHEN p_provider = 'openai' AND p_model LIKE '%gpt-3.5%' THEN
            v_prompt_price := 0.0005;
            v_completion_price := 0.0015;
        -- Anthropic models
        WHEN p_provider = 'anthropic' AND p_model LIKE '%claude-3-opus%' THEN
            v_prompt_price := 0.015;
            v_completion_price := 0.075;
        WHEN p_provider = 'anthropic' AND p_model LIKE '%claude-3-sonnet%' THEN
            v_prompt_price := 0.003;
            v_completion_price := 0.015;
        WHEN p_provider = 'anthropic' AND p_model LIKE '%claude-3-haiku%' THEN
            v_prompt_price := 0.00025;
            v_completion_price := 0.00125;
        -- Default fallback
        ELSE
            v_prompt_price := 0.001;
            v_completion_price := 0.002;
    END CASE;
    
    v_total := (p_prompt_tokens * v_prompt_price / 1000) + 
               (p_completion_tokens * v_completion_price / 1000);
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update updated_at on integration_configs
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON integration_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES (Enable after testing)
-- =====================================================

-- ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE worker_heartbeats IS 'Worker/agent heartbeat tracking for health monitoring';
COMMENT ON TABLE token_usage IS 'AI model token usage and cost tracking';
COMMENT ON TABLE integration_configs IS 'Integration configuration and status tracking';
