-- ATLAS-G5B-M2 Retry Engine Schema Migration
-- Adds retry scheduling columns and retry_policies table

-- Add retry scheduling columns to executions table
ALTER TABLE executions 
  ADD COLUMN IF NOT EXISTS retry_policy_name VARCHAR(100) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Index for retry scheduler queries
CREATE INDEX IF NOT EXISTS idx_executions_retry_at 
  ON executions(retry_at) 
  WHERE status = 'pending' AND retry_at IS NOT NULL;

-- Index for retry policy lookups
CREATE INDEX IF NOT EXISTS idx_executions_retry_policy 
  ON executions(retry_policy_name);

-- Retry policies table
CREATE TABLE IF NOT EXISTS retry_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  base_delay_ms INTEGER NOT NULL DEFAULT 5000,
  max_delay_ms INTEGER NOT NULL DEFAULT 60000,
  backoff_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  jitter_factor NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  retryable_classes TEXT[] DEFAULT ARRAY['transient', 'timeout'],
  non_retryable_classes TEXT[] DEFAULT ARRAY['permanent', 'crash'],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default policies if not exist
INSERT INTO retry_policies (name, max_attempts, base_delay_ms, max_delay_ms, backoff_multiplier, jitter_factor, retryable_classes, non_retryable_classes, is_default)
VALUES 
  ('default', 5, 5000, 60000, 2.0, 0.10, ARRAY['transient', 'timeout'], ARRAY['permanent', 'crash'], true)
ON CONFLICT (name) DO UPDATE SET
  max_attempts = EXCLUDED.max_attempts,
  base_delay_ms = EXCLUDED.base_delay_ms,
  max_delay_ms = EXCLUDED.max_delay_ms,
  backoff_multiplier = EXCLUDED.backoff_multiplier,
  jitter_factor = EXCLUDED.jitter_factor,
  retryable_classes = EXCLUDED.retryable_classes,
  non_retryable_classes = EXCLUDED.non_retryable_classes,
  updated_at = NOW();

INSERT INTO retry_policies (name, max_attempts, base_delay_ms, max_delay_ms, backoff_multiplier, jitter_factor, retryable_classes, non_retryable_classes)
VALUES 
  ('aggressive', 5, 1000, 30000, 1.5, 0.20, ARRAY['transient', 'timeout', 'crash'], ARRAY['permanent'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO retry_policies (name, max_attempts, base_delay_ms, max_delay_ms, backoff_multiplier, jitter_factor, retryable_classes, non_retryable_classes)
VALUES 
  ('conservative', 2, 10000, 120000, 2.5, 0.05, ARRAY['transient'], ARRAY['permanent', 'timeout', 'crash'])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE retry_policies ENABLE ROW LEVEL SECURITY;

-- Service role policy
CREATE POLICY IF NOT EXISTS retry_policies_service_all ON retry_policies FOR ALL USING (true);
