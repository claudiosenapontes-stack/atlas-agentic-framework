// Command Bus for Atlas - Phase 3B
// Command classification, deterministic agent routing, and canonical events

import { getSupabaseAdmin } from './supabase-admin';

// ============================================================================
// MODEL ROUTING (Preserved from requirements)
// ============================================================================
const MODEL_ROUTING = {
  // Kimi K2 (fast, cheap) for routine operations
  heartbeat: 'openrouter/moonshotai/kimi-k2',
  cron: 'openrouter/moonshotai/kimi-k2',
  report: 'openrouter/moonshotai/kimi-k2',
  health_check: 'openrouter/moonshotai/kimi-k2',
  query_status: 'openrouter/moonshotai/kimi-k2',
  
  // Kimi K2.5 (premium) for main user requests
  telegram_request: 'openrouter/moonshotai/kimi-k2.5',
  spawn_agent: 'openrouter/moonshotai/kimi-k2.5',
  deploy: 'openrouter/moonshotai/kimi-k2.5',
  create_task: 'openrouter/moonshotai/kimi-k2.5',
  investigate: 'openrouter/moonshotai/kimi-k2.5',
  implement: 'openrouter/moonshotai/kimi-k2.5',
  review: 'openrouter/moonshotai/kimi-k2.5',
  analyze: 'openrouter/moonshotai/kimi-k2.5',
};

// ============================================================================
// DETERMINISTIC AGENT ROUTING MATRIX
// ============================================================================
const AGENT_ROUTING: Record<string, { agent: string; reason: string }> = {
  // Finance operations
  budget: { agent: 'harvey', reason: 'financial_analysis_required' },
  finance: { agent: 'harvey', reason: 'financial_analysis_required' },
  cost: { agent: 'harvey', reason: 'financial_analysis_required' },
  pricing: { agent: 'harvey', reason: 'financial_analysis_required' },
  invoice: { agent: 'harvey', reason: 'financial_analysis_required' },
  
  // Research and analysis
  research: { agent: 'einstein', reason: 'research_deep_dive_required' },
  analyze: { agent: 'einstein', reason: 'research_deep_dive_required' },
  investigate: { agent: 'einstein', reason: 'research_deep_dive_required' },
  study: { agent: 'einstein', reason: 'research_deep_dive_required' },
  
  // Marketing
  marketing: { agent: 'sophia', reason: 'marketing_strategy_required' },
  brand: { agent: 'sophia', reason: 'marketing_strategy_required' },
  campaign: { agent: 'sophia', reason: 'marketing_strategy_required' },
  social: { agent: 'sophia', reason: 'marketing_strategy_required' },
  content: { agent: 'sophia', reason: 'marketing_strategy_required' },
  
  // Infrastructure / DevOps
  deploy: { agent: 'severino', reason: 'infrastructure_operation_required' },
  server: { agent: 'severino', reason: 'infrastructure_operation_required' },
  infrastructure: { agent: 'severino', reason: 'infrastructure_operation_required' },
  hosting: { agent: 'severino', reason: 'infrastructure_operation_required' },
  database: { agent: 'severino', reason: 'infrastructure_operation_required' },
  
  // Technical implementation
  code: { agent: 'optimus', reason: 'technical_implementation_required' },
  implement: { agent: 'optimus', reason: 'technical_implementation_required' },
  build: { agent: 'optimus', reason: 'technical_implementation_required' },
  develop: { agent: 'optimus', reason: 'technical_implementation_required' },
  feature: { agent: 'optimus', reason: 'technical_implementation_required' },
  bug: { agent: 'optimus', reason: 'technical_implementation_required' },
  fix: { agent: 'optimus', reason: 'technical_implementation_required' },
  
  // Complex technical architecture
  architecture: { agent: 'prime', reason: 'senior_technical_design_required' },
  refactor: { agent: 'prime', reason: 'senior_technical_design_required' },
  redesign: { agent: 'prime', reason: 'senior_technical_design_required' },
  optimize: { agent: 'prime', reason: 'senior_technical_design_required' },
  scale: { agent: 'prime', reason: 'senior_technical_design_required' },
  
  // Executive/operations coordination
  coordinate: { agent: 'henry', reason: 'operational_coordination_required' },
  orchestrate: { agent: 'henry', reason: 'operational_coordination_required' },
  manage: { agent: 'henry', reason: 'operational_coordination_required' },
  sync: { agent: 'henry', reason: 'operational_coordination_required' },
  
  // Administrative/EA tasks
  schedule: { agent: 'olivia', reason: 'executive_assistance_required' },
  calendar: { agent: 'olivia', reason: 'executive_assistance_required' },
  meeting: { agent: 'olivia', reason: 'executive_assistance_required' },
  organize: { agent: 'olivia', reason: 'executive_assistance_required' },
  prepare: { agent: 'olivia', reason: 'executive_assistance_required' },
  email: { agent: 'olivia', reason: 'communication_management_required' },
  gmail: { agent: 'olivia', reason: 'communication_management_required' },
  notify: { agent: 'olivia', reason: 'notification_delivery_required' },
  document: { agent: 'olivia', reason: 'document_management_required' },
  
  // Code review specific (distinguish from general review)
  'code review': { agent: 'prime', reason: 'senior_code_review_required' },
  'pr review': { agent: 'prime', reason: 'senior_code_review_required' },
  'pull request': { agent: 'prime', reason: 'senior_code_review_required' },
};

