-- ATLAS-PHASE5-CP1251-CLOSEOUT-1255
-- Operator Recommendations Schema
-- Durable persistence for adaptive retry recommendations

-- ============================================
-- 1. OPERATOR_RECOMMENDATIONS TABLE
-- Stores generated recommendations for review/apply
-- ============================================
CREATE TABLE IF NOT EXISTS operator_recommendations (
    id TEXT PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('retry_policy', 'circuit_breaker', 'resource_scaling', 'manual_review')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Pattern metadata
    pattern_signature TEXT NOT NULL,
    pattern_occurrences INTEGER NOT NULL DEFAULT 0,
    pattern_timeframe VARCHAR(20) NOT NULL DEFAULT '24h',
    pattern_affected_tasks JSONB DEFAULT '[]'::jsonb,
    
    -- Current vs proposed policy
    current_policy JSONB NOT NULL,
    proposed_policy JSONB NOT NULL,
    
    -- Expected impact
    expected_impact JSONB NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' 
        CHECK (status IN ('pending_review', 'approved', 'applied', 'rejected', 'superseded')),
    
    -- Review/apply tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by TEXT,
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'execution_pattern_learning',
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_operator_recommendations_status 
    ON operator_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_operator_recommendations_priority 
    ON operator_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_operator_recommendations_type 
    ON operator_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_operator_recommendations_created_at 
    ON operator_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_recommendations_pattern_signature 
    ON operator_recommendations(pattern_signature);

-- Active recommendations view (non-deleted, pending or approved)
CREATE OR REPLACE VIEW active_operator_recommendations AS
SELECT * FROM operator_recommendations
WHERE deleted_at IS NULL
  AND status IN ('pending_review', 'approved')
ORDER BY 
    CASE priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    created_at DESC;

-- ============================================
-- 2. RETRY_POLICIES TABLE
-- Stores active and historical retry policies
-- ============================================
CREATE TABLE IF NOT EXISTS retry_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pattern_signature TEXT,
    
    -- Policy configuration
    max_attempts INTEGER NOT NULL DEFAULT 3,
    backoff_strategy VARCHAR(20) NOT NULL DEFAULT 'exponential' 
        CHECK (backoff_strategy IN ('exponential', 'linear', 'fixed')),
    base_delay_ms INTEGER NOT NULL DEFAULT 1000,
    max_delay_ms INTEGER DEFAULT 30000,
    jitter BOOLEAN DEFAULT true,
    
    -- Matching criteria
    applies_to_failure_classes TEXT[],
    applies_to_task_types TEXT[],
    applies_to_agents TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual',
    recommendation_id TEXT REFERENCES operator_recommendations(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retry_policies_active 
    ON retry_policies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_retry_policies_signature 
    ON retry_policies(pattern_signature);
CREATE INDEX IF NOT EXISTS idx_retry_policies_recommendation 
    ON retry_policies(recommendation_id);

-- ============================================
-- 3. RECOMMENDATION_AUDIT_LOG TABLE
-- Audit trail for all recommendation actions
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id TEXT NOT NULL REFERENCES operator_recommendations(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'viewed', 'approved', 'applied', 'rejected', 'superseded', 'deleted')),
    
    -- Actor
    performed_by TEXT NOT NULL,
    performed_by_type VARCHAR(20) DEFAULT 'user' CHECK (performed_by_type IN ('user', 'system', 'api')),
    
    -- Change details
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    change_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- IP/UA tracking for security
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_audit_log_recommendation 
    ON recommendation_audit_log(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_audit_log_action 
    ON recommendation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_recommendation_audit_log_created_at 
    ON recommendation_audit_log(created_at DESC);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Auto-update updated_at on retry_policies
CREATE OR REPLACE FUNCTION update_retry_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_retry_policies_updated_at ON retry_policies;
CREATE TRIGGER trigger_retry_policies_updated_at
    BEFORE UPDATE ON retry_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_retry_policy_updated_at();

-- Auto-log recommendation status changes
CREATE OR REPLACE FUNCTION log_recommendation_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO recommendation_audit_log (
            recommendation_id,
            action,
            performed_by,
            performed_by_type,
            previous_status,
            new_status,
            metadata
        ) VALUES (
            NEW.id,
            CASE NEW.status
                WHEN 'applied' THEN 'applied'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'approved' THEN 'approved'
                ELSE 'viewed'
            END,
            COALESCE(NEW.applied_by, NEW.reviewed_by, 'system'),
            CASE WHEN NEW.applied_by IS NOT NULL OR NEW.reviewed_by IS NOT NULL 
                THEN 'user' ELSE 'system' END,
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'reviewed_at', NEW.reviewed_at,
                'applied_at', NEW.applied_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recommendation_audit ON operator_recommendations;
CREATE TRIGGER trigger_recommendation_audit
    AFTER UPDATE ON operator_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION log_recommendation_change();

-- ============================================
-- 5. DEFAULT POLICY SEED
-- ============================================
INSERT INTO retry_policies (name, is_default, max_attempts, backoff_strategy, base_delay_ms, jitter, source)
VALUES ('Default Retry Policy', true, 3, 'exponential', 1000, true, 'system')
ON CONFLICT DO NOTHING;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
