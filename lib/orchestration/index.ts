/**
 * Gate 4: Orchestration Module
 * ATLAS-GATE4-MVP-241
 * 
 * Exports for workflow orchestration functionality
 */

// Agent Resolver - ATLAS-GATE4-AGENT-ID-MAPPING-291
export {
  resolveAgentName,
  resolveAgentNames,
  clearAgentCache,
  getAgentCacheStats,
} from "./agent-resolver";

// Dependency Resolver - Types
export type {
  WorkflowTask,
  WorkflowExecution,
  TaskStatus,
  ExecutionStatus,
  DependencyGraph,
} from "./dependency-resolver";

// Dependency Resolver - Functions
export {
  buildDependencyGraph,
  isTaskReady,
  getReadyTasks,
  resolveSequentialOrder,
  getNextSequentialTask,
  detectCircularDependencies,
  validateWorkflowForExecution,
  buildTaskInput,
  updateExecutionContext,
  calculateProgress,
  isExecutionComplete,
} from "./dependency-resolver";

// Orchestration Engine - Types
export type {
  OrchestrationStepResult,
} from "./engine";

// Orchestration Engine - Functions
export {
  initializeWorkflowExecution,
  handleStepCompletion,
  onGate2ExecutionComplete,
  getExecutionState,
} from "./engine";
