import { NextRequest, NextResponse } from "next/server";
import { acquireLock, LockKeys } from "@/lib/redis";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LOCK_TTL_SECONDS = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, agentId } = body;

    // Validation
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { success: false, error: "taskId is required" },
        { status: 400 }
      );
    }

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { success: false, error: "agentId is required" },
        { status: 400 }
      );
    }

    // Step 1: Try to acquire distributed lock
    const lockKey = LockKeys.task(taskId);
    const lock = await acquireLock(lockKey, LOCK_TTL_SECONDS);

    if (!lock) {
      // Lock already held - check who has it
      const { getRedisClient } = await import("@/lib/redis");
      const redis = getRedisClient();
      const claimedBy = await redis.get(lockKey);
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Task already claimed", 
          claimedBy: claimedBy || "unknown",
          locked: true 
        },
        { status: 409 }
      );
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Step 2a: Resolve agent identifier to UUID
      const { data: agent, error: agentError } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("name", agentId)
        .single<{id: string}>();

      if (agentError || !agent) {
        await lock.release();
        return NextResponse.json(
          { success: false, error: `Agent not found: ${agentId}` },
          { status: 400 }
        );
      }

      const agentUuid = agent.id;

      // Step 2b: Check if task exists and is claimable (include delegation fields)
      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .select("id, status, assigned_agent_id, parent_task_id, delegated_by, delegated_at")
        .eq("id", taskId)
        .single<{id: string, status: string, assigned_agent_id: string | null, parent_task_id: string | null, delegated_by: string | null, delegated_at: string | null}>();

      if (taskError || !task) {
        await lock.release();
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        );
      }

      // Check if already assigned
      if (task.assigned_agent_id && task.assigned_agent_id !== agentUuid) {
        await lock.release();
        return NextResponse.json(
          { 
            success: false, 
            error: "Task already claimed by another agent",
            claimedBy: task.assigned_agent_id,
            locked: false
          },
          { status: 409 }
        );
      }

      // Step 3: Create execution record FIRST (needed for task.execution_id)
      const { data: execution, error: execError } = await supabaseAdmin
        .from("executions")
        .insert({
          task_id: taskId,
          agent_id: agentUuid,
          status: "in_progress",
          started_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (execError) {
        console.error("[Task Claim] Execution creation error:", execError);
        await lock.release();
        return NextResponse.json(
          { success: false, error: "Failed to create execution record", details: execError },
          { status: 500 }
        );
      }

      // Step 4: Update task in Supabase with execution_id
      const { data: updatedTask, error: updateError } = await supabaseAdmin
        .from("tasks")
        // @ts-ignore - Supabase type inference issue
        .update({
          assigned_agent_id: agentUuid,
          status: "in_progress",
          execution_id: (execution as any)?.id || null,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (updateError) {
        await lock.release();
        console.error("[Task Claim] Supabase update error:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update task" },
          { status: 500 }
        );
      }

      // Lock will auto-expire, but we could release it here if needed
      // await lock.release();

      // Check if this is a delegated task claim
      const isDelegated = !!task.parent_task_id;

      return NextResponse.json({
        success: true,
        claimed: true,
        taskId,
        agentId,
        agentUuid,
        executionId: (execution as any)?.id || null,
        task: updatedTask,
        claimedAt: new Date().toISOString(),
        lockExpiresIn: LOCK_TTL_SECONDS,
        delegation: isDelegated ? {
          isDelegated: true,
          parentTaskId: task.parent_task_id,
          delegatedBy: task.delegated_by,
          delegatedAt: task.delegated_at,
        } : {
          isDelegated: false,
        },
      });

    } catch (innerError) {
      // Release lock on error
      await lock.release();
      throw innerError;
    }

  } catch (error) {
    console.error("[Task Claim] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