// ============================================================================
// TRUE DIRECT EXECUTION LANE - ATLAS-OPTIMUS-TRUE-DIRECT-EXECUTION-LANE-001
// ============================================================================

/**
 * Check if a command should use TRUE direct execution (bypass worker pipeline)
 * Returns the agent name if direct, null if should use standard pipeline
 */
export function detectDirectExecutionAgent(commandText: string): string | null {
  if (!commandText) return null;
  
  const text = commandText.trim();
  const lowerText = text.toLowerCase();
  
  // Explicit DIRECT: prefix always triggers direct mode
  if (/^DIRECT:/i.test(text)) {
    // Extract agent name after DIRECT: if present
    const afterPrefix = text.replace(/^DIRECT:/i, '').trim();
    for (const agent of AGENT_NAMES) {
      if (afterPrefix.toLowerCase().startsWith(agent)) {
        return agent;
      }
    }
    // If no agent specified but DIRECT: used, default to henry
    return 'henry';
  }
  
  // Check for agent name at the very start (e.g., "Henry ping", "Olivia schedule")
  const words = lowerText.split(/\s+/);
  if (words.length >= 2) {
    const firstWord = words[0];
    if (AGENT_NAMES.includes(firstWord)) {
      // Check if this is a simple command (not complex)
      const afterAgent = words.slice(1).join(' ').toLowerCase();
      
      // Simple patterns suitable for direct execution
      const simplePatterns = [
        /^ping$/i,
        /^status$/i,
        /^hello$/i,
        /^hi$/i,
        /^help$/i,
        /^audit/i,
        /^report/i,
        /^check/i,
        /^show/i,
        /^list/i,
        /^get/i,
        /^what\s+/i,
        /^who\s+/i,
        /^when\s+/i,
        /^where\s+/i,
        /^how\s+/i,
        /^tell\s+me/i,
        /^return/i,
        /^echo/i,
        /^monitor/i,
        /^verify/i,
        /^confirm/i,
        /^summarize/i,
        /^summary/i,
      ];
      
      // Complex patterns that should NOT be direct
      const complexPatterns = [
        /implement/i,
        /create\s+(a|an)\s+(new|full)/i,
        /build\s+(a|an)/i,
        /develop/i,
        /deploy/i,
        /mission/i,
        /project/i,
        /workflow/i,
        /schedule.*recurring/i,
        /every\s+(day|week|hour)/i,
        /coordinate\s+with/i,
        /orchestrate/i,
        /multiple\s+agents/i,
        /subtask/i,
        /child\s+task/i,
      ];
      
      const isSimple = simplePatterns.some(p => p.test(afterAgent));
      const isComplex = complexPatterns.some(p => p.test(afterAgent));
      
      if (isSimple && !isComplex) {
        return firstWord;
      }
    }
  }
  
  return null;
}

/**
 * Check if command is a direct command (for API responses)
 */
export function isDirectCommand(commandText: string): boolean {
  return detectDirectExecutionAgent(commandText) !== null;
}

// ============================================================================
// RISK MATRIX
// ============================================================================
const RISK_MATRIX: Record<string, { level: string; threshold: number }> = {
  kill_agent: { level: 'high', threshold: 0 },
  deploy: { level: 'high', threshold: 0 },
  spawn_agent: { level: 'medium', threshold: 5 },
  create_task: { level: 'low', threshold: 100 },
  query_status: { level: 'low', threshold: Infinity },
  heartbeat: { level: 'low', threshold: Infinity },
  report: { level: 'low', threshold: Infinity },
};

