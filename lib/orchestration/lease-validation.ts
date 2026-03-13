/**
 * Lease Validation Helpers
 * ATLAS-GATE5A-DURABLE-EXECUTION-903
 * 
 * Utilities for validating and managing execution leases
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface LeaseValidationResult {
  valid: boolean;
  expired: boolean;
  heldByAgent: boolean;
  canClaim: boolean;
  leaseExpiresAt: Date | null;
  error?: string;
}

/**
 * Validate if an agent holds a valid lease on an execution
 */
export async function validateLease(
  executionId: string,
  agentId: string
): Promise<LeaseValidationResult> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: execution, error } = await supabaseAdmin
    .from("executions")
    .select("agent_id, lease_expires_at, status")
    .eq("id", executionId)
    .single();

  if (error || !execution) {
    return {
      valid: false,
      expired: true,
      heldByAgent: false,
      canClaim: false,
      leaseExpiresAt: null,
      error: "Execution not found",
    };
  }

  // Type assertion for execution
  const exec = execution as { agent_id?: string; lease_expires_at?: string; status: string };

  // Check if execution is in a claimable state
  if (exec.status !== "pending" && exec.status !== "in_progress") {
    return {
      valid: false,
      expired: true,
      heldByAgent: false,
      canClaim: false,
      leaseExpiresAt: null,
      error: `Execution status ${exec.status} does not allow lease claims`,
    };
  }

  const now = new Date();
  const leaseExpiresAt = exec.lease_expires_at
    ? new Date(exec.lease_expires_at)
    : null;
  const expired = !leaseExpiresAt || leaseExpiresAt < now;
  const heldByAgent = exec.agent_id === agentId;
  const canClaim = expired || heldByAgent;

  return {
    valid: heldByAgent && !expired,
    expired,
    heldByAgent,
    canClaim,
    leaseExpiresAt,
  };
}

/**
 * Claim a lease on an execution
 */
export async function claimLease(
  executionId: string,
  agentId: string,
  leaseDurationSeconds: number = 60
): Promise<{ success: boolean; error?: string; leaseExpiresAt?: Date }> {
  const supabaseAdmin = getSupabaseAdmin();

  // Validate current lease state
  const validation = await validateLease(executionId, agentId);

  if (!validation.canClaim) {
    return {
      success: false,
      error: validation.error || "Lease cannot be claimed",
    };
  }

  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationSeconds * 1000);

  // Get current agent for event logging
  const { data: currentExec } = await supabaseAdmin
    .from("executions")
    .select("agent_id")
    .eq("id", executionId)
    .single();
  const previousAgent = currentExec ? (currentExec as { agent_id?: string }).agent_id : null;

  const { error } = await supabaseAdmin
    .from("executions")
    // @ts-ignore
    .update({
      agent_id: agentId,
      lease_expires_at: leaseExpiresAt.toISOString(),
      status: "in_progress",
      updated_at: now.toISOString(),
    })
    .eq("id", executionId);

  if (error) {
    return {
      success: false,
      error: `Failed to claim lease: ${error.message}`,
    };
  }

  // Record lease claim event
  await supabaseAdmin
    .from("execution_events")
    // @ts-ignore
    .insert({
      execution_id: executionId,
      event_type: "lease_claimed",
      event_data: {
        agent_id: agentId,
        lease_duration_seconds: leaseDurationSeconds,
        lease_expires_at: leaseExpiresAt.toISOString(),
        previous_agent: validation.heldByAgent ? null : previousAgent,
      },
      created_at: now.toISOString(),
    });

  return {
    success: true,
    leaseExpiresAt,
  };
}

/**
 * Release a lease on an execution
 */
export async function releaseLease(
  executionId: string,
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: execution } = await supabaseAdmin
    .from("executions")
    .select("agent_id")
    .eq("id", executionId)
    .single();

  if (!execution) {
    return { success: false, error: "Execution not found" };
  }

  const execRelease = execution as { agent_id?: string };
  if (execRelease.agent_id !== agentId) {
    return { success: false, error: "Lease held by another agent" };
  }

  const now = new Date();

  const { error } = await supabaseAdmin
    .from("executions")
    // @ts-ignore
    .update({
      lease_expires_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", executionId);

  if (error) {
    return { success: false, error: `Failed to release lease: ${error.message}` };
  }

  // Record lease release event
  await supabaseAdmin
    .from("execution_events")
    // @ts-ignore
    .insert({
      execution_id: executionId,
      event_type: "lease_released",
      event_data: { agent_id: agentId },
      created_at: now.toISOString(),
    });

  return { success: true };
}

/**
 * Check if an execution is eligible for retry
 */
export function classifyRetryEligibility(
  failureClass: string,
  attemptCount: number,
  maxAttempts: number = 3
): {
  eligible: boolean;
  classification: "transient" | "permanent" | "timeout" | "crash" | "max_attempts";
  retryDelayMs: number;
  reason?: string;
} {
  if (attemptCount >= maxAttempts) {
    return {
      eligible: false,
      classification: "max_attempts",
      retryDelayMs: 0,
      reason: `Max attempts (${maxAttempts}) reached`,
    };
  }

  switch (failureClass) {
    case "transient":
      return {
        eligible: true,
        classification: "transient",
        retryDelayMs: 5000,
      };
    case "timeout":
      return {
        eligible: true,
        classification: "timeout",
        retryDelayMs: 10000,
      };
    case "crash":
      return {
        eligible: true,
        classification: "crash",
        retryDelayMs: 30000,
      };
    case "permanent":
      return {
        eligible: false,
        classification: "permanent",
        retryDelayMs: 0,
        reason: "Permanent failure - no retry",
      };
    default:
      return {
        eligible: false,
        classification: failureClass as any,
        retryDelayMs: 0,
        reason: `Unknown failure class: ${failureClass}`,
      };
  }
}

/**
 * Get retry policy for execution
 */
export async function getRetryPolicy(policyName: string = "default"): Promise<{
  maxAttempts: number;
  transientDelayMs: number;
  timeoutDelayMs: number;
  crashDelayMs: number;
} | null> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: policy } = await supabaseAdmin
    .from("retry_policies")
    .select("*")
    .eq("name", policyName)
    .single();

  if (!policy) return null;

  const p = policy as { max_attempts?: number; transient_retry_delay_ms?: number; timeout_retry_delay_ms?: number; crash_retry_delay_ms?: number };

  return {
    maxAttempts: p.max_attempts ?? 3,
    transientDelayMs: p.transient_retry_delay_ms ?? 5000,
    timeoutDelayMs: p.timeout_retry_delay_ms ?? 10000,
    crashDelayMs: p.crash_retry_delay_ms ?? 30000,
  };
}
