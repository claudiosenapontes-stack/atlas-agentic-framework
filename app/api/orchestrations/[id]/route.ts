import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Valid workflow statuses
const VALID_WORKFLOW_STATUSES = ["draft", "active", "paused", "archived"] as const;

// Valid workflow execution statuses
const VALID_EXECUTION_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;
type ExecutionStatus = (typeof VALID_EXECUTION_STATUSES)[number];

/**
 * GET /api/orchestrations/:id
 * Fetch a specific workflow or execution by ID
 * 
 * Query params:
 * - type: "workflow" | "execution" (default: "execution")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "execution"; // "workflow" or "execution"
    const includeTasks = searchParams.get("include_tasks") === "true";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch workflow
    if (type === "workflow") {
      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !workflow) {
        return NextResponse.json(
          { success: false, error: "Workflow not found" },
          { status: 404 }
        );
      }

      // Include tasks if requested
      let tasks = null;
      if (includeTasks) {
        const { data: workflowTasks, error: tasksError } = await supabaseAdmin
          .from("workflow_tasks")
          .select("*")
          .eq("workflow_id", id)
          .order("execution_order", { ascending: true });

        if (!tasksError) {
          tasks = workflowTasks;
        }
      }

      return NextResponse.json({
        success: true,
        workflow,
        tasks,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch execution
    if (type === "execution") {
      const { data: execution, error } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !execution) {
        return NextResponse.json(
          { success: false, error: "Execution not found" },
          { status: 404 }
        );
      }

      // Include workflow tasks with their current status
      let tasks = null;
      let workflow = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executionData = execution as any;
      if (includeTasks && executionData.workflow_id) {
        const [{ data: wfTasks }, { data: wf }] = await Promise.all([
          supabaseAdmin
            .from("workflow_tasks")
            .select("*")
            .eq("workflow_id", executionData.workflow_id)
            .order("execution_order", { ascending: true }),
          supabaseAdmin
            .from("workflows")
            .select("id, name, description, definition")
            .eq("id", executionData.workflow_id)
            .single(),
        ]);

        tasks = wfTasks;
        workflow = wf;
      }

      return NextResponse.json({
        success: true,
        execution,
        workflow,
        tasks,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Use 'workflow' or 'execution'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Orchestrations GET] Exception:", error);
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
 * PATCH /api/orchestrations/:id
 * Update workflow or execution status
 * 
 * For executions: used by Gate 2 execution pipeline to report task completion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "execution";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Update workflow
    if (type === "workflow") {
      const { name, description, status, definition } = body;

      // Validate status
      if (status && !VALID_WORKFLOW_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;
      if (definition !== undefined) updates.definition = definition;

      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        // @ts-ignore
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Orchestrations PATCH] Workflow update error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update workflow" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        workflow,
        timestamp: new Date().toISOString(),
      });
    }

    // Update execution - used by Gate 2 pipeline
    if (type === "execution") {
      const {
        status,
        current_task_id,
        current_task_status,
        task_output,
        error_message,
        completed_at,
      } = body;

      // Fetch current execution
      const { data: execution, error: fetchError } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !execution) {
        return NextResponse.json(
          { success: false, error: "Execution not found" },
          { status: 404 }
        );
      }

      // Build updates
      const updates: any = {};
      
      if (status && VALID_EXECUTION_STATUSES.includes(status as ExecutionStatus)) {
        updates.status = status;
      }
      
      if (completed_at !== undefined) {
        updates.completed_at = completed_at;
      }
      
      if (error_message !== undefined) {
        updates.error_message = error_message;
      }

      // Handle task completion and progress to next task
      let nextTask = null;
      let allTasksCompleted = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executionData = execution as any;

      if (current_task_id && current_task_status) {
        // Update the current task status
        const taskUpdates: any = {
          status: current_task_status,
          updated_at: new Date().toISOString(),
        };

        if (current_task_status === "completed") {
          taskUpdates.completed_at = new Date().toISOString();
        }
        if (current_task_status === "failed") {
          taskUpdates.error_message = error_message || "Task failed";
        }

        await supabaseAdmin
          .from("workflow_tasks")
          // @ts-ignore
          .update(taskUpdates)
          .eq("id", current_task_id);

        // Update execution context with task output
        const executionContext = executionData.execution_context || {};
        const taskOutputs = executionContext.task_outputs || {};
        
        if (task_output) {
          taskOutputs[current_task_id] = task_output;
        }

        // Calculate progress
        const { data: workflowTasks } = await supabaseAdmin
          .from("workflow_tasks")
          .select("id, status")
          .eq("workflow_id", executionData.workflow_id);

        const completedCount = workflowTasks?.filter((t: any) => t.status === "completed").length || 0;
        const failedCount = workflowTasks?.filter((t: any) => t.status === "failed").length || 0;

        updates.completed_tasks = completedCount;
        updates.failed_tasks = failedCount;

        // Find next task for sequential execution
        if (current_task_status === "completed") {
          const currentTask = workflowTasks?.find((t: any) => t.id === current_task_id) as any;
          
          if (currentTask) {
            // Get next task by execution_order
            const { data: nextTasks } = await supabaseAdmin
              .from("workflow_tasks")
              .select("*")
              .eq("workflow_id", executionData.workflow_id)
              .gt("execution_order", currentTask?.execution_order || 0)
              .order("execution_order", { ascending: true })
              .limit(1);

            if (nextTasks && nextTasks.length > 0) {
              nextTask = nextTasks[0] as any;
              updates.current_task_id = nextTask?.id;
              
              // Mark next task as ready
              await supabaseAdmin
                .from("workflow_tasks")
                // @ts-ignore
                .update({ status: "ready" })
                .eq("id", nextTask.id);
            } else {
              // No more tasks - workflow complete
              allTasksCompleted = true;
              updates.status = "completed";
              updates.completed_at = new Date().toISOString();
              updates.current_task_id = null;
            }
          }
        } else if (current_task_status === "failed") {
          // Task failed - mark execution as failed
          updates.status = "failed";
          updates.completed_at = new Date().toISOString();
          updates.error_task_id = current_task_id;
        }

        // Update execution context
        updates.execution_context = {
          ...executionContext,
          task_outputs: taskOutputs,
        };
      }

      // Apply updates
      const { data: updatedExecution, error: updateError } = await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("[Orchestrations PATCH] Execution update error:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update execution" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        execution: updatedExecution,
        next_task: nextTask,
        all_tasks_completed: allTasksCompleted,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Orchestrations PATCH] Exception:", error);
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
 * DELETE /api/orchestrations/:id
 * Delete a workflow (soft delete) or cancel an execution
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "execution";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Soft delete workflow
    if (type === "workflow") {
      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        // @ts-ignore
        .update({
          status: "archived",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Orchestrations DELETE] Workflow archive error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to archive workflow" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        workflow,
        message: "Workflow archived successfully",
        timestamp: new Date().toISOString(),
      });
    }

    // Cancel execution
    if (type === "execution") {
      const { data: execution, error } = await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Orchestrations DELETE] Execution cancel error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to cancel execution" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        execution,
        message: "Execution cancelled successfully",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Orchestrations DELETE] Exception:", error);
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