// ============================================================================
// INTERFACES
// ============================================================================
export interface CommandInput {
  sourceChannel: 'telegram' | 'mission_control' | 'cron' | 'webhook' | 'api';
  sourceUserId?: string;
  sourceMessageId?: string;
  companyId: string;
  commandText: string;
  metadata?: Record<string, unknown>;
  mode?: 'direct' | 'mission'; // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
}

export interface ClassifiedCommand {
  commandType: string;
  parsedIntent: Record<string, unknown>;
  targetModel: string;
  targetAgent: string;
  routingReason: string;
  riskLevel: string;
  requiresApproval: boolean;
  estimatedCost: number;
}

export interface TaskDependency {
  dependsOnTaskId: string;
  dependencyType: 'blocking' | 'non_blocking';
}

// ============================================================================
// EVENT LOGGING
// ============================================================================
export async function logEvent(params: {
  eventType: string;
  actorType: 'user' | 'agent' | 'system' | 'cron';
  actorId: string;
  companyId: string;
  targetType?: 'command' | 'task' | 'agent_run' | 'approval';
  targetId?: string;
  routedToAgentId?: string;
  routingReason?: string;
  modelUsed?: string;
  payload?: Record<string, unknown>;
  sourceChannel?: string;
}) {
  try {
    await (getSupabaseAdmin() as any)
      .from('events')
      .insert({
        company_id: params.companyId,
        event_type: params.eventType,
        actor_type: params.actorType,
        actor_id: params.actorId,
        target_type: params.targetType,
        target_id: params.targetId,
        routed_to_agent_id: params.routedToAgentId,
        routing_reason: params.routingReason,
        model_used: params.modelUsed,
        payload: params.payload || {},
        source_channel: params.sourceChannel,
      });
  } catch (error) {
    console.error('[EventLog] Failed to log event:', error);
  }
}

// ============================================================================
// MODE DETECTION (ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001)
// ============================================================================
function determineExecutionMode(text: string, explicitMode?: string): 'direct' | 'mission' {
  // If explicit mode provided, use it
  if (explicitMode === 'mission') return 'mission';
  if (explicitMode === 'direct') return 'direct';
  
  const t = text.toLowerCase();
  
  // Mission mode indicators - only trigger when explicitly complex
  const missionIndicators = [
    'mission:',
    'mission mode',
    'orchestrate',
    'coordinate multiple',
    'parallel tasks',
    'child tasks',
    'subtasks:',
    'decompose',
    'break down into',
    'assign to multiple',
    'team effort',
  ];
  
  for (const indicator of missionIndicators) {
    if (t.includes(indicator)) return 'mission';
  }
  
  // Default: DIRECT mode for all Telegram/simple commands
  return 'direct';
}

// ============================================================================
// COMMAND CLASSIFICATION
// ============================================================================
function classifyCommand(text: string, sourceChannel: string): ClassifiedCommand {
  const t = text.toLowerCase();
  
  console.log('[Classify] Processing command:', text.slice(0, 60));
  
  // Determine base command type
  let commandType = 'create_task';
  let parsedIntent: Record<string, unknown> = { action: 'create', description: text };
  
  if (t.includes('deploy') || t.includes('release') || t.includes('ship')) {
    commandType = 'deploy';
    parsedIntent = { action: 'deploy', target: extractTarget(t) };
  } else if (t.includes('report') || t.includes('summary') || t.includes('status update')) {
    commandType = 'report';
    parsedIntent = { action: 'report', topic: extractTopic(t) };
  } else if (t.includes('health') || t.includes('status') || t.includes('check')) {
    commandType = 'query_status';
    parsedIntent = { action: 'query', target: extractTarget(t) };
  } else if (t.includes('spawn') || t.includes('start agent') || t.includes('create agent')) {
    commandType = 'spawn_agent';
    parsedIntent = { action: 'spawn', agent_type: extractAgentType(t) };
  } else if (t.includes('kill') || t.includes('stop agent') || t.includes('terminate')) {
    commandType = 'kill_agent';
    parsedIntent = { action: 'kill', target_agent: extractTarget(t) };
  } else if (t.includes('analyze') || t.includes('analysis')) {
    commandType = 'analyze';
    parsedIntent = { action: 'analyze', target: extractTarget(t) };
  } else if (t.includes('investigate') || t.includes('debug') || t.includes('troubleshoot')) {
    commandType = 'investigate';
    parsedIntent = { action: 'investigate', target: extractTarget(t), issue: extractIssue(t) };
  } else if (t.includes('implement') || t.includes('build') || t.includes('create feature')) {
    commandType = 'implement';
    parsedIntent = { action: 'implement', feature: extractFeature(t) };
  } else if (t.includes('review') || t.includes('audit') || t.includes('examine')) {
    commandType = 'review';
    parsedIntent = { action: 'review', target: extractTarget(t) };
  }
  
  console.log('[Classify] Detected intent:', commandType);
  
  // Determine target agent (deterministic routing with logging)
  const { agent, reason } = determineAgent(text, commandType, sourceChannel);
  
  console.log('[Classify] Routing decision:', { agent, reason });
  
  // Determine model based on source and command type
  const model = determineModel(commandType, sourceChannel);
  
  // Determine risk
  const risk = RISK_MATRIX[commandType] || { level: 'low', threshold: Infinity };
  
  return {
    commandType,
    parsedIntent: {
      ...parsedIntent,
      detected_intent: commandType,
      routing_decision: { agent, reason },
    },
    targetModel: model,
    targetAgent: agent,
    routingReason: reason,
    riskLevel: risk.level,
    requiresApproval: risk.level === 'high',
    estimatedCost: estimateCost(commandType, model),
  };
}

