/**
 * Gate 4: Orchestration Engine
 * ATLAS-GATE4-MVP-241
 * 
 * Integrates with Gate 2 execution pipeline (claim/execute/PATCH flow)
 * Handles workflow step completion and progression
 * 
 * Constraints:
 * - Sequential orchestration only (no parallel)
 * - Hooks into existing task claim/execution/PATCH flow
 * - No scheduler integration
 * - No webhook triggers
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  WorkflowTask,
  WorkflowExecution,
  getNextSequentialTask,
  isExecutionComplete,
  buildTaskInput,
  updateExecutionContext,
  calculateProgress,
  validateWorkflowForExecution,
} from "./dependency-resolver";

export interface OrchestrationStepResult {
  success: boolean;
  executionId: string;
  workflowTaskId?: string;
  taskId?: string; // The actual task created for Gate 2
  nextTask?: WorkflowTask;
  complete: boolean;
  error?: string;
}

/**
 * Initialize a new workflow execution
 * Creates tasks and prepares for sequential execution
 */
export async function initializeWorkflowExecution(
  executionId: string
): Promise<OrchestrationStepResult> {
  // ATLAS-GATE4-AUTO-DISPATCH-TRACE-377: Start tracing
  console.log(`[TRACE-377] ========== initializeWorkflowExecution START ==========`);
  console.log(`[TRACE-377] executionId: ${executionId}`);
  
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Fetch execution with workflow tasks
    console.log(`[TRACE-377] Step 1: Fetching workflow execution...`);
    const { data: execution, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execError || !execution) {
      console.error(`[TRACE-377] FAILED: Execution not found - ${execError?.message}`);
      return { success: false, executionId, complete: false, error: "Execution not found" };
    }
    console.log(`[TRACE-377] Step 1: OK - Execution found`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executionData = execution as any;

    // Fetch workflow tasks
    console.log(`[TRACE-377] Step 2: Fetching workflow tasks for workflow_id=${executionData.workflow_id}...`);
    const { data: workflowTasks, error: tasksError } = await supabaseAdmin
      .from("workflow_tasks")
      .select("*")
      .eq("workflow_id", executionData.workflow_id)
      .order("execution_order", { ascending: true });

    if (tasksError) {
      console.error(`[TRACE-377] FAILED: Failed to fetch workflow tasks - ${tasksError.message}`);
      return { success: false, executionId, complete: false, error: "Failed to fetch workflow tasks" };
    }
    console.log(`[TRACE-377] Step 2: OK - Found ${workflowTasks?.length ?? 0} workflow tasks`);

    // Validate workflow
    console.log(`[TRACE-377] Step 3: Validating workflow...`);
    const validation = validateWorkflowForExecution(workflowTasks || []);
    if (!validation.valid) {
      console.error(`[TRACE-377] FAILED: Workflow validation failed - ${validation.errors.join(", ")}`);
      await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: "failed",
          error_message: `Workflow validation failed: ${validation.errors.join(", ")}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      return { success: false, executionId, complete: false, error: validation.errors.join(", ") };
    }
    console.log(`[TRACE-377] Step 3: OK - Workflow valid`);

    // Get first task
    console.log(`[TRACE-377] Step 4: Getting first task...`);
    const firstTask = workflowTasks?.[0];
    if (!firstTask) {
      console.log(`[TRACE-377] Step 4: No tasks found - marking workflow complete`);
      // No tasks - mark complete
      await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_tasks: 0,
        })
        .eq("id", executionId);

      return { success: true, executionId, complete: true };
    }
    console.log(`[TRACE-377] Step 4: OK - First task: ${(firstTask as any).id} (${(firstTask as any).name})`);

    // Create the first actual task for Gate 2 execution
    console.log(`[TRACE-377] Step 5: Creating task for workflow step...`);
    const taskResult = await createTaskForWorkflowStep(executionId, firstTask, executionData);

    if (!taskResult.success) {
      console.error(`[TRACE-377] FAILED: Task creation failed - ${taskResult.error}`);
      return { success: false, executionId, complete: false, error: taskResult.error };
    }
    console.log(`[TRACE-377] Step 5: OK - Task created: ${taskResult.taskId}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstTaskData = firstTask as any;

    // Update execution state
    console.log(`[TRACE-377] Step 6: Updating workflow execution state...`);
    await supabaseAdmin
      .from("workflow_executions")
      // @ts-ignore
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        current_task_id: firstTaskData?.id,
      })
      .eq("id", executionId);
    console.log(`[TRACE-377] Step 6: OK - Execution state updated`);

    // Mark first workflow task as ready
    console.log(`[TRACE-377] Step 7: Marking workflow task as ready...`);
    await supabaseAdmin
      .from("workflow_tasks")
      // @ts-ignore
      .update({ status: "ready" })
      .eq("id", firstTaskData?.id);
    console.log(`[TRACE-377] Step 7: OK - Workflow task marked ready`);

    console.log(`[TRACE-377] ========== initializeWorkflowExecution COMPLETE ==========`);
    console.log(`[TRACE-377] Result: success=true, taskId=${taskResult.taskId}`);

    return {
      success: true,
      executionId,
      workflowTaskId: firstTaskData?.id,
      taskId: taskResult.taskId,
      nextTask: firstTask,
      complete: false,
    };

  } catch (error) {
    console.error(`[TRACE-377] EXCEPTION in initializeWorkflowExecution:`, error);
    return {
      success: false,
      executionId,
      complete: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle completion of a workflow step
 * Called when Gate 2 execution completes (via PATCH /api/executions/:id)
 * Progresses to next task or completes workflow
 */
export async function handleStepCompletion(
  executionId: string,
  workflowTaskId: string,
  stepOutput?: Record<string, any>,
  stepError?: string
): Promise<OrchestrationStepResult> {
  // ATLAS-GATE4-FORCE-EXECUTION-602: Trace logging
  console.log(`[GATE4-602] handleStepCompletion START`);
  console.log(`[GATE4-602] executionId: ${executionId}`);
  console.log(`[GATE4-602] workflowTaskId: ${workflowTaskId}`);
  console.log(`[GATE4-602] hasOutput: ${!!stepOutput}, hasError: ${!!stepError}`);
  
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Fetch execution
    const { data: execution, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execError || !execution) {
      console.error(`[GATE4-602] Execution not found: ${execError?.message}`);
      return { success: false, executionId, complete: false, error: "Execution not found" };
    }
    
    console.log(`[GATE4-602] Execution found: ${executionId}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executionData = execution as any;

    // Fetch the completed workflow task
    const { data: completedWorkflowTask, error: taskError } = await supabaseAdmin
      .from("workflow_tasks")
      .select("*")
      .eq("id", workflowTaskId)
      .single();

    if (taskError || !completedWorkflowTask) {
      return { success: false, executionId, complete: false, error: "Workflow task not found" };
    }

    // Handle failure
    if (stepError) {
      await supabaseAdmin
        .from("workflow_tasks")
        // @ts-ignore
        .update({
          status: "failed",
          error_message: stepError,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workflowTaskId);

      await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: "failed",
          error_message: stepError,
          error_task_id: workflowTaskId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      return { success: false, executionId, complete: true, error: stepError };
    }

    // Mark task as completed
    console.log(`[GATE4-602] Marking workflow_task ${workflowTaskId} as completed...`);
    const { error: updateError } = await supabaseAdmin
      .from("workflow_tasks")
      // @ts-ignore
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", workflowTaskId);
    
    if (updateError) {
      console.error(`[GATE4-602] FAILED to mark workflow_task as completed: ${updateError.message}`);
    } else {
      console.log(`[GATE4-602] workflow_task ${workflowTaskId} marked as completed`);
    }

    // Update execution context with output
    const updatedContext = updateExecutionContext(
      executionData.execution_context || {},
      workflowTaskId,
      stepOutput || {}
    );

    // Fetch all workflow tasks to determine next step
    console.log(`[GATE4-602] Fetching all workflow tasks for workflow_id=${executionData.workflow_id}...`);
    const { data: allWorkflowTasks } = await supabaseAdmin
      .from("workflow_tasks")
      .select("*")
      .eq("workflow_id", executionData.workflow_id)
      .order("execution_order", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks = (allWorkflowTasks || []) as any[];
    console.log(`[GATE4-602] Fetched ${tasks.length} workflow tasks:`);
    tasks.forEach((t: any) => console.log(`[GATE4-602]   - ${t.id}: ${t.name} (status=${t.status})`));
    
    const completedTasks = tasks.filter(t => t.status === "completed" || t.id === workflowTaskId);
    const completedIds = new Set(completedTasks.map(t => t.id));
    const failedIds = new Set(tasks.filter(t => t.status === "failed").map(t => t.id));
    console.log(`[GATE4-602] completedIds after filter: [${Array.from(completedIds).join(',')}]`);

    // ATLAS-GATE4-CLOSEOUT-501: Build completed_task_ids array
    const completedTaskIds = Array.from(completedIds);
    
    // ATLAS-GATE4-FORCE-EXECUTION-602: Trace completion check
    console.log(`[GATE4-602] Completion check: tasks=${tasks.length}, completed=${completedTasks.length}, completedIds=[${Array.from(completedIds).join(',')}]`);
    
    // Check if workflow is complete
    const completion = isExecutionComplete(tasks, completedIds, failedIds);
    console.log(`[GATE4-602] isExecutionComplete: complete=${completion.complete}, success=${completion.success}, blocked=${completion.blocked}`);

    if (completion.complete) {
      console.log(`[GATE4-602] WORKFLOW COMPLETE - updating status`);
      // Workflow finished
      await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: completion.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          completed_tasks: completedTasks.length,
          completed_task_ids: completedTaskIds,
          current_task_id: null,
          execution_context: updatedContext,
          final_output: stepOutput,
        })
        .eq("id", executionId);
      console.log(`[GATE4-602] WORKFLOW COMPLETE - status updated to ${completion.success ? "completed" : "failed"}`);

      return {
        success: completion.success,
        executionId,
        workflowTaskId,
        complete: true,
        error: completion.success ? undefined : "Workflow failed",
      };
    }

    // Get next task for sequential execution
    console.log(`[GATE4-602] Getting next task...`);
    const nextTask = getNextSequentialTask(tasks, completedIds, failedIds);
    
    if (!nextTask) {
      console.log(`[GATE4-602] No next task found - all tasks should be complete`);
      // Shouldn't happen if completion check passed, but handle gracefully
      await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore
        .update({
          status: "failed",
          error_message: "Could not determine next task",
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      return { success: false, executionId, complete: false, error: "Could not determine next task" };
    }
    console.log(`[GATE4-602] Next task found: ${(nextTask as any).id} (${(nextTask as any).name})`);

    // Create task for next step
    const taskResult = await createTaskForWorkflowStep(executionId, nextTask, {
      ...executionData,
      execution_context: updatedContext,
    });

    if (!taskResult.success) {
      return { success: false, executionId, complete: false, error: taskResult.error };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextTaskData = nextTask as any;

    // Update execution with progress
    const progress = calculateProgress(completedTasks.length, tasks.length);

    await supabaseAdmin
      .from("workflow_executions")
      // @ts-ignore
      .update({
        current_task_id: nextTaskData?.id,
        completed_tasks: completedTasks.length,
        completed_task_ids: completedTaskIds,
        execution_context: {
          ...updatedContext,
          progress,
        },
      })
      .eq("id", executionId);

    // Mark next task as ready
    await supabaseAdmin
      .from("workflow_tasks")
      // @ts-ignore
      .update({ status: "ready" })
      .eq("id", nextTaskData?.id);

    return {
      success: true,
      executionId,
      workflowTaskId,
      taskId: taskResult.taskId,
      nextTask,
      complete: false,
    };

  } catch (error) {
    console.error("[Orchestration Engine] Step completion error:", error);
    return {
      success: false,
      executionId,
      complete: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create an actual task record for Gate 2 execution pipeline
 * This bridges workflow orchestration to the existing task/execution system
 */
async function createTaskForWorkflowStep(
  executionId: string,
  workflowTask: WorkflowTask,
  execution: any
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  // ATLAS-GATE4-AUTO-DISPATCH-TRACE-377: Start tracing
  console.log(`[TRACE-377] ---------- createTaskForWorkflowStep START ----------`);
  console.log(`[TRACE-377] executionId: ${executionId}`);
  console.log(`[TRACE-377] workflowTask.id: ${workflowTask.id}`);
  console.log(`[TRACE-377] workflowTask.name: ${workflowTask.name}`);
  console.log(`[TRACE-377] workflowTask.agent_id: ${workflowTask.agent_id || 'NONE'}`);
  
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Build task input from mapping
    console.log(`[TRACE-377] Building task input...`);
    const taskInput = buildTaskInput(
      workflowTask,
      execution.execution_context || {}
    );
    console.log(`[TRACE-377] Task input built:`, JSON.stringify(taskInput).substring(0, 200));

    // Create task in tasks table (for Gate 2)
    console.log(`[TRACE-377] Creating task in tasks table...`);
    // ATLAS-GATE4-ENGINE-ADVANCE-340: Store workflow context in description as JSON
    const workflowContext = JSON.stringify({
      wf_exec_id: executionId,
      wf_task_id: workflowTask.id,
      is_wf_step: true,
    });
    
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      // @ts-ignore - Supabase types
      .insert({
        title: workflowTask.name,
        description: `${workflowTask.description || `Workflow step: ${workflowTask.name}`}\n<!--WF:${workflowContext}-->`,
        status: "inbox",  // ATLAS-GATE4-CLAIM-STATUS-ALIGN-359: Use "inbox" for Gate 2 claim compatibility
        assigned_agent_id: workflowTask.agent_id || null,
        company_id: execution.company_id,
      })
      .select()
      .single();

    if (taskError) {
      console.error(`[TRACE-377] FAILED: Task creation error - ${taskError.message}`);
      console.error(`[TRACE-377] ---------- createTaskForWorkflowStep FAILED ----------`);
      return { success: false, error: `Failed to create task: ${taskError.message}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskData = task as any;
    console.log(`[TRACE-377] Task created in DB: ${taskData?.id}`);

    // Link workflow_task to the created task
    console.log(`[TRACE-377] Linking workflow_task to task...`);
    const { error: linkError } = await supabaseAdmin
      .from("workflow_tasks")
      // @ts-ignore
      .update({ task_id: taskData?.id })
      .eq("id", workflowTask.id);
    
    if (linkError) {
      console.error(`[TRACE-377] WARNING: Failed to link workflow_task - ${linkError.message}`);
    } else {
      console.log(`[TRACE-377] Workflow task linked: workflow_task.id=${workflowTask.id} -> task.id=${taskData?.id}`);
    }

    // ATLAS-GATE4-AUTO-DISPATCH-370: Auto-dispatch to Gate 2
    console.log(`[TRACE-377] Checking auto-dispatch eligibility...`);
    console.log(`[TRACE-377] workflowTask.agent_id: ${workflowTask.agent_id || 'null'}`);
    
    if (workflowTask.agent_id) {
      console.log(`[TRACE-377] Auto-dispatch TRIGGERED for agent: ${workflowTask.agent_id}`);
      const dispatchResult = await autoDispatchTaskToGate2(
        taskData?.id,
        workflowTask.id,  // Pass workflow_task.id for FK constraint
        workflowTask.agent_id,
        executionId
      );
      
      if (dispatchResult.success) {
        console.log(`[TRACE-377] Auto-dispatch SUCCESS: execution=${dispatchResult.executionId}`);
      } else {
        console.error(`[TRACE-377] Auto-dispatch FAILED: ${dispatchResult.error}`);
      }
    } else {
      console.log(`[TRACE-377] Auto-dispatch SKIPPED: No agent assigned`);
    }

    console.log(`[TRACE-377] ---------- createTaskForWorkflowStep COMPLETE ----------`);
    console.log(`[TRACE-377] Result: success=true, taskId=${taskData?.id}`);

    return { success: true, taskId: taskData?.id };

  } catch (error) {
    console.error("[Orchestration Engine] Create task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * ATLAS-GATE4-AUTO-DISPATCH-370: Auto-dispatch task to Gate 2 execution
 * Automatically claims the task and creates execution record
 */
async function autoDispatchTaskToGate2(
  taskId: string,
  workflowTaskId: string,  // workflow_tasks.id for FK constraint
  agentId: string,
  workflowExecutionId: string
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  // ATLAS-GATE4-AUTO-DISPATCH-TRACE-377: Start tracing
  console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 START >>>>>>>>`);
  console.log(`[TRACE-377] taskId: ${taskId}`);
  console.log(`[TRACE-377] workflowTaskId: ${workflowTaskId}`);
  console.log(`[TRACE-377] agentId: ${agentId}`);
  console.log(`[TRACE-377] workflowExecutionId: ${workflowExecutionId}`);

  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Step 1: Resolve agent identifier to UUID
    console.log(`[TRACE-377] [AD-Step1] Resolving agent: ${agentId}...`);
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("id, name")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error(`[TRACE-377] [AD-Step1] FAILED: Agent not found - ${agentError?.message}`);
      console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 FAILED >>>>>>>>`);
      return { success: false, error: `Agent not found: ${agentId}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentUuid = (agent as any).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`[TRACE-377] [AD-Step1] OK: Agent resolved to ${agentUuid} (${(agent as any).name})`);

    // Step 2: Verify task is claimable
    console.log(`[TRACE-377] [AD-Step2] Verifying task ${taskId} is claimable...`);
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, status, assigned_agent_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error(`[TRACE-377] [AD-Step2] FAILED: Task not found - ${taskError?.message}`);
      console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 FAILED >>>>>>>>`);
      return { success: false, error: "Task not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskData = task as any;
    console.log(`[TRACE-377] [AD-Step2] Task found: status=${taskData.status}, assigned=${taskData.assigned_agent_id || 'null'}`);

    if (taskData.assigned_agent_id && taskData.assigned_agent_id !== agentUuid) {
      console.error(`[TRACE-377] [AD-Step2] FAILED: Task already claimed by ${taskData.assigned_agent_id}`);
      console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 FAILED >>>>>>>>`);
      return { success: false, error: "Task already claimed by another agent" };
    }

    console.log(`[TRACE-377] [AD-Step2] OK: Task is claimable`);

    // Step 3: Create execution record (Gate 2 handoff)
    console.log(`[TRACE-377] [AD-Step3] Creating execution record...`);
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
      console.error(`[TRACE-377] [AD-Step3] FAILED: Execution creation error - ${execError.message}`);
      console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 FAILED >>>>>>>>`);
      return { success: false, error: `Failed to create execution: ${execError.message}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executionData = execution as any;
    console.log(`[TRACE-377] [AD-Step3] OK: Execution created - ${executionData?.id}`);

    // Step 4: Update task status to in_progress (claim)
    console.log(`[TRACE-377] [AD-Step4] Updating task status to in_progress...`);
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      // @ts-ignore
      .update({
        assigned_agent_id: agentUuid,
        status: "in_progress",
        execution_id: executionData?.id,
      })
      .eq("id", taskId);

    if (updateError) {
      console.error(`[TRACE-377] [AD-Step4] FAILED: Task update error - ${updateError.message}`);
      console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 FAILED >>>>>>>>`);
      return { success: false, error: `Failed to update task: ${updateError.message}` };
    }

    console.log(`[TRACE-377] [AD-Step4] OK: Task claimed and status updated`);

    // Step 5: Update workflow execution with current task (workflow_task ID, not task ID)
    console.log(`[TRACE-377] [AD-Step5] Updating workflow execution state...`);
    const { error: wfUpdateError } = await supabaseAdmin
      .from("workflow_executions")
      // @ts-ignore
      .update({
        current_task_id: workflowTaskId,  // Use workflow_tasks.id for FK constraint
        status: "running",
      })
      .eq("id", workflowExecutionId);

    if (wfUpdateError) {
      console.error(`[TRACE-377] [AD-Step5] WARNING: Workflow execution update failed - ${wfUpdateError.message}`);
    } else {
      console.log(`[TRACE-377] [AD-Step5] OK: Workflow execution updated`);
    }

    console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 SUCCESS >>>>>>>>`);
    console.log(`[TRACE-377] Result: executionId=${executionData?.id}`);

    return { success: true, executionId: executionData?.id };

  } catch (error) {
    console.error(`[TRACE-377] [AD-EXCEPTION] `, error);
    console.log(`[TRACE-377] >>>>>>>> autoDispatchTaskToGate2 EXCEPTION >>>>>>>>`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Hook for Gate 2 execution completion
 * Called from PATCH /api/executions/:id when a workflow step completes
 */
export async function onGate2ExecutionComplete(
  executionRecordId: string, // The executions table record ID
  status: "completed" | "failed",
  output?: Record<string, any>,
  error?: string
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Find the execution record to get task_id
    const { data: execRecord } = await supabaseAdmin
      .from("executions")
      .select("task_id")
      .eq("id", executionRecordId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execRecordData = execRecord as any;

    if (!execRecordData?.task_id) {
      console.log("[Orchestration Engine] No task_id in execution record, skipping orchestration hook");
      return;
    }

    // ATLAS-GATE4-ENGINE-ADVANCE-340: Find workflow task by linked task_id
    // Query workflow_tasks where task_id matches the completed task
    const { data: workflowTaskData } = await supabaseAdmin
      .from("workflow_tasks")
      .select("id, workflow_id")
      .eq("task_id", execRecordData.task_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wfTaskData = workflowTaskData as any;

    if (!wfTaskData?.id) {
      // Not a workflow step - no orchestration needed
      return;
    }

    // Fetch the workflow execution for this workflow_task
    const { data: workflowExec } = await supabaseAdmin
      .from("workflow_executions")
      .select("id")
      .eq("workflow_id", wfTaskData.workflow_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflowExecData = workflowExec as any;

    const workflowExecutionId = workflowExecData?.id;
    const workflowTaskId = wfTaskData.id;

    if (!workflowExecutionId || !workflowTaskId) {
      console.error("[Orchestration Engine] Missing workflow IDs from workflow_tasks lookup");
      return;
    }

    // Trigger step completion handling
    await handleStepCompletion(
      workflowExecutionId,
      workflowTaskId,
      output,
      error || (status === "failed" ? "Task execution failed" : undefined)
    );

  } catch (error) {
    console.error("[Orchestration Engine] Gate 2 hook error:", error);
  }
}

/**
 * Get current execution state
 */
export async function getExecutionState(
  executionId: string
): Promise<{
  execution?: WorkflowExecution;
  tasks?: WorkflowTask[];
  error?: string;
}> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const [{ data: execution }, { data: tasks }] = await Promise.all([
      supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .single(),
      supabaseAdmin
        .from("workflow_tasks")
        .select("*")
        .eq("workflow_id", executionId)
        .order("execution_order", { ascending: true }),
    ]);

    return { execution: execution as any, tasks: (tasks || []) as any[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
