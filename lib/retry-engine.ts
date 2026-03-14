/**
 * ATLAS-GATE5B Retry Engine
 * Exponential backoff with jitter, max attempts, and failure classification
 */

export type FailureClass = "transient" | "permanent" | "timeout" | "crash";

export interface RetryPolicy {
  name: string;
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
  jitter_factor: number; // 0-1, e.g., 0.1 = 10% jitter
  retryable_classes: FailureClass[];
  non_retryable_classes: FailureClass[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  name: "default",
  max_attempts: 3,
  base_delay_ms: 5000,
  max_delay_ms: 60000,
  backoff_multiplier: 2.0,
  jitter_factor: 0.1,
  retryable_classes: ["transient", "timeout"],
  non_retryable_classes: ["permanent", "crash"],
};

export const AGGRESSIVE_RETRY_POLICY: RetryPolicy = {
  name: "aggressive",
  max_attempts: 5,
  base_delay_ms: 1000,
  max_delay_ms: 30000,
  backoff_multiplier: 1.5,
  jitter_factor: 0.2,
  retryable_classes: ["transient", "timeout", "crash"],
  non_retryable_classes: ["permanent"],
};

export const CONSERVATIVE_RETRY_POLICY: RetryPolicy = {
  name: "conservative",
  max_attempts: 2,
  base_delay_ms: 10000,
  max_delay_ms: 120000,
  backoff_multiplier: 2.5,
  jitter_factor: 0.05,
  retryable_classes: ["transient"],
  non_retryable_classes: ["permanent", "timeout", "crash"],
};

/**
 * Calculate delay with exponential backoff and full jitter
 * 
 * Formula: delay = min(base * multiplier^(attempt-1), max_delay)
 * Then apply jitter: delay ± (delay * jitter_factor * random)
 */
export function calculateRetryDelay(
  attemptNumber: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  // Exponential backoff
  const exponentialDelay = policy.base_delay_ms * Math.pow(
    policy.backoff_multiplier,
    attemptNumber - 1
  );
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, policy.max_delay_ms);
  
  // Apply jitter: random value between (1 - jitter) and (1 + jitter)
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * policy.jitter_factor;
  const jitteredDelay = Math.floor(cappedDelay * jitterMultiplier);
  
  return Math.max(0, jitteredDelay);
}

/**
 * Determine if a failure should be retried based on its classification
 */
export function isRetryable(
  failureClass: FailureClass,
  attemptNumber: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): { retryable: boolean; reason?: string } {
  // Check if failure class is retryable
  if (policy.non_retryable_classes.includes(failureClass)) {
    return { 
      retryable: false, 
      reason: `Failure class '${failureClass}' is not retryable` 
    };
  }
  
  if (!policy.retryable_classes.includes(failureClass)) {
    return { 
      retryable: false, 
      reason: `Unknown failure class '${failureClass}'` 
    };
  }
  
  // Check max attempts
  if (attemptNumber >= policy.max_attempts) {
    return { 
      retryable: false, 
      reason: `Max attempts (${policy.max_attempts}) reached` 
    };
  }
  
  return { retryable: true };
}

/**
 * Classify an error into a failure class
 */
export function classifyError(error: Error | unknown): FailureClass {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "Unknown";
  
  // Permanent failures - these will never succeed on retry
  const permanentPatterns = [
    /validation/i,
    /invalid.*input/i,
    /schema.*error/i,
    /unauthorized/i,
    /forbidden/i,
    /not.*found/i,
    /already.*exists/i,
    /duplicate/i,
  ];
  
  if (permanentPatterns.some(p => p.test(errorMessage))) {
    return "permanent";
  }
  
  // Timeout patterns
  const timeoutPatterns = [
    /timeout/i,
    /timed out/i,
    /deadline.*exceeded/i,
    /execution.*time/i,
  ];
  
  if (timeoutPatterns.some(p => p.test(errorMessage))) {
    return "timeout";
  }
  
  // Crash patterns - process-level failures
  const crashPatterns = [
    /out of memory/i,
    /memory.*exceeded/i,
    /stack overflow/i,
    /segmentation fault/i,
    /sigkill/i,
    /sigterm/i,
    /process.*exited/i,
    /oom/i,
  ];
  
  if (crashPatterns.some(p => p.test(errorMessage))) {
    return "crash";
  }
  
  // Transient patterns - likely to succeed on retry
  const transientPatterns = [
    /network/i,
    /connection/i,
    /econnrefused/i,
    /econnreset/i,
    /etimedout/i,
    /socket/i,
    /dns/i,
    /temporarily/i,
    /rate.*limit/i,
    /too.*many.*requests/i,
    /service.*unavailable/i,
    /bad gateway/i,
    /gateway.*timeout/i,
  ];
  
  if (transientPatterns.some(p => p.test(errorMessage))) {
    return "transient";
  }
  
  // Default to transient for unknown errors (safer to retry)
  return "transient";
}

/**
 * Build retry context for an execution
 */
export interface RetryContext {
  attempt_number: number;
  max_attempts: number;
  retryable: boolean;
  delay_ms: number;
  next_attempt_at: string; // ISO timestamp
  failure_class?: FailureClass;
  reason?: string;
}

export function buildRetryContext(
  attemptNumber: number,
  failureClass: FailureClass,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  baseTime: Date = new Date()
): RetryContext {
  const { retryable, reason } = isRetryable(failureClass, attemptNumber, policy);
  const delayMs = retryable 
    ? calculateRetryDelay(attemptNumber, policy)
    : 0;
  
  const nextAttemptAt = new Date(baseTime.getTime() + delayMs);
  
  return {
    attempt_number: attemptNumber,
    max_attempts: policy.max_attempts,
    retryable,
    delay_ms: delayMs,
    next_attempt_at: nextAttemptAt.toISOString(),
    failure_class: failureClass,
    reason: retryable ? undefined : reason,
  };
}

/**
 * SQL for creating/updating retry_policies table
 */
export const RETRY_POLICIES_TABLE_SQL = `
-- Retry policies table
CREATE TABLE IF NOT EXISTS retry_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 3,
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
  ('default', 3, 5000, 60000, 2.0, 0.10, ARRAY['transient', 'timeout'], ARRAY['permanent', 'crash'], true)
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
CREATE POLICY retry_policies_service_all ON retry_policies FOR ALL USING (true);
`;

/**
 * SQL for adding retry scheduling columns to executions table
 */
export const EXECUTIONS_RETRY_COLUMNS_SQL = `
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
`;
