import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { 
  calculateRetryDelay, 
  isRetryable, 
  type FailureClass,
  DEFAULT_RETRY_POLICY 
} from "@/lib/retry-engine";

const VALID_FAILURE_CLASSES: FailureClass[] = ["transient", "permanent", "timeout", "crash"];

/**
 * POST /api/executions/:id/fail
 * Mark execution as failed with classification for retry decisions
 * 
 * Body: {
 *   failure_class: "transient" | "permanent" | "timeout" | "crash",
 *   error_message?: string,
 *   error_details?: object,
 *   output_snapshot?: object,
 *   agent_id?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json();
    const { 
      failure_class, 
      error_message, 
      error_details, 
      output_snapshot,
      agent_id 
    } = body;

    // Validation
    if (!executionId) {
      return NextResponse.json(
        { success: false, error: "Execution ID is required" },
        { status: 400 }
      );
    }

    if (!failure_class || !VALID_FAILURE_CLASSES.includes(failure_class as FailureClass)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid failure_class. Must be one of: ${VALID_FAILURE_CLASSES.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();

    // Step 1: Fetch execution
    const { data: execution, error: fetchError } = await supabaseAdmin
      .from("executions")
      .select("id, status, task_id, agent_id, attempt_number")
      .eq("id", executionId)
      .single();

    if (fetchError || !execution) {
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exec: any = execution;

    // Step 2: Validate current status allows failure
    if (exec.status === "completed" || exec.status === "failed" || exec.status === "cancelled") {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot fail execution with status: ${exec.status}`,
          current_status: exec.status
        },
        { status: 409 }
      );
    }

    // Step 3: Get retry policy and calculate retry
    const { data: retryPolicy } = await supabaseAdmin
      .from("retry_policies")
      .select("*")
      .eq("name", exec.retry_policy_name || "default")
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp: any = retryPolicy;
    const policy = rp ? {
      name: rp.name,
      max_attempts: rp.max_attempts,
      base_delay_ms: rp.base_delay_ms,
      max_delay_ms: rp.max_delay_ms,
      backoff_multiplier: rp.backoff_multiplier,
      jitter_factor: rp.jitter_factor,
      retryable_classes: rp.retryable_classes,
      non_retryable_classes: rp.non_retryable_classes,
    } : DEFAULT_RETRY_POLICY;

    const currentAttempt = exec.attempt_number || 1;
    const { retryable: shouldRetry, reason: retryReason } = isRetryable(
      failure_class,
      currentAttempt,
      policy
    );
    
    const retryDelayMs = shouldRetry 
      ? calculateRetryDelay(currentAttempt, policy)
      : 0;
    const retryAt = shouldRetry 
      ? new Date(now.getTime() + retryDelayMs)
      : null;

    // Step 4: Create execution attempt record
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("execution_attempts")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        attempt_number: currentAttempt,
        status: "failed",
      })
      .select()
      .single();
    
    if (attemptError) {
      console.error("[Fail] execution_attempts insert error:", attemptError);
    }

    // Step 5: Record failure event
    await supabaseAdmin
      .from("execution_events")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        event_type: "execution_failed",
      });

    // Step 6: Update execution status
    const executionUpdates: any = {
      status: shouldRetry ? "pending" : "failed",
      failure_class: failure_class,
      error_message: error_message || null,
      output_snapshot: output_snapshot || null,
      completed_at: shouldRetry ? null : now.toISOString(),
      attempt_number: currentAttempt + 1,
      retry_count: (exec.retry_count || 0) + 1,
      retry_at: shouldRetry ? retryAt?.toISOString() : null,
      updated_at: now.toISOString(),
    };

    // If returning to pending for retry, clear lease
    if (shouldRetry) {
      executionUpdates.lease_expires_at = null;
      executionUpdates.agent_id = null;
    }

    const { data: updatedExecution, error: updateError } = await supabaseAdmin
      .from("executions")
      // @ts-ignore
      .update(executionUpdates)
      .eq("id", executionId)
      .select()
      .single();

    if (updateError) {
      console.error("[Fail] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update execution" },
        { status: 500 }
      );
    }

    // Step 7: Update task status
    if (exec.task_id) {
      const taskStatus = shouldRetry ? "inbox" : "failed";
      await supabaseAdmin
        .from("tasks")
        // @ts-ignore
        .update({
          status: taskStatus,
          error_message: error_message || null,
          updated_at: now.toISOString(),
        })
        .eq("id", exec.task_id);
    }

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      failure: {
        class: failure_class,
        error_message,
        attempt_number: currentAttempt,
        should_retry: shouldRetry,
        retry_delay_ms: shouldRetry ? retryDelayMs : null,
        retry_at: retryAt ? retryAt.toISOString() : null,
      },
      attempt,
      retry: shouldRetry ? {
        eligible: true,
        next_attempt: currentAttempt + 1,
        delay_ms: retryDelayMs,
        next_attempt_at: retryAt?.toISOString(),
        policy: policy.name,
        reason: "exponential_backoff_with_jitter",
      } : {
        eligible: false,
        reason: failure_class === "permanent" ? "permanent_failure" : "max_attempts_reached",
      },
    });

  } catch (error) {
    console.error("[Fail] Exception:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