// ============================================================================
// EXPLICIT AGENT DETECTION
// ============================================================================
const AGENT_NAMES = ['henry', 'harvey', 'einstein', 'sophia', 'severino', 'olivia', 'optimus', 'prime'];

function extractExplicitAgent(text: string): { agent: string; reason: string } | null {
  const t = text.toLowerCase();
  
  // Pattern 1: "for [Agent]" or "to [Agent]"
  const forPattern = /\b(?:for|to|assign to|assign|ask|tell|have)\s+(\w+)\b/i;
  const forMatch = t.match(forPattern);
  if (forMatch) {
    const name = forMatch[1].toLowerCase();
    if (AGENT_NAMES.includes(name)) {
      return { agent: name, reason: `explicit_agent_mention_via_preposition: "${forMatch[0]}"` };
    }
  }
  
  // Pattern 2: Direct agent name at start or after punctuation
  const directPattern = /^(?:\w+\s+)?(\w+)(?:\s+(?:to|that|about|the))/i;
  const directMatch = t.match(directPattern);
  if (directMatch) {
    const name = directMatch[1].toLowerCase();
    if (AGENT_NAMES.includes(name)) {
      return { agent: name, reason: `explicit_agent_mention_at_start: "${directMatch[1]}"` };
    }
  }
  
  // Pattern 3: Context-aware routing - if agent name appears before action keywords
  for (const agentName of AGENT_NAMES) {
    // Check if agent name appears early in the command (first 5 words)
    const words = t.split(/\s+/).slice(0, 5);
    if (words.includes(agentName)) {
      return { agent: agentName, reason: `explicit_agent_mention_in_opening: "${agentName}"` };
    }
  }
  
  return null;
}

function determineAgent(text: string, commandType: string, sourceChannel: string): { agent: string; reason: string } {
  const t = text.toLowerCase();
  
  // PRIORITY 1: Check for explicit agent mentions (highest priority)
  const explicitAgent = extractExplicitAgent(text);
  if (explicitAgent) {
    console.log('[Routing] Explicit agent detected:', explicitAgent.agent, '-', explicitAgent.reason);
    return explicitAgent;
  }
  
  // PRIORITY 2: Context-aware keyword routing
  // Distinguish between "review" (code review) and "review" (general assessment)
  if (t.includes('review')) {
    // Code review context
    if (t.includes('code') || t.includes('pr') || t.includes('pull request') || t.includes('merge')) {
      return { agent: 'prime', reason: 'code_review_context_detected' };
    }
    // Gmail/document review context
    if (t.includes('gmail') || t.includes('email') || t.includes('document') || t.includes('doc')) {
      return { agent: 'olivia', reason: 'document_review_assistance_required' };
    }
  }
  
  // PRIORITY 3: Standard keyword matches from AGENT_ROUTING
  for (const [keyword, route] of Object.entries(AGENT_ROUTING)) {
    if (t.includes(keyword)) {
      console.log('[Routing] Keyword match:', keyword, '→', route.agent);
      return route;
    }
  }
  
  // PRIORITY 4: Default routing based on command type
  const defaultRoutes: Record<string, { agent: string; reason: string }> = {
    deploy: { agent: 'severino', reason: 'infrastructure_deployment_default' },
    report: { agent: 'henry', reason: 'operational_report_default' },
    query_status: { agent: 'henry', reason: 'status_query_default' },
    spawn_agent: { agent: 'henry', reason: 'agent_management_default' },
    kill_agent: { agent: 'henry', reason: 'agent_management_default' },
    analyze: { agent: 'einstein', reason: 'analysis_default' },
    investigate: { agent: 'einstein', reason: 'investigation_default' },
    implement: { agent: 'optimus', reason: 'implementation_default' },
    review: { agent: 'prime', reason: 'code_review_default' },
  };
  
  const defaultRoute = defaultRoutes[commandType];
  if (defaultRoute) {
    console.log('[Routing] Default route for command type:', commandType, '→', defaultRoute.agent);
    return defaultRoute;
  }
  
  console.log('[Routing] Fallback to Henry');
  return { agent: 'henry', reason: 'general_task_default' };
}

