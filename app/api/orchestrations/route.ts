import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveAgentNames, clearAgentCache } from "@/lib/orchestration/agent-resolver";
import { startExecutionRunner } from "@/lib/orchestration/execution-runner";

export const dynamic = 'force-dynamic';

// Valid workflow statuses
const VALID_WORKFLOW_STATUSES = ["draft", "active", "paused", "archived"] as const;
type WorkflowStatus = (typeof VALID_WORKFLOW_STATUSES)[number];

// Valid workflow execution statuses
const VALID_EXECUTION_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;

/**
 * POST /api/orchestrations
 * Create a new workflow or workflow execution
 * 
 * Actions:
 * - Create workflow definition (if workflow_definition provided)
 * - Create workflow execution (if workflow_id provided - starts an orchestration)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      // Workflow definition fields
      name,
      description,
      workflow_definition,
      company_id,
      // Execution fields
      workflow_id,
      initial_input,
      triggered_by,
    } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // Action: Create workflow definition
    if (action === "create_workflow" || workflow_definition) {
      // Validation
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { success: false, error: "name is required for workflow creation" },
          { status: 400 }
        );
      }

      if (!workflow_definition || typeof workflow_definition !== "object") {
        return NextResponse.json(
          { success: false, error: "workflow_definition is required" },
          { status: 400 }
        );
      }

      // Validate workflow definition structure
      const validation = validateWorkflowDefinition(workflow_definition);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid workflow definition", details: validation.errors },
          { status: 400 }
        );
      }

      // Create workflow record
      const { data: workflow, error: workflowError } = await supabaseAdmin
        .from("workflows")
        // @ts-ignore - Supabase types not yet generated
        .insert({
          name,
          description: description || null,
          definition: workflow_definition,
          company_id: company_id || null,
          status: "draft",
        })
        .select()
        .single();

      if (workflowError) {
        console.error("[Orchestrations API] Workflow creation error:", workflowError);
        return NextResponse.json(
          { success: false, error: "Failed to create workflow", details: workflowError.message },
          { status: 500 }
        );
      }

      // ATLAS-GATE4-DEPENDENCY-FIX-320: Two-pass workflow task creation
      const tasks = workflow_definition.tasks || [];
      
      // ATLAS-GATE4-AGENT-ID-MAPPING-291: Resolve agent names to UUIDs
      const agentNames = tasks.map((t: any) => t.agent).filter(Boolean);
      const { resolved: agentMap, errors: agentErrors } = await resolveAgentNames(agentNames);
      
      if (agentErrors.length > 0) {
        // Unknown agent(s) - return error before creating workflow
        return NextResponse.json(
          { 
            success: false, 
            error: "Unknown agent(s) in workflow definition", 
            details: agentErrors 
          },
          { status: 400 }
        );
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowData = workflow as any;
      
      // PASS 1: Insert all tasks without dependencies (to get UUIDs)
      const firstPassData = tasks.map((task: any, index: number) => ({
        workflow_id: workflowData?.id,
        name: task.name,
        description: task.description || null,
        // ATLAS-GATE4-AGENT-ID-MAPPING-291: Resolve agent name → UUID
        agent_id: task.agent ? agentMap.get(task.agent) || null : null,
        dependencies: [], // Empty initially - will update in pass 2
        execution_order: task.execution_order ?? index,
        status: task.dependencies && task.dependencies.length > 0 ? "waiting" : "pending",
        input_mapping: task.input_mapping || {},
        output_mapping: task.output_mapping || {},
        config_overrides: task.config_overrides || {},
      }));

      let taskNameToIdMap = new Map<string, string>();
      let tasksCreated = 0;
      
      if (firstPassData.length > 0) {
        const { data: insertedTasks, error: tasksError } = await supabaseAdmin
          .from("workflow_tasks")
          // @ts-ignore - Supabase types not yet generated
          .insert(firstPassData)
          .select("id,name");

        if (tasksError) {
          console.error("[Orchestrations API] Workflow tasks creation error:", tasksError);
          return NextResponse.json(
            { success: false, error: "Failed to create workflow tasks", details: tasksError.message },
            { status: 500 }
          );
        }

        // Build name → ID mapping for second pass
        if (insertedTasks) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          insertedTasks.forEach((t: any) => {
            taskNameToIdMap.set(t.name, t.id);
          });
          tasksCreated = insertedTasks.length;
        }

        // PASS 2: Update tasks with dependency UUIDs
        // Build dependency updates
        const dependencyUpdates: { id: string; dependencies: string[] }[] = [];
        tasks.forEach((task: any) => {
          if (task.dependencies && task.dependencies.length > 0) {
            const taskId = taskNameToIdMap.get(task.name);
            if (taskId) {
              const depIds = task.dependencies
                .map((depName: string) => taskNameToIdMap.get(depName))
                .filter((id: string | undefined): id is string => Boolean(id));
              if (depIds.length > 0) {
                dependencyUpdates.push({ id: taskId, dependencies: depIds });
              }
            }
          }
        });

        // Apply dependency updates
        for (const update of dependencyUpdates) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabaseAdmin as any)
            .from("workflow_tasks")
            .update({ dependencies: update.dependencies })
            .eq("id", update.id);
          
          if (updateError) {
            console.error("[Orchestrations API] Failed to update dependencies for task", update.id, updateError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        workflow,
        tasks_created: tasksCreated,
        task_name_map_size: taskNameToIdMap.size,
        timestamp: new Date().toISOString(),
      }, { status: 201 });
    }

    // Action: Start workflow execution (orchestration)
    if (action === "start" || workflow_id) {
      if (!workflow_id) {
        return NextResponse.json(
          { success: false, error: "workflow_id is required to start execution" },
          { status: 400 }
        );
      }

      // Fetch workflow
      const { data: workflow, error: workflowError } = await supabaseAdmin
        .from("workflows")
        .select("id, name, definition, company_id, status")
        .eq("id", workflow_id)
        .single();

      if (workflowError || !workflow) {
        return NextResponse.json(
          { success: false, error: "Workflow not found" },
          { status: 404 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowData = workflow as any;

      // Check workflow is active
      if (workflowData.status !== "active" && workflowData.status !== "draft") {
        return NextResponse.json(
          { success: false, error: `Cannot start workflow with status: ${workflowData.status}` },
          { status: 400 }
        );
      }

      // Fetch workflow tasks
      const { data: workflowTasks, error: tasksError } = await supabaseAdmin
        .from("workflow_tasks")
        .select("*")
        .eq("workflow_id", workflow_id)
        .order("execution_order", { ascending: true });

      if (tasksError) {
        console.error("[Orchestrations API] Fetch workflow tasks error:", tasksError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch workflow tasks" },
          { status: 500 }
        );
      }

      // Create execution record
      const { data: execution, error: executionError } = await supabaseAdmin
        .from("workflow_executions")
        // @ts-ignore - Supabase types not yet generated
        .insert({
          workflow_id,
          status: "pending",
          initial_input: initial_input || {},
          total_tasks: workflowTasks?.length || 0,
          completed_tasks: 0,
          failed_tasks: 0,
          company_id: workflowData.company_id,
          triggered_by: triggered_by || null,
          execution_context: {
            workflow_name: workflowData.name,
            tasks: workflowTasks?.map((t: any) => ({ id: t.id, name: t.name, status: t.status })) || [],
          },
        })
        .select()
        .single();

      if (executionError) {
        console.error("[Orchestrations API] Execution creation error:", executionError);
        return NextResponse.json(
          { success: false, error: "Failed to create execution", details: executionError.message },
          { status: 500 }
        );
      }

      // ATLAS-GATE4-PICKUP-BRIDGE-351: Dispatch first task to execution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let createdTask: any = null;
      
      if (workflowTasks && workflowTasks.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstTask = workflowTasks[0] as any;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executionData = execution as any;

        // Update execution to running
        await supabaseAdmin
          .from("workflow_executions")
          // @ts-ignore
          .update({
            status: "running",
            started_at: new Date().toISOString(),
            current_task_id: firstTask?.id,
          })
          .eq("id", executionData?.id);

        // ATLAS-GATE4-PICKUP-BRIDGE-351: Create actual task for Gate 2 claim/execution
        // Bridge workflow_task → real task for Gate 2 execution
        // Store workflow context in description as JSON (command_id has FK constraint)
        const workflowContext = JSON.stringify({
          wf_exec_id: executionData?.id,
          wf_task_id: firstTask.id,
          is_wf_step: true,
        });
        
        const { data: createdTaskData, error: taskError } = await supabaseAdmin
          .from("tasks")
          // @ts-ignore
          .insert({
            title: `[WF] ${firstTask.name}`,
            description: `${firstTask.description || `Workflow step: ${firstTask.name}`}\n<!--WF:${workflowContext}-->`,
            status: "inbox",  // MUST be "inbox" for Gate 2 claim mechanism
            task_type: "implementation",
            assigned_agent_id: firstTask.agent_id,
            company_id: workflowData.company_id,
            task_order: firstTask.execution_order ?? 0,
          })
          .select()
          .single();

        if (taskError) {
          console.error("[Orchestrations API] Failed to create task for workflow step:", taskError);
          // ATLAS-GATE4-PICKUP-BRIDGE-351: Return error so caller knows bridge failed
          return NextResponse.json({
            success: false,
            error: "Failed to create task for workflow step",
            details: taskError.message,
            workflow,
            execution: executionData,
          }, { status: 500 });
        }
        
        if (createdTaskData) {
          createdTask = createdTaskData;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createdTaskDataTyped = createdTaskData as any;
          
          // Link workflow_task to real task and mark as in_progress
          await supabaseAdmin
            .from("workflow_tasks")
            // @ts-ignore
            .update({
              status: "in_progress",
              task_id: createdTaskDataTyped.id,
              started_at: new Date().toISOString(),
            })
            .eq("id", firstTask?.id);

          // Update execution context with task link
          await supabaseAdmin
            .from("workflow_executions")
            // @ts-ignore
            .update({
              context_data: {
                current_task_id: createdTaskDataTyped.id,
                workflow_task_id: firstTask.id,
                step_name: firstTask.name,
              },
            })
            .eq("id", executionData?.id);

          // ATLAS-GATE4-EXECUTION-RUNNER-380: Auto-create execution record for runner
          console.log(`[Orchestrations API] Creating execution record for runner...`);
          const { data: execRecord, error: execError } = await supabaseAdmin
            .from("executions")
            .insert({
              task_id: createdTaskDataTyped.id,
              agent_id: firstTask.agent_id,
              status: "in_progress",
              started_at: new Date().toISOString(),
            } as any)
            .select()
            .single();

          if (execError) {
            console.error(`[Orchestrations API] Failed to create execution record:`, execError);
          } else {
            console.log(`[Orchestrations API] Execution record created: ${(execRecord as any)?.id}`);
            // Update task with execution_id
            await supabaseAdmin
              .from("tasks")
              // @ts-ignore
              .update({
                status: "in_progress",
                execution_id: (execRecord as any)?.id,
              })
              .eq("id", createdTaskDataTyped.id);
          }
        }
      } else {
        // No tasks - mark as completed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executionData = execution as any;
        await supabaseAdmin
          .from("workflow_executions")
          // @ts-ignore
          .update({
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionData?.id);
      }

      // Fetch updated execution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executionData = execution as any;
      const { data: updatedExecution } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", executionData?.id)
        .single();

      // ATLAS-GATE4-PICKUP-BRIDGE-351: Include dispatched task info in response

      // ATLAS-GATE4-EXECUTION-RUNNER-380: Start execution runner if not already running
      try {
        console.log("[Orchestrations API] Starting execution runner...");
        startExecutionRunner();
      } catch (runnerError) {
        console.error("[Orchestrations API] Failed to start execution runner:", runnerError);
        // Don't fail the request if runner fails to start
      }
      
      return NextResponse.json({
        success: true,
        execution: updatedExecution || execution,
        workflow: workflowData,
        tasks: workflowTasks || [],
        dispatched_task: createdTask ? {
          id: createdTask.id,
          title: createdTask.title,
          status: createdTask.status,
          assigned_agent_id: createdTask.assigned_agent_id,
        } : null,
        bridge_status: createdTask ? "dispatched" : "failed",
        runner_status: "started",
        timestamp: new Date().toISOString(),
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'create_workflow' or 'start'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Orchestrations API] POST exception:", error);
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
 * GET /api/orchestrations
 * List workflows or executions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "workflows"; // "workflows" or "executions"
    const workflowId = searchParams.get("workflow_id");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabaseAdmin = getSupabaseAdmin();

    if (type === "workflows") {
      let query = supabaseAdmin
        .from("workflows")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[Orchestrations API] GET workflows error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch workflows" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        workflows: data || [],
        count: data?.length || 0,
        total: count || 0,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "executions") {
      let query = supabaseAdmin
        .from("workflow_executions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[Orchestrations API] GET executions error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch executions" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        executions: data || [],
        count: data?.length || 0,
        total: count || 0,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Use 'workflows' or 'executions'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Orchestrations API] GET exception:", error);
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

// Helper function to validate workflow definition
function validateWorkflowDefinition(def: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!def) {
    errors.push("Definition is required");
    return { valid: false, errors };
  }

  // Check tasks array
  if (!def.tasks || !Array.isArray(def.tasks)) {
    errors.push("Definition must have a 'tasks' array");
    return { valid: false, errors };
  }

  if (def.tasks.length === 0) {
    errors.push("Workflow must have at least one task");
  }

  // Validate each task
  const taskNames = new Set<string>();
  for (let i = 0; i < def.tasks.length; i++) {
    const task = def.tasks[i];
    
    if (!task.name || typeof task.name !== "string") {
      errors.push(`Task ${i}: name is required and must be a string`);
    } else if (taskNames.has(task.name)) {
      errors.push(`Task ${i}: duplicate name '${task.name}'`);
    } else {
      taskNames.add(task.name);
    }

    // Validate dependencies reference existing tasks (by name for now)
    if (task.dependencies && Array.isArray(task.dependencies)) {
      for (const dep of task.dependencies) {
        // Dependencies will be validated after all tasks are processed
        // For now just check it's a string
        if (typeof dep !== "string") {
          errors.push(`Task ${i}: dependencies must be strings (task names)`);
        }
      }
    }
  }

  // Check dependency references
  for (let i = 0; i < def.tasks.length; i++) {
    const task = def.tasks[i];
    if (task.dependencies && Array.isArray(task.dependencies)) {
      for (const dep of task.dependencies) {
        if (!taskNames.has(dep)) {
          errors.push(`Task ${i}: dependency '${dep}' not found`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
