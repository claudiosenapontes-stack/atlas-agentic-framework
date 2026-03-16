/**
 * ATLAS-FLEET-ACTIONS API
 * Fleet command backend implementations
 * 
 * POST /api/control/fleet/actions
 * Actions: fleet_audit, pause_all, resume_all, boost_restart_stuck
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exec } from "child_process";
import { promisify } from "util";
import { getOpenClawClient } from "@/lib/openclaw";
import { randomUUID } from "crypto";
import { UI_SAFE_MODE } from "@/app/config/safe-mode";

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

type FleetAction = 'fleet_audit' | 'pause_all' | 'resume_all' | 'boost_restart_stuck';

interface ActionResult {
  success: boolean;
  action: FleetAction;
  affected: number;
  timestamp: string;
  message: string;
  error?: string;
  details?: any;
}

async function runFleetAudit(): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const openclaw = getOpenClawClient();
    const agents = await openclaw.getActiveAgents();
    
    // Check each agent's health
    const auditResults = [];
    for (const agent of agents) {
      const health = {
        agent_id: agent.id,
        status: agent.status,
        last_seen: agent.lastSeen,
        current_task: agent.currentTask,
        healthy: agent.status === 'online' || agent.status === 'busy',
      };
      auditResults.push(health);
    }
    
    // Store audit results
    const supabase = getSupabaseAdmin();
    await (supabase as any).from('fleet_audits').insert({
      id: randomUUID(),
      timestamp,
      agents_checked: agents.length,
      results: auditResults,
    });
    
    const healthyCount = auditResults.filter(r => r.healthy).length;
    
    return {
      success: true,
      action: 'fleet_audit',
      affected: agents.length,
      timestamp,
      message: `Fleet audit complete. ${healthyCount}/${agents.length} agents healthy.`,
      details: { agents: auditResults },
    };
  } catch (error) {
    return {
      success: false,
      action: 'fleet_audit',
      affected: 0,
      timestamp,
      message: 'Fleet audit failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function pauseAllAgents(): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Get active agents
    const openclaw = getOpenClawClient();
    const agents = await openclaw.getActiveAgents();
    
    let paused = 0;
    const errors = [];
    
    // Pause each agent by updating status
    const supabase = getSupabaseAdmin();
    
    for (const agent of agents) {
      try {
        // Update agent status to paused
        await (supabase as any).from('agents').update({ 
          status: 'paused',
          updated_at: timestamp,
        }).eq('name', agent.id);
        paused++;
      } catch (e) {
        errors.push({ agent: agent.id, error: String(e) });
      }
    }
    
    // Log the action
    await (supabase as any).from('fleet_actions').insert({
      id: randomUUID(),
      action: 'pause_all',
      timestamp,
      affected_count: paused,
      errors: errors.length > 0 ? errors : null,
    });
    
    return {
      success: errors.length === 0,
      action: 'pause_all',
      affected: paused,
      timestamp,
      message: `Paused ${paused} agents${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      error: errors.length > 0 ? `${errors.length} agents failed to pause` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      action: 'pause_all',
      affected: 0,
      timestamp,
      message: 'Pause all agents failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function resumeAllAgents(): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Get paused agents
    const { data: pausedAgents, error } = await (supabase as any)
      .from('agents')
      .select('id, name')
      .eq('status', 'paused');
    
    if (error) throw error;
    
    let resumed = 0;
    const errors = [];
    
    for (const agent of (pausedAgents || [])) {
      try {
        await (supabase as any).from('agents').update({ 
          status: 'active',
          updated_at: timestamp,
        }).eq('id', agent.id);
        resumed++;
      } catch (e) {
        errors.push({ agent: agent.name, error: String(e) });
      }
    }
    
    // Log the action
    await (supabase as any).from('fleet_actions').insert({
      id: randomUUID(),
      action: 'resume_all',
      timestamp,
      affected_count: resumed,
      errors: errors.length > 0 ? errors : null,
    });
    
    return {
      success: errors.length === 0,
      action: 'resume_all',
      affected: resumed,
      timestamp,
      message: `Resumed ${resumed} agents${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      error: errors.length > 0 ? `${errors.length} agents failed to resume` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      action: 'resume_all',
      affected: 0,
      timestamp,
      message: 'Resume all agents failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function boostRestartStuck(): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Find stuck executions (pending/running for >30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckExecs, error } = await (supabase as any)
      .from('executions')
      .select('id, task_id, agent_id, started_at, status')
      .or('status.eq.pending,status.eq.running')
      .lt('started_at', thirtyMinAgo);
    
    if (error) throw error;
    
    const restarted = [];
    const errors = [];
    
    for (const exec of (stuckExecs || [])) {
      try {
        // Mark for retry by updating status
        await (supabase as any).from('executions').update({
          status: 'pending',
          retry_count: 0,
          error_message: 'Boost restart triggered',
          updated_at: timestamp,
        }).eq('id', exec.id);
        
        restarted.push({
          execution_id: exec.id,
          task_id: exec.task_id,
          agent_id: exec.agent_id,
        });
      } catch (e) {
        errors.push({ execution_id: exec.id, error: String(e) });
      }
    }
    
    // Log the action
    await (supabase as any).from('fleet_actions').insert({
      id: randomUUID(),
      action: 'boost_restart_stuck',
      timestamp,
      affected_count: restarted.length,
      details: { restarted },
      errors: errors.length > 0 ? errors : null,
    });
    
    return {
      success: errors.length === 0,
      action: 'boost_restart_stuck',
      affected: restarted.length,
      timestamp,
      message: `Boost restarted ${restarted.length} stuck executions${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      details: { restarted },
      error: errors.length > 0 ? `${errors.length} executions failed to restart` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      action: 'boost_restart_stuck',
      affected: 0,
      timestamp,
      message: 'Boost restart failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  // Safe Mode Check - Block write operations
  if (UI_SAFE_MODE.ACTIVE) {
    return NextResponse.json(
      {
        success: false,
        error: 'Service temporarily unavailable',
        message: UI_SAFE_MODE.BANNER_TEXT,
        safeMode: true,
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;
    
    if (!action || !['fleet_audit', 'pause_all', 'resume_all', 'boost_restart_stuck'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be one of: fleet_audit, pause_all, resume_all, boost_restart_stuck' },
        { status: 400 }
      );
    }
    
    let result: ActionResult;
    
    switch (action as FleetAction) {
      case 'fleet_audit':
        result = await runFleetAudit();
        break;
      case 'pause_all':
        result = await pauseAllAgents();
        break;
      case 'resume_all':
        result = await resumeAllAgents();
        break;
      case 'boost_restart_stuck':
        result = await boostRestartStuck();
        break;
      default:
        result = {
          success: false,
          action: action as FleetAction,
          affected: 0,
          timestamp: new Date().toISOString(),
          message: 'Unknown action',
          error: 'Action not implemented',
        };
    }
    
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
    
  } catch (error) {
    console.error('[Fleet Actions] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
