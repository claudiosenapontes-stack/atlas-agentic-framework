import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { onGate2ExecutionComplete } from "@/lib/orchestration/engine";
import { captureExecutionCost } from "@/lib/cost-tracking";

// Valid status transitions for executions
const VALID_STATUSES = ["pending", "in_progress", "completed", "failed", "cancelled"] as const;
type ExecutionStatus = (typeof VALID_STATUSES)[number];

/**
 * PATCH /api/executions/:id
 * Update execution result and sync task status
 * 
 * Gate 5A Enhancements:
 * - output_snapshot persistence
 * - execution_attempts record creation
 * - execution_events audit trail
 * - idempotency guard for completion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json();

    // Validation
    if (!executionId) {
      return NextResponse.json(
        { success: false, error: "Execution ID is required" },
        { status: 400 }
      );
    }

    const {
      status,
      completed_at,
      output_preview,
      output_snapshot,
      error_message,
      tokens_used,
      actual_cost_usd,
      idempotency_key,
      agent_id,
    } = body;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status as ExecutionStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();

    // Step 1: Fetch the execution record with all Gate 5A fields
    const { data: execution, error: fetchError } = await supabaseAdmin
      .from("executions")
      .select("id, task_id, status, agent_id, attempt_count, idempotent_completion_key")
      .eq("id", executionId)
      .single();

    if (fetchError || !execution) {
      console.error("[Executions PATCH] Fetch error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exec: any = execution;

    // Step 2: Idempotency guard for completion
    // If execution already completed with same idempotency key, return success
    if (status === "completed" && exec.status === "completed") {
      if (idempotency_key && exec.idempotent_completion_key === idempotency_key) {
        return NextResponse.json({
          success: true,
          execution: exec,
          idempotent: true,
          message: "Execution already completed with this idempotency key",
        });
      }
    }

    // Prevent updating already-completed executions without explicit override
    if (exec.status === "completed" && status !== undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Execution already completed",
          current_status: exec.status,
        },
        { status: 409 }
      );
    }

    // Step 3: Build execution update object
    const executionUpdates: any = {};

    if (status !== undefined) executionUpdates.status = status;
    if (completed_at !== undefined) executionUpdates.completed_at = completed_at;
    if (output_preview !== undefined) executionUpdates.output_preview = output_preview;
    if (output_snapshot !== undefined) executionUpdates.output_snapshot = output_snapshot;
    if (error_message !== undefined) executionUpdates.error_message = error_message;
    if (tokens_used !== undefined) executionUpdates.tokens_used = tokens_used;
    if (actual_cost_usd !== undefined) executionUpdates.actual_cost_usd = actual_cost_usd;
    if (idempotency_key !== undefined) executionUpdates.idempotent_completion_key = idempotency_key;
    if (agent_id !== undefined) executionUpdates.agent_id = agent_id;

    // Auto-set completed_at if status is completed/failed/cancelled and not provided
    if ((status === "completed" || status === "failed" || status === "cancelled") && !completed_at) {
      executionUpdates.completed_at = now.toISOString();
    }

    executionUpdates.updated_at = now.toISOString();

    // Step 4: Update execution record
    const { data: updatedExecution, error: execError } = await supabaseAdmin
      .from("executions")
      // @ts-ignore - Supabase type inference issue with dynamic updates
      .update(executionUpdates)
      .eq("id", executionId)
      .select()
      .single();

    if (execError) {
      console.error("[Executions PATCH] Update error:", execError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to update execution",
          details: execError.message 
        },
        { status: 500 }
      );
    }

    // Step 5: Create execution_attempts record on completion/failure
    let attemptRecord = null;
    if (status === "completed" || status === "failed") {
      const attemptNumber = exec.attempt_count || 1;
      const { data: attempt, error: attemptError } = await supabaseAdmin
        .from("execution_attempts")
        // @ts-ignore
        .insert({
          execution_id: executionId,
          attempt_number: attemptNumber,
          status: status,
          started_at: now.toISOString(),
          completed_at: now.toISOString(),
          output_snapshot: output_snapshot || null,
          error_message: error_message || null,
          agent_id: agent_id || exec.agent_id,
          tokens_used: tokens_used || 0,
          actual_cost_usd: actual_cost_usd || 0,
        })
        .select()
        .single();

      if (attemptError) {
        console.error("[Executions PATCH] Attempt record error:", attemptError);
        // Don't fail the request if attempt creation fails
      } else {
        attemptRecord = attempt;
      }
    }

    // Step 6: Record execution event
    let eventRecord = null;
    const eventType = status === "completed" ? "execution_completed" : 
                      status === "failed" ? "execution_failed" : 
                      status === "in_progress" ? "execution_started" : "execution_updated";
    
    const { data: event, error: eventError } = await supabaseAdmin
      .from("execution_events")
      // @ts-ignore
      .insert({
        execution_id: executionId,
        event_type: eventType,
        event_data: {
          status,
          output_preview: output_preview ? output_preview.substring(0, 500) : null,
          output_snapshot_present: !!output_snapshot,
          error_message: error_message || null,
          tokens_used: tokens_used || 0,
          actual_cost_usd: actual_cost_usd || 0,
          idempotency_key: idempotency_key || null,
          agent_id: agent_id || exec.agent_id,
          attempt_number: exec.attempt_count || 1,
        },
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (eventError) {
      console.error("[Executions PATCH] Event record error:", eventError);
      // Don't fail the request if event creation fails
    } else {
      eventRecord = event;
    }

    // ATLAS-COST-MVP-357: Capture cost data on completion
    let costCaptureResult = null;
    if ((status === "completed" || status === "failed") && tokens_used) {
      try {
        costCaptureResult = await captureExecutionCost({
          executionId,
          agentId: agent_id || exec.agent_id,
          taskId: exec.task_id,
          model: body.model ?? "unknown",
          tokensUsed: tokens_used,
          inputTokens: body.input_tokens,
          outputTokens: body.output_tokens,
          costUsd: actual_cost_usd,
        });
      } catch (costError) {
        console.error("[Executions PATCH] Cost capture error:", costError);
        // Don't fail the request if cost capture fails
      }
    }

    // Step 7: Atomically update linked task status and execution_id
    let updatedTask = null;
    const executionTaskId = exec.task_id;
    
    if (executionTaskId && status) {
      // Task status mapping based on execution status
      const taskStatusMap: Record<string, string> = {
        "completed": "completed",
        "failed": "inbox",      // Return to inbox on failure (retryable)
        "cancelled": "archived", // Archive cancelled tasks
      };

      const newTaskStatus = taskStatusMap[status];
      
      if (newTaskStatus) {
        // Build task update object - only include fields that exist
        const taskUpdates: any = {
          status: newTaskStatus,
          // Always sync execution_id to ensure task points to this execution
          execution_id: executionId,
        };

        const { data: task, error: taskError } = await supabaseAdmin
          .from("tasks")
          // @ts-ignore
          .update(taskUpdates)
          .eq("id", executionTaskId)
          .select()
          .single();

        if (taskError) {
          console.error("[Executions PATCH] Task update error:", taskError);
          // Don't fail the execution update if task update fails
          // Log for manual reconciliation
        } else {
          updatedTask = task;
        }
      }
    }

    // Step 8: Gate 4 - Trigger orchestration hook for workflow steps
    // This handles sequential workflow progression
    if (status === "completed" || status === "failed") {
      try {
        await onGate2ExecutionComplete(
          executionId,
          status,
          output_preview ? { output: output_preview } : undefined,
          error_message
        );
      } catch (hookError) {
        console.error("[Executions PATCH] Orchestration hook error:", hookError);
        // Don't fail the response if orchestration hook fails
      }
    }

    // Step 9: Return JSON response
    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      task: updatedTask,
      durability: {
        attempt_recorded: !!attemptRecord,
        attempt_id: attemptRecord?.id,
        event_recorded: !!eventRecord,
        event_id: eventRecord?.id,
        idempotent: false,
      },
      sync: {
        execution_updated: true,
        task_updated: !!updatedTask,
        task_id: executionTaskId,
        execution_id_synced: !!executionTaskId,
      },
      orchestration: {
        hook_triggered: status === "completed" || status === "failed",
      },
      cost: {
        captured: costCaptureResult?.success ?? false,
        cost_id: costCaptureResult?.cost_id,
      },
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error("[Executions PATCH] Exception:", error);
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

/**
 * GET /api/executions/:id
 * Fetch single execution by ID with durability data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: "Execution ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch execution
    const { data: execution, error } = await supabaseAdmin
      .from("executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (error || !execution) {
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // Fetch related durability data
    const [{ data: attempts }, { data: events }] = await Promise.all([
      supabaseAdmin
        .from("execution_attempts")
        .select("*")
        .eq("execution_id", executionId)
        .order("attempt_number", { ascending: true }),
      supabaseAdmin
        .from("execution_events")
        .select("*")
        .eq("execution_id", executionId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      success: true,
      execution,
      durability: {
        attempts: attempts || [],
        events: events || [],
        attempt_count: attempts?.length || 0,
        event_count: events?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Executions GET] Exception:", error);
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
