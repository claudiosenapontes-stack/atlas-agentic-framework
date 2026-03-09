import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Valid status transitions
const VALID_STATUSES = ["inbox", "in_progress", "review", "completed", "archived"] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  inbox: ["in_progress", "archived"],
  in_progress: ["review", "completed", "inbox"],
  review: ["completed", "in_progress", "inbox"],
  completed: ["archived", "in_progress"],
  archived: ["inbox"],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await request.json();
    const { status, agentId } = body;

    // Validation
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status as TaskStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Fetch current task
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, status, assigned_agent_id, title")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = task.status as TaskStatus;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(status as TaskStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid transition: ${currentStatus} → ${status}`,
          currentStatus,
          allowedTransitions
        },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if moving to completed
    if (status === "completed" && currentStatus !== "completed") {
      updates.completed_at = new Date().toISOString();
    }

    // Clear completed_at if moving away from completed
    if (currentStatus === "completed" && status !== "completed") {
      updates.completed_at = null;
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select(`
        *,
        company:companies(id, name),
        assigned_agent:agents!tasks_assigned_agent_id_fkey(id, name, display_name)
      `)
      .single();

    if (updateError) {
      console.error("[Task Status] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update task status" },
        { status: 500 }
      );
    }

    // Update execution record if exists
    if (status === "completed" || status === "archived") {
      const { error: execError } = await supabase
        .from("executions")
        .update({
          status: status === "completed" ? "completed" : "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("task_id", taskId)
        .eq("status", "in_progress");

      if (execError) {
        console.error("[Task Status] Execution update error:", execError);
      }
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      previousStatus: currentStatus,
      newStatus: status,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Task Status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
