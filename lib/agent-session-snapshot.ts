/**
 * ATLAS-RUNTIME-SESSION-SNAPSHOT-DEPLOY-1289
 * Agent Session Snapshot Service
 * 
 * Captures and retrieves agent session state for runtime continuity
 * and graceful restart/recovery scenarios.
 */

import { getSupabaseAdmin } from './supabase-admin';

export interface AgentSessionSnapshot {
  id?: string;
  agent_id: string;
  task_id?: string | null;
  execution_id?: string | null;
  snapshot_payload: SnapshotPayload;
  created_at?: string;
  updated_at?: string;
}

export interface SnapshotPayload {
  current_task: TaskSnapshot | null;
  workflow_step: WorkflowStepSnapshot | null;
  execution_payload: ExecutionPayloadSnapshot | null;
  context_summary: ContextSummary;
  metadata?: Record<string, any>;
}

export interface TaskSnapshot {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at?: string | null;
  assigned_to?: string | null;
  source?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowStepSnapshot {
  workflow_execution_id: string;
  step_name: string;
  step_order: number;
  status: 'started' | 'completed' | 'failed' | 'pending';
  started_at?: string;
  completed_at?: string;
  output_snapshot?: Record<string, any>;
}

export interface ExecutionPayloadSnapshot {
  execution_id: string;
  status: string;
  retry_count: number;
  max_attempts: number;
  failure_class?: string;
  error_message?: string;
  payload?: Record<string, any>;
}

export interface ContextSummary {
  session_start_time: string;
  last_activity_time: string;
  total_steps_completed: number;
  total_steps_pending: number;
  agent_version?: string;
  environment?: string;
  notes?: string;
}

/**
 * Capture a snapshot of the current agent session state
 * 
 * @param agent_id - The agent's unique identifier
 * @param snapshot_data - Optional partial snapshot data to merge
 * @returns The created snapshot record
 */
export async function captureAgentSnapshot(
  agent_id: string,
  snapshot_data?: Partial<SnapshotPayload>
): Promise<AgentSessionSnapshot> {
  const supabase = getSupabaseAdmin();
  
  // Build default snapshot payload
  const defaultPayload: SnapshotPayload = {
    current_task: null,
    workflow_step: null,
    execution_payload: null,
    context_summary: {
      session_start_time: new Date().toISOString(),
      last_activity_time: new Date().toISOString(),
      total_steps_completed: 0,
      total_steps_pending: 0,
      environment: process.env.NODE_ENV || 'production'
    },
    metadata: {}
  };

  // Merge with provided data
  const payload: SnapshotPayload = {
    ...defaultPayload,
    ...snapshot_data,
    context_summary: {
      ...defaultPayload.context_summary,
      ...snapshot_data?.context_summary
    }
  };

  const { data, error } = await (supabase as any)
    .from('agent_session_snapshots')
    .insert({
      agent_id,
      task_id: snapshot_data?.current_task?.id || null,
      execution_id: snapshot_data?.execution_payload?.execution_id || 
                    snapshot_data?.workflow_step?.workflow_execution_id || null,
      snapshot_payload: payload
    })
    .select()
    .single();

  if (error) {
    console.error('[AgentSnapshot] Failed to capture snapshot:', error);
    throw new Error(`Failed to capture agent snapshot: ${error.message}`);
  }

  console.log(`[AgentSnapshot] Captured snapshot for agent ${agent_id}: ${data.id}`);
  return data as AgentSessionSnapshot;
}

/**
 * Retrieve the most recent snapshot for an agent
 * 
 * @param agent_id - The agent's unique identifier
 * @returns The latest snapshot or null if none exists
 */
export async function getLatestAgentSnapshot(
  agent_id: string
): Promise<AgentSessionSnapshot | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('agent_session_snapshots')
    .select('*')
    .eq('agent_id', agent_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AgentSnapshot] Failed to retrieve snapshot:', error);
    throw new Error(`Failed to retrieve agent snapshot: ${error.message}`);
  }

  return data as AgentSessionSnapshot | null;
}

