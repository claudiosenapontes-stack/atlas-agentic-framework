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
      error_message,
      tokens_used,
      actual_cost_usd,
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

    // Step 1: Fetch the execution record to get task_id
    const { data: execution, error: fetchError } = await supabaseAdmin
      .from("executions")
      .select("id, task_id, status, agent_id")
      .eq("id", executionId)
      .single();

    if (fetchError || !execution) {
      console.error("[Executions PATCH] Fetch error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Execution not found" },
        { status: 404 }
      );
    }

    // Step 2: Build execution update object
    const executionUpdates: any = {};

    if (status !== undefined) executionUpdates.status = status;
    if (completed_at !== undefined) executionUpdates.completed_at = completed_at;
    if (output_preview !== undefined) executionUpdates.output_preview = output_preview;
    if (error_message !== undefined) executionUpdates.error_message = error_message;
    if (tokens_used !== undefined) executionUpdates.tokens_used = tokens_used;
    if (actual_cost_usd !== undefined) executionUpdates.actual_cost_usd = actual_cost_usd;

    // Auto-set completed_at if status is completed/failed/cancelled and not provided
    if ((status === "completed" || status === "failed" || status === "cancelled") && !completed_at) {
      executionUpdates.completed_at = new Date().toISOString();
    }

    // Step 3: Update execution record
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

    // ATLAS-COST-MVP-357: Capture cost data on completion
    let costCaptureResult = null;
    if ((status === "completed" || status === "failed") && tokens_used) {
      try {
        costCaptureResult = await captureExecutionCost({
          executionId,
          agentId: (execution as any).agent_id,
          taskId: (execution as any).task_id,
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

    // Step 4: Atomically update linked task status and execution_id
    let updatedTask = null;
    const executionTaskId = (execution as any).task_id;
    
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

    // Step 5: Gate 4 - Trigger orchestration hook for workflow steps
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

    // Step 6: Return JSON response
    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      task: updatedTask,
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
      timestamp: new Date().toISOString(),
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
 * Fetch single execution by ID
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

    return NextResponse.json({
      success: true,
      execution,
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
