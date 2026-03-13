/**
 * Gate 4: Minimal Dependency Resolver
 * ATLAS-GATE4-MVP-241
 * 
 * Implements sequential execution only (no parallel yet)
 * Constraints:
 * - Sequential orchestration only
 * - No scheduler integration
 * - No webhook triggers
 * - No advanced routing
 */

export interface WorkflowTask {
  id: string;
  workflow_id: string;
  name: string;
  description?: string;
  agent_id?: string;
  dependencies: string[]; // Array of task IDs
  execution_order: number;
  status: TaskStatus;
  input_mapping?: Record<string, any>;
  output_mapping?: Record<string, any>;
  config_overrides?: Record<string, any>;
  task_id?: string; // Reference to tasks table
}

export type TaskStatus = 
  | "pending"
  | "waiting"
  | "ready"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  current_task_id?: string;
  completed_tasks: number;
  total_tasks: number;
  failed_tasks: number;
  execution_context?: {
    task_outputs?: Record<string, any>;
    [key: string]: any;
  };
}

export type ExecutionStatus = 
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface DependencyGraph {
  tasks: Map<string, WorkflowTask>;
  edges: Map<string, Set<string>>; // taskId -> set of dependent task IDs
}

/**
 * Build a dependency graph from workflow tasks
 */
export function buildDependencyGraph(tasks: WorkflowTask[]): DependencyGraph {
  const taskMap = new Map<string, WorkflowTask>();
  const edges = new Map<string, Set<string>>();

  // Build task map
  for (const task of tasks) {
    taskMap.set(task.id, task);
    edges.set(task.id, new Set());
  }

  // Build reverse edges (who depends on this task)
  for (const task of tasks) {
    for (const depId of task.dependencies || []) {
      if (edges.has(depId)) {
        edges.get(depId)!.add(task.id);
      }
    }
  }

  return { tasks: taskMap, edges };
}

/**
 * Check if a task is ready to execute
 * A task is ready when all its dependencies are completed
 */
export function isTaskReady(task: WorkflowTask, completedTaskIds: Set<string>): boolean {
  // If no dependencies, it's ready
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }

  // Check all dependencies are completed
  return task.dependencies.every(depId => completedTaskIds.has(depId));
}

/**
 * Get tasks that are ready to execute
 * (All dependencies satisfied)
 */
export function getReadyTasks(
  tasks: WorkflowTask[],
  completedTaskIds: Set<string>,
  inProgressTaskIds: Set<string>
): WorkflowTask[] {
  return tasks.filter(task => {
    // Skip already processing or completed tasks
    if (completedTaskIds.has(task.id) || inProgressTaskIds.has(task.id)) {
      return false;
    }
    
    // Check if all dependencies are met
    return isTaskReady(task, completedTaskIds);
  });
}

/**
 * Resolve execution order for sequential execution
 * Uses topological sort with fallback to execution_order field
 * 
 * For MVP: Sequential only - returns single task at a time
 */