/**
 * Retrieve all snapshots for an agent (paginated)
 * 
 * @param agent_id - The agent's unique identifier
 * @param limit - Maximum number of snapshots to return
 * @param offset - Offset for pagination
 * @returns Array of snapshots
 */
export async function getAgentSnapshots(
  agent_id: string,
  limit: number = 10,
  offset: number = 0
): Promise<AgentSessionSnapshot[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('agent_session_snapshots')
    .select('*')
    .eq('agent_id', agent_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[AgentSnapshot] Failed to retrieve snapshots:', error);
    throw new Error(`Failed to retrieve agent snapshots: ${error.message}`);
  }

  return (data || []) as AgentSessionSnapshot[];
}

/**
 * Update an existing snapshot with new data
 * 
 * @param snapshot_id - The snapshot's unique identifier
 * @param updates - Partial snapshot data to update
 * @returns The updated snapshot record
 */
export async function updateAgentSnapshot(
  snapshot_id: string,
  updates: Partial<AgentSessionSnapshot>
): Promise<AgentSessionSnapshot> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('agent_session_snapshots')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', snapshot_id)
    .select()
    .single();

  if (error) {
    console.error('[AgentSnapshot] Failed to update snapshot:', error);
    throw new Error(`Failed to update agent snapshot: ${error.message}`);
  }

  return data as AgentSessionSnapshot;
}

/**
 * Delete old snapshots for an agent (cleanup)
 * 
 * @param agent_id - The agent's unique identifier
 * @param keep_count - Number of recent snapshots to keep
 * @returns Number of deleted snapshots
 */
export async function cleanupOldAgentSnapshots(
  agent_id: string,
  keep_count: number = 10
): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Get IDs of snapshots to keep
  const { data: snapshotsToKeep } = await (supabase as any)
    .from('agent_session_snapshots')
    .select('id')
    .eq('agent_id', agent_id)
    .order('created_at', { ascending: false })
    .limit(keep_count);

  const keepIds = (snapshotsToKeep || []).map((s: any) => s.id);

  if (keepIds.length === 0) return 0;

  // Delete all snapshots NOT in the keep list
  const { error, count } = await (supabase as any)
    .from('agent_session_snapshots')
    .delete()
    .eq('agent_id', agent_id)
    .not('id', 'in', `(${keepIds.join(',')})`);

  if (error) {
    console.error('[AgentSnapshot] Failed to cleanup snapshots:', error);
    throw new Error(`Failed to cleanup agent snapshots: ${error.message}`);
  }

  console.log(`[AgentSnapshot] Cleaned up ${count} old snapshots for agent ${agent_id}`);
  return count || 0;
}

/**
 * Build a comprehensive snapshot from current execution context
 * 
 * @param agent_id - The agent's unique identifier
 * @param execution_context - Current execution context
 * @returns The captured snapshot
 */
export async function buildAndCaptureSnapshot(
  agent_id: string,
  execution_context: {
    task?: TaskSnapshot;
    workflow_step?: WorkflowStepSnapshot;
    execution_payload?: ExecutionPayloadSnapshot;
    additional_context?: Record<string, any>;
  }
): Promise<AgentSessionSnapshot> {
  const payload: SnapshotPayload = {
    current_task: execution_context.task || null,
    workflow_step: execution_context.workflow_step || null,
    execution_payload: execution_context.execution_payload || null,
    context_summary: {
      session_start_time: new Date().toISOString(),
      last_activity_time: new Date().toISOString(),
      total_steps_completed: execution_context.workflow_step?.status === 'completed' ? 1 : 0,
      total_steps_pending: execution_context.workflow_step?.status === 'pending' ? 1 : 0,
      environment: process.env.NODE_ENV || 'production',
      notes: execution_context.additional_context?.notes || null
    },
    metadata: execution_context.additional_context || {}
  };

  return captureAgentSnapshot(agent_id, payload);
}
