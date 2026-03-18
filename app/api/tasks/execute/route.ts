/**
 * Task Execution Trigger API
 * ATLAS-9907: Manual task execution for testing
 * 
 * POST /api/tasks/execute - Trigger execution of a specific task
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  try {
    const body = await request.json();
    const { taskId } = body;
    
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "taskId is required", timestamp, requestId },
        { status: 400 }
      );
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Task not found", timestamp, requestId },
        { status: 404 }
      );
    }
    
    // Check if task has execution_id, auto-create if not
    let executionId = task.execution_id;
    
    if (!executionId) {
      console.log(`[TaskExecute] Auto-creating execution for task ${taskId}`);
      
      const { data: newExecution, error: createError } = await supabaseAdmin
        .from("executions")
        .insert({
          task_id: taskId,
          agent_id: task.assigned_agent_id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      
      if (createError || !newExecution) {
        return NextResponse.json(
          { success: false, error: "Failed to create execution", details: createError, timestamp, requestId },
          { status: 500 }
        );
      }
      
      executionId = (newExecution as any).id;
      
      // Update task with execution_id and status
      const { error: updateError } = await supabaseAdmin
        .from("tasks")
        .update({ 
          execution_id: executionId, 
          status: "in_progress",
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);
      
      if (updateError) {
        return NextResponse.json(
          { success: false, error: "Failed to update task", details: updateError, timestamp, requestId },
          { status: 500 }
        );
      }
    }
    
    // Simulate task execution (in production, this would call the actual agent runtime)
    console.log(`[TaskExecute] Executing task ${taskId} with execution ${executionId}`);
    
    // Update execution with progress
    await supabaseAdmin
      .from("executions")
      .update({
        status: "in_progress",
        step: "executing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", executionId);
    
    // Simulate work completion after a short delay
    // In production, this would be the actual agent execution
    setTimeout(async () => {
      try {
        // Mark execution as completed
        await supabaseAdmin
          .from("executions")
          .update({
            status: "completed",
            result_summary: "Task executed successfully (ATLAS-9907)",
            ended_at: new Date().toISOString(),
          })
          .eq("id", executionId);
        
        // Mark task as completed
        await supabaseAdmin
          .from("tasks")
          .update({
            status: "completed",
            progress: 100,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId);
        
        console.log(`[TaskExecute] Task ${taskId} completed`);
      } catch (e) {
        console.error(`[TaskExecute] Error completing task ${taskId}:`, e);
      }
    }, 2000);
    
    return NextResponse.json({
      success: true,
      message: "Task execution triggered",
      taskId,
      executionId,
      task: {
        id: task.id,
        title: task.title,
        status: "in_progress",
        assigned_agent_id: task.assigned_agent_id,
      },
      timestamp,
      requestId,
    });
    
  } catch (error) {
    console.error("[TaskExecute] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp,
        requestId
      },
      { status: 500 }
    );
  }
}