export function resolveSequentialOrder(tasks: WorkflowTask[]): string[] {
  const graph = buildDependencyGraph(tasks);
  const visited = new Set<string>();
  const order: string[] = [];

  // First pass: respect execution_order if no dependencies
  const sortedByOrder = [...tasks].sort((a, b) => {
    // Tasks with no dependencies go first by execution_order
    const aDeps = a.dependencies?.length || 0;
    const bDeps = b.dependencies?.length || 0;
    
    if (aDeps === 0 && bDeps === 0) {
      return (a.execution_order || 0) - (b.execution_order || 0);
    }
    
    // Tasks with dependencies come after
    return aDeps - bDeps;
  });

  // Visit function for DFS
  function visit(taskId: string, visiting = new Set<string>()) {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected involving task: ${taskId}`);
    }

    visiting.add(taskId);
    const task = graph.tasks.get(taskId);
    
    if (task) {
      // Visit dependencies first
      for (const depId of task.dependencies || []) {
        if (graph.tasks.has(depId)) {
          visit(depId, visiting);
        }
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    order.push(taskId);
  }

  // Visit all tasks
  for (const task of sortedByOrder) {
    if (!visited.has(task.id)) {
      visit(task.id);
    }
  }

  return order;
}

/**
 * Get the next task to execute in sequential mode
 * Returns null if workflow is complete or blocked
 */
export function getNextSequentialTask(
  tasks: WorkflowTask[],
  completedTaskIds: Set<string>,
  failedTaskIds: Set<string>
): WorkflowTask | null {
  // If any task failed, workflow is blocked
  if (failedTaskIds.size > 0) {
    return null;
  }

  // Get execution order
  const order = resolveSequentialOrder(tasks);

  // Find first incomplete task
  for (const taskId of order) {
    if (!completedTaskIds.has(taskId)) {
      const task = tasks.find(t => t.id === taskId);
      if (task && isTaskReady(task, completedTaskIds)) {
        return task;
      }
    }
  }

  // All tasks completed
  return null;
}

/**
 * Detect circular dependencies in workflow
 */
export function detectCircularDependencies(tasks: WorkflowTask[]): string[][] {
  const graph = buildDependencyGraph(tasks);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, path: string[]) {
    if (recStack.has(node)) {
      // Found cycle - extract it
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat([node]));
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recStack.add(node);

    const task = graph.tasks.get(node);
    if (task) {
      for (const depId of task.dependencies || []) {
        if (graph.tasks.has(depId)) {
          dfs(depId, [...path, node]);
        }
      }
    }

    recStack.delete(node);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }

  return cycles;
}

/**
 * Validate workflow definition for execution
 * Returns validation result with errors if any
 */
export function validateWorkflowForExecution(tasks: WorkflowTask[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for empty workflow
  if (!tasks || tasks.length === 0) {
    errors.push("Workflow has no tasks");
    return { valid: false, errors };
  }

  // Check for duplicate task IDs
  const taskIds = new Set<string>();
  for (const task of tasks) {
    if (taskIds.has(task.id)) {
      errors.push(`Duplicate task ID: ${task.id}`);
    }
    taskIds.add(task.id);
  }

  // Check for invalid dependencies
  for (const task of tasks) {
    for (const depId of task.dependencies || []) {
      if (!taskIds.has(depId)) {
        errors.push(`Task '${task.name}' has invalid dependency: ${depId}`);
      }
    }
  }

  // Check for circular dependencies
  const cycles = detectCircularDependencies(tasks);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push(`Circular dependency detected: ${cycle.join(" -> ")}`);
    }
  }

  // Check for tasks without names
  for (const task of tasks) {
    if (!task.name || task.name.trim() === "") {
      errors.push(`Task ${task.id} has no name`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build input for a task based on input_mapping and previous task outputs
 */
export function buildTaskInput(
  task: WorkflowTask,
  executionContext: Record<string, any>
): Record<string, any> {
  const input: Record<string, any> = {};
  const taskOutputs = executionContext.task_outputs || {};

  if (!task.input_mapping) {
    return input;
  }

  for (const [targetKey, source] of Object.entries(task.input_mapping)) {
    if (typeof source === "string" && source.startsWith("$")) {
      // Reference to another task's output: $taskId.outputKey
      const match = source.match(/^\$([^.]+)\.(.+)$/);
      if (match) {
        const [, sourceTaskId, outputKey] = match;
        const sourceOutput = taskOutputs[sourceTaskId];
        if (sourceOutput && outputKey in sourceOutput) {
          input[targetKey] = sourceOutput[outputKey];
        }
      }
    } else if (source === "$initial") {
      // Reference to initial workflow input
      input[targetKey] = executionContext.initial_input;
    } else {
      // Static value
      input[targetKey] = source;
    }
  }

  return input;
}

/**
 * Update execution context with task output
 */
export function updateExecutionContext(
  context: Record<string, any>,
  taskId: string,
  output: Record<string, any>
): Record<string, any> {
  return {
    ...context,
    task_outputs: {
      ...context.task_outputs,
      [taskId]: output,
    },
  };
}

/**
 * Calculate workflow progress percentage
 */
export function calculateProgress(
  completedTasks: number,
  totalTasks: number
): number {
  if (totalTasks === 0) return 100;
  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Check if workflow execution is complete
 */
export function isExecutionComplete(
  tasks: WorkflowTask[],
  completedTaskIds: Set<string>,
  failedTaskIds: Set<string>
): {
  complete: boolean;
  success: boolean;
  blocked: boolean;
} {
  const allCompleted = tasks.every(t => 
    completedTaskIds.has(t.id) || failedTaskIds.has(t.id)
  );

  if (failedTaskIds.size > 0) {
    return { complete: true, success: false, blocked: true };
  }

  if (allCompleted) {
    return { complete: true, success: true, blocked: false };
  }

  return { complete: false, success: false, blocked: false };
}
