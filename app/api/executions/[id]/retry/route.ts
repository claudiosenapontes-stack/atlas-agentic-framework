import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { calculateRetryDelay, isRetryable, RetryPolicy, DEFAULT_RETRY_POLICY } from "@/lib/retry-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExecutionRecord {
  id: string;
  status: string;
  retry_count: number | null;
  max_attempts: number | null;
  retry_at: string | null;
  retry_policy_name: string | null;
  failure_class: string | null;
  error_message: string | null;
  agent_id: string | null;
  lease_expires_at: string | null;
}

/**
 * POST /api/executions/[id]/retry
 * 
 * Retry a failed execution with:
 * - Retry classification
 * - Exponential backoff + jitter
 * - max_attempts enforcement
 * - Dead-letter transition after max attempts
 * - Retry events logged
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const executionId = params.id;
  const supabase = getSupabaseAdmin();
  const now = new Date();

  try {
    // 1. Fetch execution
    const { data, error: fetchError } = await supabase
      .from("executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (fetchError || !data) {
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // Cast to our interface
    const execution = data as ExecutionRecord;

    // 2. Check if retryable status
    const execStatus: string = execution.status || "";
    const retryableStatuses = ["failed", "timeout", "crashed"];
    
    if (!retryableStatuses.includes(execStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Execution status '${execStatus}' is not retryable`,
          execution_id: executionId,
          current_status: execStatus
        },
        { status: 400 }
      );
    }

    // 3. Check max_attempts
    const currentAttempt = Number(execution.retry_count || 0);
    const maxAttempts = Number(execution.max_attempts || 3);
    
    if (currentAttempt >= maxAttempts) {
      // Transition to dead-letter
      await (supabase as any)
        .from("executions")
        .update({
          status: "dead_letter",
          error_message: `Max retry attempts (${maxAttempts}) exceeded`,
          updated_at: now.toISOString()
        })
        .eq("id", executionId);

      // Log dead-letter event
      await (supabase as any).from("execution_events").insert({
        execution_id: executionId,
        event_type: "execution_dead_lettered",
        payload: {
          reason: "max_attempts_exceeded",
          attempts: currentAttempt,
          max_attempts: maxAttempts
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: "Max retry attempts exceeded",
          execution_id: executionId,
          status: "dead_letter",
          attempts: currentAttempt,
          max_attempts: maxAttempts
        },
        { status: 400 }
      );
    }

    // 4. Get retry policy
    const policyResult = await supabase
      .from("retry_policies")
      .select("*")
      .eq("name", execution.retry_policy_name || "default")
      .single();

    const policy: RetryPolicy = (policyResult.data as RetryPolicy) || DEFAULT_RETRY_POLICY;

    // 5. Check if failure is retryable
    const failureClass: string = execution.failure_class || "unknown";
    const retryCheck = isRetryable(failureClass, currentAttempt, policy);

    if (!retryCheck.retryable) {
      // Non-retryable failure - dead letter immediately
      await (supabase as any)
        .from("executions")
        .update({
          status: "dead_letter",
          error_message: `Non-retryable failure: ${retryCheck.reason}`,
          updated_at: now.toISOString()
        })
        .eq("id", executionId);

      return NextResponse.json(
        {
          success: false,
          error: "Non-retryable failure",
          reason: retryCheck.reason,
          execution_id: executionId,
          status: "dead_letter"
        },
        { status: 400 }
      );
    }

    // 6. Calculate retry timing
    const nextAttempt = currentAttempt + 1;
    const delayMs = calculateRetryDelay(nextAttempt, policy);
    const retryAt = new Date(now.getTime() + delayMs);

    // 7. Update execution for retry
    const { error: updateError } = await (supabase as any)
      .from("executions")
      .update({
        status: "pending",
        retry_count: nextAttempt,
        retry_at: retryAt.toISOString(),
        agent_id: null,
        lease_expires_at: null,
        updated_at: now.toISOString()
      })
      .eq("id", executionId);

    if (updateError) {
      throw updateError;
    }

    // 8. Log retry event
    await (supabase as any).from("execution_events").insert({
      execution_id: executionId,
      event_type: "execution_retry_scheduled",
      payload: {
        attempt_number: nextAttempt,
        max_attempts: maxAttempts,
        retry_at: retryAt.toISOString(),
        delay_ms: delayMs,
        failure_class: failureClass,
        backoff_strategy: "exponential_with_jitter"
      }
    });

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      status: "pending",
      retry: {
        attempt_number: nextAttempt,
        max_attempts: maxAttempts,
        retry_at: retryAt.toISOString(),
        delay_ms: delayMs,
        failure_class: failureClass
      }
    });

  } catch (error) {
    console.error("[Retry] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Retry failed",
        execution_id: executionId
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/executions/[id]/retry
 * 
 * Get retry status for an execution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const executionId = params.id;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("executions")
    .select("id, status, retry_count, max_attempts, retry_at, failure_class, error_message")
    .eq("id", executionId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Execution not found" },
      { status: 404 }
    );
  }

  const execution = data as ExecutionRecord;
  const execStatus: string = execution.status || "";
  const canRetry = ["failed", "timeout", "crashed"].includes(execStatus);
  const attemptsRemaining = (Number(execution.max_attempts) || 3) - (Number(execution.retry_count) || 0);

  return NextResponse.json({
    success: true,
    execution_id: executionId,
    status: execStatus,
    retry: {
      current_count: Number(execution.retry_count) || 0,
      max_attempts: Number(execution.max_attempts) || 3,
      attempts_remaining: Math.max(0, attemptsRemaining),
      can_retry: canRetry && attemptsRemaining > 0,
      next_retry_at: execution.retry_at,
      failure_class: execution.failure_class
    }
  });
}