function determineModel(commandType: string, sourceChannel: string): string {
  // Telegram requests always use premium model
  if (sourceChannel === 'telegram') {
    return MODEL_ROUTING.telegram_request;
  }
  
  // Cron jobs use economy model
  if (sourceChannel === 'cron') {
    return MODEL_ROUTING.cron;
  }
  
  // Check specific command type
  return MODEL_ROUTING[commandType as keyof typeof MODEL_ROUTING] || MODEL_ROUTING.create_task;
}

function estimateCost(commandType: string, model: string): number {
  const baseCosts: Record<string, number> = {
    deploy: 0.01,
    report: 0.002,
    query_status: 0.0001,
    spawn_agent: 0.005,
    kill_agent: 0.001,
    analyze: 0.02,
    investigate: 0.015,
    implement: 0.03,
    review: 0.01,
    create_task: 0.01,
  };
  
  const base = baseCosts[commandType] || 0.01;
  
  // Premium models cost more
  if (model.includes('kimi-k2.5')) {
    return base * 2;
  }
  
  return base;
}

// Helper extraction functions
function extractTarget(text: string): string | null {
  const patterns = [
    /(?:deploy|release|ship|check|status of|restart|stop)\s+(?:the\s+)?([a-z0-9_-]+)/i,
    /(?:for|on|to)\s+(?:the\s+)?([a-z0-9_-]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

function extractTopic(text: string): string | null {
  const match = text.match(/(?:report on|summary of|about|regarding)\s+(.+)/i);
  return match ? match[1].trim() : null;
}

function extractAgentType(text: string): string | null {
  const pattern = /(?:spawn|start|create)\s+(?:a\s+)?(?:new\s+)?([a-z]+)\s+agent/i;
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function extractIssue(text: string): string | null {
  const match = text.match(/(?:issue|problem|error|bug)\s+(?:with|in)?\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function extractFeature(text: string): string | null {
  const match = text.match(/(?:implement|build|create)\s+(?:a\s+)?(?:new\s+)?(?:feature\s+)?(?:to\s+)?(?:for\s+)?(.+)/i);
  return match ? match[1].trim() : null;
}

// ============================================================================
// TASK CREATION WITH DEPENDENCIES
// ============================================================================
async function createTaskWithDependencies(params: {
  companyId: string;
  commandId: string;
  title: string;
  description?: string;
  taskType: string;
  assignedAgentId: string;
  priority?: string;
  parentTaskId?: string;
  dependencies?: TaskDependency[];
  status?: string;
}) {
  const supabase = getSupabaseAdmin();
  
  // DEBUG: Log FK values being inserted
  console.log('[TaskCreate] Creating task with FKs:', {
    companyId: params.companyId,
    assignedAgentId: params.assignedAgentId,
    commandId: params.commandId,
  });
  
  // Create the task
  const insertData = {
    company_id: params.companyId,
    command_id: params.commandId,
    title: params.title,
    description: params.description,
    task_type: params.taskType,
    assigned_agent_id: params.assignedAgentId,
    priority: params.priority || 'medium',
    parent_task_id: params.parentTaskId,
    status: params.status || 'pending',
  };
  
  console.log('[TaskCreate] Insert data:', JSON.stringify(insertData));
  
  const { data: task, error } = await (supabase as any)
    .from('tasks')
    .insert(insertData)
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  
  // Add dependencies if specified
  if (params.dependencies && params.dependencies.length > 0) {
    const deps = params.dependencies.map(dep => ({
      task_id: task.id,
      depends_on_task_id: dep.dependsOnTaskId,
      dependency_type: dep.dependencyType,
    }));
    
    const { error: depError } = await (supabase as any)
      .from('task_dependencies')
      .insert(deps);
      
    if (depError) {
      console.error('[TaskDeps] Failed to add dependencies:', depError);
    }
  }
  
  return task;
}

// ============================================================================
// MAIN INGEST FUNCTION
// ============================================================================
export async function ingestCommand(input: CommandInput): Promise<{ 
  commandId: string; 
  status: string;
  taskId?: string;
  routedToAgent?: string;
  executionMode?: 'direct' | 'mission'; // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
}> {
  console.log('[CommandBus] Ingesting from', input.sourceChannel, ':', input.commandText.slice(0, 50));
  
  const companyId = input.companyId || '29712e4c-a88a-4269-8adb-2802a79087a6';
  const actorId = input.sourceUserId || 'system';
  
  // Step 1: Log command received
  await logEvent({
    eventType: 'command.received',
    actorType: input.sourceChannel === 'telegram' ? 'user' : 'system',
    actorId,
    companyId,
    sourceChannel: input.sourceChannel,
    payload: { command_text: input.commandText },
  });
  
  // Step 2: Classify the command
  const classified = classifyCommand(input.commandText, input.sourceChannel);
  
  // Step 2b: Determine execution mode (ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001)
  const executionMode = determineExecutionMode(input.commandText, input.mode);
  
  console.log('[CommandBus] Classified:', classified.commandType, '->', classified.targetAgent, 'using', classified.targetModel, '| Mode:', executionMode);
  
  // Step 3: Log classification event
  await logEvent({
    eventType: 'command.classified',
    actorType: 'system',
    actorId: 'classifier',
    companyId,
    payload: {
      command_type: classified.commandType,
      target_agent: classified.targetAgent,
      target_model: classified.targetModel,
      routing_reason: classified.routingReason,
      parsed_intent: classified.parsedIntent,
      // execution_mode: executionMode, // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
      // NOTE: Column needs to be added to DB first, tracked in metadata for now
    },
  });
  
  // Step 4: Create command record
  const { data: command, error } = await (getSupabaseAdmin() as any)
    .from('commands')
    .insert({
      company_id: companyId,
      source_channel: input.sourceChannel,
      source_user_id: input.sourceUserId,
      source_message_id: input.sourceMessageId,
      command_type: classified.commandType,
      command_text: input.commandText,
      parsed_intent: classified.parsedIntent,
      target_model: classified.targetModel,
      routed_to_agent_id: classified.targetAgent,
      routing_reason: classified.routingReason,
      risk_level: classified.riskLevel,
      requires_approval: classified.requiresApproval,
      estimated_cost_usd: classified.estimatedCost,
      status: classified.requiresApproval ? 'awaiting_approval' : 'pending',
      // execution_mode: executionMode, // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
      // NOTE: Column needs to be added to DB first, tracked in metadata for now
    })
    .select()
    .single();
    
  if (error) {
    console.error('[CommandBus] Error creating command:', error);
    throw error;
  }
  
  // Step 5: If approval required, create approval request and return
  if (classified.requiresApproval) {
    await (getSupabaseAdmin() as any).from('approvals').insert({
      company_id: companyId,
      command_id: command.id,
      approval_type: mapToApprovalType(classified.commandType),
      requested_by: actorId,
      risk_level: classified.riskLevel,
      estimated_cost_usd: classified.estimatedCost,
      status: 'pending',
    });
    
    await logEvent({
      eventType: 'approval.requested',
      actorType: 'system',
      actorId: 'command_bus',
      companyId,
      targetType: 'command',
      targetId: command.id,
      payload: { risk_level: classified.riskLevel },
    });
    
    return {
      commandId: command.id,
      status: 'awaiting_approval',
    };
  }
  
  // Step 6: Create task for execution
  const taskType = mapCommandTypeToTaskType(classified.commandType);
  
  const task = await createTaskWithDependencies({
    companyId,
    commandId: command.id,
    title: `${classified.commandType}: ${input.commandText.slice(0, 80)}`,
    description: input.commandText,
    taskType,
    assignedAgentId: classified.targetAgent,
    priority: determinePriority(classified.riskLevel, input.sourceChannel),
    status: 'pending',
  });
  
  // Step 7: Log routing event
  await logEvent({
    eventType: 'command.routed',
    actorType: 'system',
    actorId: 'router',
    companyId,
    targetType: 'task',
    targetId: task.id,
    routedToAgentId: classified.targetAgent,
    routingReason: classified.routingReason,
    modelUsed: classified.targetModel,
    payload: {
      command_id: command.id,
      command_type: classified.commandType,
    },
  });
  
  // Step 8: Log task created event
  await logEvent({
    eventType: 'task.created',
    actorType: 'system',
    actorId: 'command_bus',
    companyId,
    targetType: 'task',
    targetId: task.id,
    routedToAgentId: classified.targetAgent,
    payload: {
      command_id: command.id,
      task_type: taskType,
      assigned_agent: classified.targetAgent,
    },
  });
  
  // Step 9: Update command status
  await (getSupabaseAdmin() as any)
    .from('commands')
    .update({ status: 'executing', executed_by_agent: classified.targetAgent })
    .eq('id', command.id);
  
  return {
    commandId: command.id,
    status: 'pending',
    taskId: task.id,
    routedToAgent: classified.targetAgent,
    executionMode, // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function mapToApprovalType(commandType: string): string {
  const mapping: Record<string, string> = {
    deploy: 'deployment',
    spawn_agent: 'agent_spawn',
    kill_agent: 'agent_kill',
  };
  return mapping[commandType] || 'high_cost';
}

function mapCommandTypeToTaskType(commandType: string): string {
  const mapping: Record<string, string> = {
    deploy: 'deployment',
    investigate: 'investigation',
    implement: 'implementation',
    review: 'review',
    analyze: 'analysis',
    report: 'analysis',
    create_task: 'implementation',
    spawn_agent: 'maintenance',
    kill_agent: 'maintenance',
    query_status: 'analysis',
  };
  return mapping[commandType] || 'implementation';
}

function determinePriority(riskLevel: string, sourceChannel: string): string {
  if (riskLevel === 'high') return 'urgent';
  if (riskLevel === 'medium') return 'high';
  if (sourceChannel === 'telegram') return 'high';
  return 'medium';
}

// ============================================================================
// PARENT/CHILD TASK OPERATIONS
// ============================================================================
export async function createChildTask(params: {
  parentTaskId: string;
  companyId: string;
  commandId: string;
  title: string;
  description?: string;
  assignedAgentId: string;
  taskType?: string;
  priority?: string;
  dependencyType?: 'blocking' | 'non_blocking';
}): Promise<{ taskId: string; dependencyId?: string }> {
  // Create the child task
  const task = await createTaskWithDependencies({
    companyId: params.companyId,
    commandId: params.commandId,
    title: params.title,
    description: params.description,
    taskType: params.taskType || 'implementation',
    assignedAgentId: params.assignedAgentId,
    priority: params.priority || 'medium',
    parentTaskId: params.parentTaskId,
    status: 'draft',
  });
  
  // Create dependency relationship
  let dependencyId;
  if (params.dependencyType) {
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('task_dependencies')
      .insert({
        task_id: task.id,
        depends_on_task_id: params.parentTaskId,
        dependency_type: params.dependencyType,
      })
      .select()
      .single();
      
    if (!error) {
      dependencyId = data.id;
    }
  }
  
  // Log event
  await logEvent({
    eventType: 'task.created',
    actorType: 'agent',
    actorId: params.assignedAgentId,
    companyId: params.companyId,
    targetType: 'task',
    targetId: task.id,
    payload: {
      parent_task_id: params.parentTaskId,
      is_child_task: true,
      dependency_type: params.dependencyType,
    },
  });
  
  return { taskId: task.id, dependencyId };
}

export async function addTaskDependency(params: {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType?: 'blocking' | 'non_blocking';
}): Promise<void> {
  const { error } = await (getSupabaseAdmin() as any)
    .from('task_dependencies')
    .insert({
      task_id: params.taskId,
      depends_on_task_id: params.dependsOnTaskId,
      dependency_type: params.dependencyType || 'blocking',
    });
    
  if (error) {
    throw new Error(`Failed to add dependency: ${error.message}`);
  }
}

// ============================================================================
// BATCH OPERATIONS FOR COMPLEX COMMANDS
// ============================================================================
export async function ingestComplexCommand(input: CommandInput & {
  subTasks?: Array<{
    title: string;
    description?: string;
    assignedAgentId?: string;
    dependencies?: string[];
  }>;
}): Promise<{
  commandId: string;
  parentTaskId: string;
  childTaskIds: string[];
  status: string;
  executionMode: "direct" | "mission";
}> {
  // First, create the parent command and task
  const result = await ingestCommand(input);
  
  if (!result.taskId || !input.subTasks || input.subTasks.length === 0) {
    return {
      commandId: result.commandId,
      parentTaskId: result.taskId || '',
      childTaskIds: [],
      status: result.status,
      executionMode: 'direct', // No subtasks = direct mode
    };
  }
  
  const childTaskIds: string[] = [];
  
  // Create child tasks
  for (const subTask of input.subTasks) {
    const child = await createChildTask({
      parentTaskId: result.taskId,
      companyId: input.companyId,
      commandId: result.commandId,
      title: subTask.title,
      description: subTask.description,
      assignedAgentId: subTask.assignedAgentId || result.routedToAgent || 'henry',
      dependencyType: subTask.dependencies && subTask.dependencies.length > 0 ? 'blocking' : undefined,
    });
    
    childTaskIds.push(child.taskId);
    
    // Add additional dependencies if specified
    if (subTask.dependencies) {
      for (const depId of subTask.dependencies) {
        await addTaskDependency({
          taskId: child.taskId,
          dependsOnTaskId: depId,
          dependencyType: 'blocking',
        });
      }
    }
  }
  
  return {
    commandId: result.commandId,
    parentTaskId: result.taskId,
    childTaskIds,
    status: result.status,
    executionMode: 'mission', // ATLAS-SOPHIA-DIRECT-VS-MISSION-POLICY-001: Complex = mission mode
  };
}

// ============================================================================
// RICH CANONICAL EVENTS - Task Lifecycle
// ============================================================================
export async function logTaskStarted(params: {
  taskId: string;
  companyId: string;
  assignedAgentId: string;
  commandId?: string;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
}) {
  await logEvent({
    eventType: 'task.started',
    actorType: 'agent',
    actorId: params.assignedAgentId,
    companyId: params.companyId,
    targetType: 'task',
    targetId: params.taskId,
    routedToAgentId: params.assignedAgentId,
    payload: {
      command_id: params.commandId,
      parent_task_id: params.parentTaskId,
      started_at: new Date().toISOString(),
      ...params.metadata,
    },
  });
}

export async function logTaskCompleted(params: {
  taskId: string;
  companyId: string;
  assignedAgentId: string;
  commandId?: string;
  result?: Record<string, unknown>;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}) {
  await logEvent({
    eventType: 'task.completed',
    actorType: 'agent',
    actorId: params.assignedAgentId,
    companyId: params.companyId,
    targetType: 'task',
    targetId: params.taskId,
    routedToAgentId: params.assignedAgentId,
    payload: {
      command_id: params.commandId,
      completed_at: new Date().toISOString(),
      duration_ms: params.durationMs,
      result: params.result,
      ...params.metadata,
    },
  });
}

export async function logTaskFailed(params: {
  taskId: string;
  companyId: string;
  assignedAgentId: string;
  commandId?: string;
  error: string;
  errorCode?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}) {
  await logEvent({
    eventType: 'task.failed',
    actorType: 'agent',
    actorId: params.assignedAgentId,
    companyId: params.companyId,
    targetType: 'task',
    targetId: params.taskId,
    routedToAgentId: params.assignedAgentId,
    payload: {
      command_id: params.commandId,
      failed_at: new Date().toISOString(),
      error: params.error,
      error_code: params.errorCode,
      retryable: params.retryable ?? false,
      ...params.metadata,
    },
  });
}

// ============================================================================
// RICH CANONICAL EVENTS - Approval Lifecycle
// ============================================================================
export async function logApprovalRequested(params: {
  approvalId: string;
  commandId: string;
  companyId: string;
  requestedBy: string;
  riskLevel: string;
  estimatedCostUsd?: number;
  approvalType: string;
  metadata?: Record<string, unknown>;
}) {
  await logEvent({
    eventType: 'approval.requested',
    actorType: 'system',
    actorId: 'command_bus',
    companyId: params.companyId,
    targetType: 'approval',
    targetId: params.approvalId,
    payload: {
      command_id: params.commandId,
      requested_by: params.requestedBy,
      risk_level: params.riskLevel,
      estimated_cost_usd: params.estimatedCostUsd,
      approval_type: params.approvalType,
      requested_at: new Date().toISOString(),
      ...params.metadata,
    },
  });
}

export async function logApprovalResponded(params: {
  approvalId: string;
  commandId: string;
  companyId: string;
  respondedBy: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await logEvent({
    eventType: 'approval.responded',
    actorType: 'user',
    actorId: params.respondedBy,
    companyId: params.companyId,
    targetType: 'approval',
    targetId: params.approvalId,
    payload: {
      command_id: params.commandId,
      responded_by: params.respondedBy,
      decision: params.decision,
      reason: params.reason,
      responded_at: new Date().toISOString(),
      ...params.metadata,
    },
  });
}
