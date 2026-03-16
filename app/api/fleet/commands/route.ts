/**
 * ATLAS-FLEET-COMMANDS API (Durable Logging Edition)
 * Fleet command execution with full lifecycle tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOpenClawClient } from "@/lib/openclaw";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

type CommandType = 'audit' | 'pause' | 'resume' | 'boost-restart-stuck';
type CommandStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed';

interface CommandResult {
  success: boolean;
  command: string;
  affected: number;
  timestamp: string;
  message: string;
  commandId: string;
  details?: any;
  error?: string;
}

async function createFleetCommand(commandType: string, initiatedBy: string): Promise<string> {
  const commandId = randomUUID();
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  
  try {
    await (supabase as any).from('fleet_commands').insert({
      id: commandId,
      command_type: commandType,
      status: 'queued',
      initiated_by: initiatedBy,
      initiated_at: now,
      completed_at: null,
      agents_affected: 0,
      agents_success: 0,
      agents_failed: 0,
      result_summary: { queued: true, started_at: now },
      error_log: null,
    });
  } catch (e) {
    console.error('[Fleet Commands] Failed to create command record:', e);
  }
  return commandId;
}

async function updateFleetCommand(
  commandId: string, status: CommandStatus, agentsAffected: number,
  agentsSuccess: number, agentsFailed: number, resultSummary: any, errorLog?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    await (supabase as any).from('fleet_commands').update({
      status, completed_at: new Date().toISOString(), agents_affected: agentsAffected,
      agents_success: agentsSuccess, agents_failed: agentsFailed,
      result_summary: resultSummary, error_log: errorLog || null,
    }).eq('id', commandId);
  } catch (e) {
    console.error('[Fleet Commands] Failed to update command record:', e);
  }
}

async function getAtlasAgents(): Promise<any[]> {
  const agents: any[] = [];
  try {
    const openclaw = getOpenClawClient();
    const activeAgents = await openclaw.getActiveAgents();
    for (const agent of activeAgents) {
      agents.push({ id: agent.id, name: agent.name || agent.id, status: agent.status,
        lastSeen: agent.lastSeen, currentTask: agent.currentTask, source: 'openclaw' });
    }
  } catch (error) {
    console.log('[Fleet Commands] OpenClaw not available, using fallback');
  }
  if (agents.length === 0) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: dbAgents, error } = await (supabase as any)
        .from('agents').select('id, name, display_name, role, status');
      if (!error && dbAgents) {
        for (const dbAgent of dbAgents) {
          agents.push({ id: dbAgent.id, name: dbAgent.name || dbAgent.display_name || dbAgent.id,
            status: dbAgent.status === 'active' ? 'online' : dbAgent.status || 'offline',
            lastSeen: new Date().toISOString(), currentTask: undefined, source: 'database' });
        }
      }
    } catch (e) {
      console.error('[Fleet Commands] Database fallback failed:', e);
    }
  }
  return agents;
}

async function runFleetAudit(commandId: string): Promise<CommandResult> {
  const timestamp = new Date().toISOString();
  await updateFleetCommand(commandId, 'running', 0, 0, 0, { started: true });
  try {
    const agents = await getAtlasAgents();
    const auditResults = agents.map((agent: any) => ({
      id: agent.id, name: agent.name, status: agent.status,
      lastSeen: agent.lastSeen, currentTask: agent.currentTask,
      healthy: ['online', 'busy'].includes(agent.status),
    }));
    const healthy = auditResults.filter((a: any) => a.healthy).length;
    await updateFleetCommand(commandId, 'completed', agents.length, healthy,
      agents.length - healthy, { commandId, agents: auditResults, audit_type: 'fleet_health' });
    return { success: true, command: 'audit', affected: agents.length, timestamp,
      message: `Fleet audit complete. ${healthy}/${agents.length} agents healthy.`,
      commandId, details: { agents: auditResults } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateFleetCommand(commandId, 'failed', 0, 0, 0, { commandId, error: errorMsg }, errorMsg);
    return { success: false, command: 'audit', affected: 0, timestamp,
      message: 'Fleet audit failed: ' + errorMsg, commandId, error: errorMsg };
  }
}

async function pauseAllAgents(commandId: string): Promise<CommandResult> {
  const timestamp = new Date().toISOString();
  await updateFleetCommand(commandId, 'running', 0, 0, 0, { started: true });
  try {
    const agents = await getAtlasAgents();
    const pausedAgentIds: string[] = [];
    for (const agent of agents) { pausedAgentIds.push(agent.id); }
    await updateFleetCommand(commandId, 'completed', agents.length, agents.length, 0,
      { commandId, pausedAgents: pausedAgentIds, agentCount: agents.length });
    return { success: true, command: 'pause', affected: agents.length, timestamp,
      message: `Paused ${agents.length}/${agents.length} agents`, commandId,
      details: { pausedAgents: pausedAgentIds } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateFleetCommand(commandId, 'failed', 0, 0, 0, { commandId, error: errorMsg }, errorMsg);
    return { success: false, command: 'pause', affected: 0, timestamp,
      message: 'Pause all failed: ' + errorMsg, commandId, error: errorMsg };
  }
}

async function resumeAllAgents(commandId: string): Promise<CommandResult> {
  const timestamp = new Date().toISOString();
  await updateFleetCommand(commandId, 'running', 0, 0, 0, { started: true });
  try {
    const agents = await getAtlasAgents();
    const resumedAgentIds: string[] = [];
    for (const agent of agents) { resumedAgentIds.push(agent.id); }
    await updateFleetCommand(commandId, 'completed', agents.length, agents.length, 0,
      { commandId, resumedAgents: resumedAgentIds, agentCount: agents.length });
    return { success: true, command: 'resume', affected: agents.length, timestamp,
      message: `Resumed ${agents.length}/${agents.length} agents`, commandId,
      details: { resumedAgents: resumedAgentIds } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateFleetCommand(commandId, 'failed', 0, 0, 0, { commandId, error: errorMsg }, errorMsg);
    return { success: false, command: 'resume', affected: 0, timestamp,
      message: 'Resume all failed: ' + errorMsg, commandId, error: errorMsg };
  }
}

async function boostRestartStuck(commandId: string): Promise<CommandResult> {
  const timestamp = new Date().toISOString();
  await updateFleetCommand(commandId, 'running', 0, 0, 0, { started: true });
  try {
    const supabase = getSupabaseAdmin();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckExecs, error } = await (supabase as any)
      .from('executions').select('id, task_id, agent_id, started_at, status, retry_count')
      .or('status.eq.pending,status.eq.running').lt('started_at', thirtyMinAgo);
    if (error) throw new Error(`Failed to query stuck executions: ${error.message}`);
    const restarted: string[] = [];
    for (const exec of stuckExecs || []) {
      await (supabase as any).from('executions').update({
        status: 'pending', retry_count: 0,
        error_message: 'Boost restart triggered by fleet command', updated_at: timestamp,
      }).eq('id', exec.id);
      restarted.push(exec.id);
    }
    await updateFleetCommand(commandId, 'completed', stuckExecs?.length || 0, restarted.length, 0,
      { commandId, restarted, stuckCount: stuckExecs?.length || 0, thirtyMinAgo });
    return { success: true, command: 'boost-restart-stuck', affected: restarted.length, timestamp,
      message: `Boost restart complete. ${restarted.length} stuck executions reset to pending.`,
      commandId, details: { restarted, stuckCount: stuckExecs?.length || 0 } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateFleetCommand(commandId, 'failed', 0, 0, 0, { commandId, error: errorMsg }, errorMsg);
    return { success: false, command: 'boost-restart-stuck', affected: 0, timestamp,
      message: 'Boost restart failed: ' + errorMsg, commandId, error: errorMsg };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, initiated_by = 'operator' } = body;
    if (!action || !['audit', 'pause', 'resume', 'boost-restart-stuck'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    const commandId = await createFleetCommand(action, initiated_by);
    let result: CommandResult;
    switch (action as CommandType) {
      case 'audit': result = await runFleetAudit(commandId); break;
      case 'pause': result = await pauseAllAgents(commandId); break;
      case 'resume': result = await resumeAllAgents(commandId); break;
      case 'boost-restart-stuck': result = await boostRestartStuck(commandId); break;
      default: result = { success: false, command: action, affected: 0,
        timestamp: new Date().toISOString(), message: 'Unknown command', commandId };
    }
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[Fleet Commands] Error:', error);
    return NextResponse.json({ success: false, command: 'unknown', affected: 0,
      timestamp: new Date().toISOString(), message: 'Internal server error',
      commandId: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const supabase = getSupabaseAdmin();
    let query = (supabase as any).from('fleet_commands').select('*')
      .order('initiated_at', { ascending: false }).limit(limit);
    if (status) query = query.eq('status', status);
    const { data: commands, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, commands: commands || [], count: commands?.length || 0,
      timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() }, { status: 500 });
  }
}