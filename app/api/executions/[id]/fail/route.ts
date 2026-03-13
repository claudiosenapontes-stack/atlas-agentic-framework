import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Valid failure classifications
type FailureClass = "transient" | "permanent" | "timeout" | "crash";
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

    // Step 3: Get retry policy
    const { data: retryPolicy } = await supabaseAdmin
      .from("retry_policies")
      .select("*")
      .eq("name", "default")
      .single();

    const retryPolicyData = retryPolicy as { max_attempts?: number } | null;
    const maxAttempts = retryPolicyData?.max_attempts ?? 3;
    const currentAttempt = exec.attempt_number || 1;
    const shouldRetry = failure_class !== "permanent" && currentAttempt < maxAttempts;

    // Step 4: Create execution attempt record
    const { data: attempt } = await supabaseAdmin
      .from("execution_attempts")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        attempt_number: currentAttempt,
        status: "failed",
        completed_at: now.toISOString(),
        output_snapshot: output_snapshot || null,
        error_message: error_message || null,
        failure_class: failure_class,
        agent_id: agent_id || exec.agent_id,
      })
      .select()
      .single();

    // Step 5: Record failure event
    await supabaseAdmin
      .from("execution_events")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        event_type: "execution_failed",
        event_data: {
          failure_class,
          error_message,
          error_details,
          attempt_number: currentAttempt,
          should_retry: shouldRetry,
          max_attempts: maxAttempts,
          agent_id: agent_id || exec.agent_id,
        },
        created_at: now.toISOString(),
      });

    // Step 6: Update execution status
    const executionUpdates: any = {
      status: shouldRetry ? "pending" : "failed", // Return to pending if retryable
      failure_class: failure_class,
      error_message: error_message || null,
      output_snapshot: output_snapshot || null,
      completed_at: shouldRetry ? null : now.toISOString(),
      attempt_number: currentAttempt + 1,
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
        max_attempts: maxAttempts,
      },
      attempt,
      retry: shouldRetry ? {
        eligible: true,
        next_attempt: currentAttempt + 1,
        delay_ms: failure_class === "timeout" ? 10000 : failure_class === "crash" ? 30000 : 5000,
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
