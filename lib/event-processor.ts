// Event processor for OpenClaw webhooks
// Routes incoming events to appropriate handlers and updates Supabase

import { supabase } from './supabase';
import { publishEvent } from './redis-events';

export interface AgentSessionEvent {
  type: 'agent.session.created' | 'agent.session.ended';
  session_key: string;
  agent_id: string;
  context_tokens: number;
  model: string;
  started_at: string;
}

export interface ExecutionEvent {
  type: 'execution.started' | 'execution.succeeded' | 'execution.failed';
  task_id: string;
  execution_id: string;
  tool_calls: number;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  output_preview: string;
}

export interface CronEvent {
  type: 'cron.job.started' | 'cron.job.completed' | 'cron.job.failed';
  job_id: string;
  job_name: string;
  schedule: string;
  next_run_at: string;
}

export interface HeartbeatEvent {
  type: 'agent.heartbeat';
  memory_usage_mb: number;
  cpu_percent: number;
  context_tokens_used: number;
  context_tokens_total: number;
  current_task?: string;
  queue_depth: number;
}

export type OpenClawEvent = AgentSessionEvent | ExecutionEvent | CronEvent | HeartbeatEvent;

// Main event processor
export async function processEvent(event: OpenClawEvent, agentId: string): Promise<void> {
  console.log(`[EventProcessor] Processing ${event.type} for ${agentId}`);
  
  try {
    switch (event.type) {
      case 'agent.session.created':
        await handleSessionCreated(event as AgentSessionEvent, agentId);
        break;
      case 'agent.session.ended':
        await handleSessionEnded(event as AgentSessionEvent, agentId);
        break;
      case 'execution.started':
        await handleExecutionStarted(event as ExecutionEvent, agentId);
        break;
      case 'execution.succeeded':
      case 'execution.failed':
        await handleExecutionCompleted(event as ExecutionEvent, agentId);
        break;
      case 'cron.job.started':
      case 'cron.job.completed':
      case 'cron.job.failed':
        await handleCronEvent(event as CronEvent, agentId);
        break;
      case 'agent.heartbeat':
        await handleHeartbeat(event as HeartbeatEvent, agentId);
        break;
      default:
        console.warn(`[EventProcessor] Unknown event type: ${(event as any).type}`);
    }
    
    // Publish to Redis for real-time distribution
    // Use canonical channel names that SSE endpoint subscribes to
    const channelName = event.type.startsWith('agent.') ? 'agent:status' : 
                       event.type.startsWith('task.') ? 'task:updates' :
                       event.type;
    
    await publishEvent(channelName, {
      ...event,
      agent_id: agentId,
      processed_at: new Date().toISOString(),
    });
    
    // Also publish to agent-specific channel
    if (event.type.startsWith('agent.')) {
      await publishEvent(`agent:${agentId}:status`, {
        ...event,
        agent_id: agentId,
        processed_at: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error(`[EventProcessor] Error processing ${event.type}:`, error);
    throw error;
  }
}

async function handleSessionCreated(event: AgentSessionEvent, agentId: string): Promise<void> {
  // Update agent status in Supabase
  const updateData: any = {
    name: agentId,
    status: 'active',
    display_name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    updated_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    session_key: event.session_key,
    model: event.model,
    context_tokens: event.context_tokens,
  };
  
  const { error } = await supabase
    .from('agents')
    .upsert(updateData, { onConflict: 'name' });
    
  if (error) {
    console.error('[EventProcessor] Failed to update agent status:', error);
  }
  
  // Log to audit
  await logAuditEvent({
    event_type: 'agent.session.created',
    actor_id: agentId,
    target_type: 'agent',
    target_id: agentId,
    action: 'session_start',
    metadata: {
      session_key: event.session_key,
      model: event.model,
      context_tokens: event.context_tokens,
    },
  });
}

async function handleSessionEnded(event: AgentSessionEvent, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'inactive',
      session_key: null,
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    })
    .eq('name', agentId);
    
  if (error) {
    console.error('[EventProcessor] Failed to update agent status:', error);
  }
  
  await logAuditEvent({
    event_type: 'agent.session.ended',
    actor_id: agentId,
    target_type: 'agent',
    target_id: agentId,
    action: 'session_end',
    metadata: {
      session_key: event.session_key,
    },
  });
}

async function handleExecutionStarted(event: ExecutionEvent, agentId: string): Promise<void> {
  // Update task status
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      execution_id: event.execution_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.task_id);
    
  if (error) {
    console.error('[EventProcessor] Failed to update task:', error);
  }
}

async function handleExecutionCompleted(event: ExecutionEvent, agentId: string): Promise<void> {
  const status = event.type === 'execution.succeeded' ? 'completed' : 'failed';
  
  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      execution_id: event.execution_id,
      tokens_used: event.tokens_used,
      cost_usd: event.cost_usd,
      duration_ms: event.duration_ms,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.task_id);
    
  if (error) {
    console.error('[EventProcessor] Failed to update task:', error);
  }
  
  // Record execution metrics
  await supabase.from('execution_logs').insert({
    task_id: event.task_id,
    agent_id: agentId,
    execution_id: event.execution_id,
    status,
    tokens_used: event.tokens_used,
    cost_usd: event.cost_usd,
    duration_ms: event.duration_ms,
    output_preview: event.output_preview,
    created_at: new Date().toISOString(),
  });
}

async function handleCronEvent(event: CronEvent, agentId: string): Promise<void> {
  // Update cron job status
  await supabase.from('cron_jobs').upsert({
    id: event.job_id,
    name: event.job_name,
    schedule: event.schedule,
    agent_id: agentId,
    status: event.type === 'cron.job.failed' ? 'failed' : 'active',
    last_run_at: event.type !== 'cron.job.started' ? new Date().toISOString() : null,
    next_run_at: event.next_run_at,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

async function handleHeartbeat(event: HeartbeatEvent, agentId: string): Promise<void> {
  // Update agent metrics
  const { error } = await supabase
    .from('agents')
    .update({
      status: 'active',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      memory_usage_mb: event.memory_usage_mb,
      cpu_percent: event.cpu_percent,
      context_tokens: event.context_tokens_used,
      queue_depth: event.queue_depth,
      current_task: event.current_task || null,
    })
    .eq('name', agentId);
    
  if (error) {
    console.error('[EventProcessor] Failed to update heartbeat:', error);
  }
}

interface AuditLogEntry {
  event_type: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  action: string;
  metadata?: Record<string, unknown>;
}

async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  await supabase.from('audit_logs').insert({
    ...entry,
    created_at: new Date().toISOString(),
  });
}
