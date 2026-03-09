import { NextRequest, NextResponse } from "next/server";
import { acquireLock, LockKeys } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

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
      // Step 2: Check if task exists and is claimable
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id, status, assigned_agent_id")
        .eq("id", taskId)
        .single();

      if (taskError || !task) {
        await lock.release();
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        );
      }

      // Check if already assigned
      if (task.assigned_agent_id && task.assigned_agent_id !== agentId) {
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

      // Step 3: Update task in Supabase
      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update({
          assigned_agent_id: agentId,
          status: "in_progress",
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

      // Step 4: Create execution record
      const { error: execError } = await supabase
        .from("executions")
        .insert({
          task_id: taskId,
          agent_id: agentId,
          status: "in_progress",
          started_at: new Date().toISOString(),
        });

      if (execError) {
        console.error("[Task Claim] Execution creation error:", execError);
        // Don't fail the claim if execution record fails
      }

      // Lock will auto-expire, but we could release it here if needed
      // await lock.release();

      return NextResponse.json({
        success: true,
        claimed: true,
        taskId,
        agentId,
        task: updatedTask,
        claimedAt: new Date().toISOString(),
        lockExpiresIn: LOCK_TTL_SECONDS,
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
