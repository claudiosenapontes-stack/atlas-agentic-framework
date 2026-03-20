/**
 * Execution Runner Loop
 * ATLAS-GATE4-EXECUTION-RUNNER-380
 * ATLAS-TIMEZONE-STANDARDIZATION-501: Dual timestamp logging (UTC + NY)
 * 
 * Polls for in_progress tasks and executes them via the agent runtime.
 * This completes the Gate 2 execution pipeline for workflow tasks.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createServiceLogger } from "@/lib/logging";

const logger = createServiceLogger("ExecutionRunner");

const POLL_INTERVAL_MS = 30000; // ATLAS-P0-FIX-003: 30 seconds between polls
const MAX_CONCURRENT_EXECUTIONS = 5;

interface ExecutionTask {
  taskId: string;
  executionId: string;
  agentId: string;
  title: string;
  description: string;
  workflowContext?: {
    wf_exec_id: string;
    wf_task_id: string;
    is_wf_step: boolean;
  };
}

let isRunning = false;
let pollTimer: NodeJS.Timeout | null = null;

// ATLAS-GATE4-FINAL-RUNNER-FIX-421: Track in-flight executions to prevent duplicates
const inFlightExecutions = new Set<string>();

/**
 * Start the execution runner loop
 */
export function startExecutionRunner(): void {
  if (isRunning) {
    console.log("[ExecutionRunner] Already running");
    return;
  }

  isRunning = true;
  logger.info("Starting execution runner loop");
  logger.info(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  
  // Start polling
  pollTimer = setInterval(pollAndExecute, POLL_INTERVAL_MS);
  
  // Run immediately on start
  pollAndExecute();
}

/**
 * Stop the execution runner loop
 */
export function stopExecutionRunner(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isRunning = false;
  console.log("[ExecutionRunner] Stopped");
}

/**
 * Poll for tasks ready to execute and process them
 */
async function pollAndExecute(): Promise<void> {
  if (!isRunning) return;

  try {
    console.log(`[ExecutionRunner] Polling for executable tasks...`);
    
    const tasks = await fetchExecutableTasks();
    
    if (tasks.length === 0) {
      console.log(`[ExecutionRunner] No tasks to execute`);
      return;
    }

    console.log(`[ExecutionRunner] Found ${tasks.length} task(s) to execute`);

    // Process tasks (limit concurrency)
    const tasksToProcess = tasks.slice(0, MAX_CONCURRENT_EXECUTIONS);
    
    await Promise.all(
      tasksToProcess.map(task => executeTask(task))
    );

  } catch (error) {
    console.error(`[ExecutionRunner] Poll error:`, error);
  }
}

/**
 * Fetch tasks that are ready for execution
 * ATLAS-GATE4-FINAL-RUNNER-FIX-421: Updated to handle workflow-dispatched tasks
 * 
 * Workflow flow:
 * 1. workflow → workflow_tasks → tasks(status="inbox")
 * 2. autoDispatchTaskToGate2() → tasks(status="in_progress")
 * 3. ExecutionRunner pickup → status IN ('inbox','pending','in_progress')
 * 4. execution starts → status = "running"
 * 5. execution completes → status = "completed"
 * 6. handleStepCompletion() → next step dispatched
 */
async function fetchExecutableTasks(): Promise<ExecutionTask[]> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // ATLAS-GATE4-FINAL-RUNNER-FIX-421: Include all eligible statuses
    // Workflow-dispatched tasks have status="in_progress" with execution_id
    // Legacy tasks may have status="inbox" or "pending"
    console.log(`[ExecutionRunner] [CRITERIA] Querying for tasks with status IN ('inbox','pending','in_progress') AND assigned_agent_id NOT NULL AND execution_id NOT NULL`);

    // Query for eligible tasks - FIXED: Allow standalone tasks without execution_id
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        status,
        assigned_agent_id,
        execution_id
      `)
      .in("status", ["inbox", "pending", "in_progress"])
      .not("assigned_agent_id", "is", null)
      // REMOVED: .not("execution_id", "is", null) - allows standalone tasks
      .order("created_at", { ascending: false })  // Prioritize newer tasks
      .limit(MAX_CONCURRENT_EXECUTIONS);

    if (tasksError) {
      console.error(`[ExecutionRunner] [CRITERIA] Task query error:`, tasksError);
      return [];
    }

    console.log(`[ExecutionRunner] [CRITERIA] Found ${tasks?.length || 0} tasks with status IN ('inbox','pending','in_progress') AND assigned_agent_id NOT NULL AND execution_id NOT NULL`);

    if (!tasks || tasks.length === 0) {
      console.log(`[ExecutionRunner] [CRITERIA] No eligible tasks - skipping execution query`);
      return [];
    }

    // Log each task's eligibility
    tasks.forEach((task: any) => {
      const isEligible = ["inbox", "pending", "in_progress"].includes(task.status);
      
      if (isEligible) {
        console.log(`[ExecutionRunner] [ELIGIBLE] taskId=${task.id}, status=${task.status}, agentId=${task.assigned_agent_id}, executionId=${task.execution_id}`);
      } else {
        console.log(`[ExecutionRunner] [SKIP] taskId=${task.id} - status=${task.status}`);
      }
    });

    // Filter to only fully eligible tasks and fetch/create execution details
    const eligibleTasks: ExecutionTask[] = [];
    
    for (const task of tasks as any[]) {
      let executionId = task.execution_id;
      
      // ATLAS-9907: Auto-create execution for standalone tasks without execution_id
      if (!executionId) {
        console.log(`[ExecutionRunner] [AUTO-CREATE] taskId=${task.id} - Creating execution for standalone task`);
        
        const { data: newExecution, error: createError } = await supabaseAdmin
          .from("executions")
          .insert({
            task_id: task.id,
            agent_id: task.assigned_agent_id,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        
        if (createError || !newExecution) {
          console.error(`[ExecutionRunner] [ERROR] taskId=${task.id} - Failed to create execution:`, createError);
          continue;
        }
        
        executionId = (newExecution as any).id;
        
        // Update task with execution_id
        const { error: updateError } = await supabaseAdmin
          .from("tasks")
          .update({ execution_id: executionId, status: "in_progress" })
          .eq("id", task.id);
        
        if (updateError) {
          console.error(`[ExecutionRunner] [ERROR] taskId=${task.id} - Failed to update task with execution_id:`, updateError);
          continue;
        }
        
        console.log(`[ExecutionRunner] [AUTO-CREATE] taskId=${task.id} - Created execution ${executionId}`);
      }

      // Fetch the execution record to verify it exists and is in_progress
      const { data: execution, error: execError } = await supabaseAdmin
        .from("executions")
        .select("id, status, agent_id")
        .eq("id", executionId)
        .single();

      if (execError || !execution) {
        console.log(`[ExecutionRunner] [SKIP] taskId=${task.id} - Execution record not found: ${execError?.message}`);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execData = execution as any;
      
      if (execData.status !== "in_progress") {
        console.log(`[ExecutionRunner] [SKIP] taskId=${task.id} - Execution status="${execData.status}" (expected "in_progress")`);
        continue;
      }

      // Task is fully eligible
      const workflowContext = extractWorkflowContext(task.description || "");
      
      console.log(`[ExecutionRunner] [ELIGIBLE] taskId=${task.id}, executionId=${execData.id}, agentId=${task.assigned_agent_id}`);
      
      eligibleTasks.push({
        taskId: task.id,
        executionId: execData.id,
        agentId: task.assigned_agent_id,
        title: task.title || "Untitled Task",
        description: task.description || "",
        workflowContext,
      });
    }

    console.log(`[ExecutionRunner] [CRITERIA] Total eligible tasks: ${eligibleTasks.length}`);
    return eligibleTasks;

  } catch (error) {
    console.error(`[ExecutionRunner] Fetch exception:`, error);
    return [];
  }
}

/**
 * Extract workflow context from task description
 */
function extractWorkflowContext(description: string): ExecutionTask["workflowContext"] {
  try {
    const match = description.match(/<!--WF:({.*?})-->/);
    if (match) {
      return JSON.parse(match[1]);
    }
  } catch (e) {
    // Not a workflow task or invalid context
  }
  return undefined;
}

/**
 * Execute a single task
 */
async function executeTask(task: ExecutionTask): Promise<void> {
  // ATLAS-GATE4-FINAL-RUNNER-FIX-421: Skip if already in flight
  if (inFlightExecutions.has(task.taskId)) {
    console.log(`[ExecutionRunner] [SKIP] taskId=${task.taskId} - Already in flight`);
    return;
  }
  
  // Mark as in flight
  inFlightExecutions.add(task.taskId);

  console.log(`[ExecutionRunner] ===== EXECUTING TASK =====`);
  console.log(`[ExecutionRunner] taskId: ${task.taskId}`);
  console.log(`[ExecutionRunner] executionId: ${task.executionId}`);
  console.log(`[ExecutionRunner] agentId: ${task.agentId}`);
  console.log(`[ExecutionRunner] title: ${task.title}`);
  console.log(`[ExecutionRunner] isWorkflowStep: ${!!task.workflowContext}`);

  const startTime = Date.now();

  try {
    // Step 0: Update task status to "running"
    // ATLAS-GATE4-FINAL-RUNNER-FIX-421: Mark task as running when execution starts
    console.log(`[ExecutionRunner] Marking task as running...`);
    await updateTaskStatus(task.taskId, "running");

    // Step 1: Resolve agent to get configuration
    console.log(`[ExecutionRunner] Resolving agent configuration...`);
    const agentConfig = await resolveAgentConfig(task.agentId);
    
    if (!agentConfig) {
      throw new Error(`Agent not found or misconfigured: ${task.agentId}`);
    }

    console.log(`[ExecutionRunner] Agent resolved: ${agentConfig.name}`);

    // Step 2: Execute the agent
    console.log(`[ExecutionRunner] Invoking agent runtime...`);
    const result = await invokeAgentExecution(task, agentConfig);
    
    const duration = Date.now() - startTime;
    console.log(`[ExecutionRunner] Execution completed in ${duration}ms`);
    console.log(`[ExecutionRunner] Status: ${result.success ? "SUCCESS" : "FAILED"}`);

    // Step 3: Update execution record
    console.log(`[ExecutionRunner] Updating execution record...`);
    await completeExecution(task.executionId, result);
    console.log(`[ExecutionRunner] Execution record updated`);

    // Step 4: Trigger orchestration hook for workflow advancement
    if (task.workflowContext) {
      console.log(`[ExecutionRunner] Triggering workflow orchestration...`);
      await triggerWorkflowAdvancement(task, result);
    }

    console.log(`[ExecutionRunner] ===== TASK COMPLETE =====`);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ExecutionRunner] Execution failed after ${duration}ms:`, error);
    
    // Mark execution as failed
    await completeExecution(task.executionId, {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown execution error",
    });
  } finally {
    // ATLAS-GATE4-FINAL-RUNNER-FIX-421: Clean up in-flight tracking
    inFlightExecutions.delete(task.taskId);
  }
}

/**
 * Resolve agent configuration
 */
async function resolveAgentConfig(agentId: string): Promise<{ name: string; model?: string } | null> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .select("name, model")
      .eq("id", agentId)
      .single();

    if (error || !agent) {
      console.error(`[ExecutionRunner] Agent resolve error:`, error);
      return null;
    }

    return agent as any;
  } catch (error) {
    console.error(`[ExecutionRunner] Agent resolve exception:`, error);
    return null;
  }
}

/**
 * Invoke agent execution
 * ATLAS-P0-FIX-002: Queue task to Redis for worker consumption and poll for completion
 */
async function invokeAgentExecution(
  task: ExecutionTask,
  agentConfig: { name: string; model?: string }
): Promise<{ success: boolean; output: string; error?: string; tokensUsed?: number }> {
  console.log(`[ExecutionRunner] Queuing task for agent: ${agentConfig.name}`);
  console.log(`[ExecutionRunner] Task: ${task.title}`);

  // Import Redis client
  const { createClient } = await import("redis");
  const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await redis.connect();

  try {
    // Build task payload for worker
    const taskPayload = {
      id: task.taskId,
      type: "code",
      title: task.title,
      description: task.description,
      assigned_agent_id: task.agentId,
      execution_id: task.executionId,
      priority: "high",
      target_agents: [task.agentId],
      enqueued_at: new Date().toISOString(),
    };

    // Queue to agent's assignment queue
    const queueKey = `agent:assignments:${task.agentId}`;
    await redis.lpush(queueKey, JSON.stringify(taskPayload));
    console.log(`[ExecutionRunner] Task queued to ${queueKey}`);

    // Also add to sorted set for priority handling
    await redis.zadd("task_queue", { score: 50, value: task.taskId });

    // Store task data for worker
    await redis.set(`task:${task.taskId}`, JSON.stringify(taskPayload));

    // Poll for completion (workers will execute and update Supabase)
    const maxWaitMs = 10 * 60 * 1000; // 10 minute timeout
    const pollIntervalMs = 2000; // 2 second poll
    const startTime = Date.now();

    console.log(`[ExecutionRunner] Polling for execution completion...`);

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      // Check execution status in Supabase
      const supabaseAdmin = getSupabaseAdmin();
      const { data: execution, error } = await supabaseAdmin
        .from("executions")
        .select("status, output_preview, error_message, tokens_used")
        .eq("id", task.executionId)
        .single();

      if (error) {
        console.error(`[ExecutionRunner] Poll error:`, error);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execData = execution as any;

      if (execData.status === "completed") {
        console.log(`[ExecutionRunner] Execution completed`);
        return {
          success: true,
          output: execData.output_preview || "Task completed",
          tokensUsed: execData.tokens_used || 0,
        };
      }

      if (execData.status === "failed") {
        console.log(`[ExecutionRunner] Execution failed`);
        return {
          success: false,
          output: "",
          error: execData.error_message || "Execution failed",
          tokensUsed: execData.tokens_used || 0,
        };
      }

      // Still running, continue polling
      console.log(`[ExecutionRunner] Still running... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }

    // Timeout
    return {
      success: false,
      output: "",
      error: "Execution timed out after 10 minutes",
    };

  } finally {
    await redis.disconnect();
  }
}

/**
 * Update task status
 * ATLAS-GATE4-FINAL-RUNNER-FIX-421: Centralized task status updates
 */
async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { error } = await supabaseAdmin
      .from("tasks")
      // @ts-ignore
      .update({ status })
      .eq("id", taskId);

    if (error) {
      console.error(`[ExecutionRunner] Failed to update task status:`, error);
    } else {
      console.log(`[ExecutionRunner] Task ${taskId} status updated to "${status}"`);
    }
  } catch (error) {
    console.error(`[ExecutionRunner] Task status update exception:`, error);
  }
}

/**
 * Complete the execution by updating the record and syncing task status
 * ATLAS-GATE4-RUNNER-TASK-SYNC-413: Sync task status with execution completion
 * ATLAS-GATE4-FINAL-RUNNER-FIX-421: Set status to "completed" on success
 */
async function completeExecution(
  executionId: string,
  result: { success: boolean; output: string; error?: string; tokensUsed?: number }
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Step 1: Fetch execution to get task_id
    const { data: execution, error: fetchError } = await supabaseAdmin
      .from("executions")
      .select("id, task_id")
      .eq("id", executionId)
      .single();

    if (fetchError) {
      console.error(`[ExecutionRunner] Failed to fetch execution:`, fetchError);
      throw fetchError;
    }

    // Step 2: Update execution record
    const { error: execError } = await supabaseAdmin
      .from("executions")
      // @ts-ignore
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        output_preview: result.output.substring(0, 1000),
        error_message: result.error || null,
        tokens_used: result.tokensUsed || 0,
      })
      .eq("id", executionId);

    if (execError) {
      console.error(`[ExecutionRunner] Failed to update execution:`, execError);
      throw execError;
    }

    console.log(`[ExecutionRunner] Execution ${executionId} marked as ${result.success ? "completed" : "failed"}`);

    // Step 3: Sync task status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskId = (execution as any)?.task_id;
    if (taskId) {
      const taskStatus = result.success ? "completed" : "inbox"; // Return to inbox on failure for retry
      
      const { error: taskError } = await supabaseAdmin
        .from("tasks")
        // @ts-ignore
        .update({
          status: taskStatus,
          execution_id: executionId, // Ensure task points to this execution
        })
        .eq("id", taskId);

      if (taskError) {
        console.error(`[ExecutionRunner] Failed to sync task status:`, taskError);
        // Don't throw - execution update succeeded, task sync is secondary
      } else {
        console.log(`[ExecutionRunner] Task ${taskId} synced to status="${taskStatus}"`);
      }
    }
  } catch (error) {
    console.error(`[ExecutionRunner] Complete execution error:`, error);
    throw error;
  }
}

/**
 * Trigger workflow advancement after step completion
 */
async function triggerWorkflowAdvancement(
  task: ExecutionTask,
  result: { success: boolean; output: string; error?: string }
): Promise<void> {
  if (!task.workflowContext) return;

  try {
    // Import the orchestration hook dynamically to avoid circular dependencies
    const { handleStepCompletion } = await import("./engine");

    console.log(`[ExecutionRunner] Calling handleStepCompletion...`);
    console.log(`[ExecutionRunner] workflowExecutionId: ${task.workflowContext.wf_exec_id}`);
    console.log(`[ExecutionRunner] workflowTaskId: ${task.workflowContext.wf_task_id}`);

    const stepResult = await handleStepCompletion(
      task.workflowContext.wf_exec_id,
      task.workflowContext.wf_task_id,
      { output: result.output },
      result.error
    );

    if (stepResult.success) {
      console.log(`[ExecutionRunner] Workflow advanced successfully`);
      if (stepResult.complete) {
        console.log(`[ExecutionRunner] Workflow completed!`);
      } else if (stepResult.taskId) {
        console.log(`[ExecutionRunner] Next task created: ${stepResult.taskId}`);
      }
    } else {
      console.error(`[ExecutionRunner] Workflow advancement failed: ${stepResult.error}`);
    }

  } catch (error) {
    console.error(`[ExecutionRunner] Workflow advancement error:`, error);
  }
}

// Auto-start if in production environment
if (process.env.NODE_ENV === "production" || process.env.ENABLE_EXECUTION_RUNNER === "true") {
  console.log("[ExecutionRunner] Auto-starting in production mode...");
  startExecutionRunner();
}
