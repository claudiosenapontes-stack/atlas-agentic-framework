/**
 * ATLAS-OPTIMUS-BOOST-RESTART-SERVICE
 * Real Backend Wiring for Context-Window Boost Restart
 * 
 * Handles:
 * - Session termination with state snapshot
 * - Lock management and reacquisition
 * - Heartbeat verification
 * - Rollback on failure
 * - Post-restart state restoration
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOpenClawClient } from '@/lib/openclaw';
import { buildAndCaptureSnapshot } from '@/lib/agent-session-snapshot';
import { randomUUID } from 'crypto';

// Types
export interface BoostRestartResult {
  success: boolean;
  agent_id: string;
  pre_session_id: string;
  post_session_id: string;
  pre_context_size: number;
  post_context_size: number;
  heartbeat_verified: boolean;
  lock_reacquired: boolean;
  rollback_applied: boolean;
  error?: string;
  details?: {
    snapshot_id?: string;
    restart_duration_ms?: number;
    heartbeat_wait_ms?: number;
    lock_wait_ms?: number;
  };
}

export interface SessionState {
  session_id: string;
  context_tokens: number;
  max_context: number;
  status: string;
  last_activity: string;
  agent_version?: string;
  model?: string;
}

export interface BoostRestartConfig {
  waitForHeartbeatMs?: number;
  waitForLockMs?: number;
  snapshotBeforeRestart?: boolean;
  verifyHeartbeat?: boolean;
  reacquireLock?: boolean;
  initiated_by?: string;
  reason?: string;
}

// Constants
const DEFAULT_HEARTBEAT_WAIT_MS = 30000; // 30 seconds
const DEFAULT_LOCK_WAIT_MS = 15000; // 15 seconds
const HEARTBEAT_POLL_INTERVAL_MS = 1000; // 1 second

/**
 * BoostRestartService - Real implementation for agent session restart
 */
export class BoostRestartService {
  private supabase: any;
  private openclaw: ReturnType<typeof getOpenClawClient>;

  constructor() {
    this.supabase = getSupabaseAdmin();
    this.openclaw = getOpenClawClient();
  }

  /**
   * Execute a boost restart for a single agent
   * This is the core method that performs real session termination and restart
   */
  async restartAgent(
    agentId: string,
    config: BoostRestartConfig = {}
  ): Promise<BoostRestartResult> {
    const startTime = Date.now();
    const {
      waitForHeartbeatMs = DEFAULT_HEARTBEAT_WAIT_MS,
      waitForLockMs = DEFAULT_LOCK_WAIT_MS,
      snapshotBeforeRestart = true,
      verifyHeartbeat = true,
      reacquireLock = true,
      initiated_by = 'system',
      reason = 'Context window boost restart'
    } = config;

    const result: BoostRestartResult = {
      success: false,
      agent_id: agentId,
      pre_session_id: '',
      post_session_id: '',
      pre_context_size: 0,
      post_context_size: 0,
      heartbeat_verified: false,
      lock_reacquired: false,
      rollback_applied: false
    };

    let snapshotId: string | null = null;
    let preState: SessionState | null = null;
    let restartLogId: string | null = null;

    try {
      // Phase 1: Pre-Restart State Capture
      console.log(`[BoostRestart] Phase 1: Capturing pre-restart state for ${agentId}`);
      preState = await this.capturePreRestartState(agentId);
      result.pre_session_id = preState.session_id;
      result.pre_context_size = preState.context_tokens;

      // Phase 2: Snapshot State (if enabled)
      if (snapshotBeforeRestart) {
        console.log(`[BoostRestart] Phase 2: Creating state snapshot for ${agentId}`);
        const snapshot = await this.createRestartSnapshot(agentId, preState, reason);
        snapshotId = snapshot.id;
        result.details = { ...result.details, snapshot_id: snapshotId };
      }

      // Phase 3: Create Restart Log Entry
      restartLogId = await this.createRestartLog(agentId, preState, initiated_by, reason);

      // Phase 4: Terminate Current Session (REAL RESTART)
      console.log(`[BoostRestart] Phase 4: Terminating session for ${agentId}`);
      const terminateResult = await this.terminateSession(agentId, preState.session_id);
      if (!terminateResult.success) {
        throw new Error(`Failed to terminate session: ${terminateResult.error}`);
      }

      // Phase 5: Wait for Fresh Session
      if (verifyHeartbeat) {
        console.log(`[BoostRestart] Phase 5: Waiting for fresh session from ${agentId}`);
        const heartbeatStart = Date.now();
        const freshSession = await this.waitForFreshSession(agentId, waitForHeartbeatMs);
        result.details = { 
          ...result.details, 
          restart_duration_ms: Date.now() - startTime,
          heartbeat_wait_ms: Date.now() - heartbeatStart
        };

        if (!freshSession) {
          // Heartbeat not received - initiate rollback
          console.warn(`[BoostRestart] No heartbeat from ${agentId} - initiating rollback`);
          await this.rollbackRestart(agentId, preState, snapshotId);
          result.rollback_applied = true;
          throw new Error('Agent did not send heartbeat within timeout period');
        }

        result.post_session_id = freshSession.session_id;
        result.post_context_size = freshSession.context_tokens;
        result.heartbeat_verified = true;
      }

      // Phase 6: Reacquire Lock (if enabled)
      if (reacquireLock) {
        console.log(`[BoostRestart] Phase 6: Reacquiring lock for ${agentId}`);
        const lockStart = Date.now();
        const lockAcquired = await this.waitForLockAcquisition(agentId, waitForLockMs);
        result.details = { ...result.details, lock_wait_ms: Date.now() - lockStart };
        result.lock_reacquired = lockAcquired;

        if (!lockAcquired) {
          console.warn(`[BoostRestart] Lock not acquired for ${agentId}`);
        }
      }

      // Phase 7: Update Restart Log with Success
      await this.updateRestartLog(restartLogId, 'completed', result);

      // Phase 8: Cleanup Old Sessions
      await this.cleanupOldSessions(agentId, result.post_session_id);

      result.success = true;
      console.log(`[BoostRestart] Successfully restarted ${agentId} in ${Date.now() - startTime}ms`);

    } catch (error: any) {
      console.error(`[BoostRestart] Failed to restart ${agentId}:`, error);
      result.error = error.message;
      
      if (restartLogId) {
        await this.updateRestartLog(restartLogId, 'failed', result, error.message);
      }

      // If we haven't already rolled back and have pre-state, try rollback
      if (!result.rollback_applied && preState) {
        try {
          await this.rollbackRestart(agentId, preState, snapshotId);
          result.rollback_applied = true;
        } catch (rollbackError) {
          console.error(`[BoostRestart] Rollback also failed:`, rollbackError);
        }
      }
    }

    return result;
  }

  /**
   * Get stuck agents that need restart
   */
  async getStuckAgents(
    contextThreshold: number = 0.8,
    heartbeatStaleMinutes: number = 10
  ): Promise<Array<{ agent_id: string; reason: string; severity: 'high' | 'medium' | 'low' }>> {
    const stuckAgents: Array<{ agent_id: string; reason: string; severity: 'high' | 'medium' | 'low' }> = [];
    const staleThreshold = new Date(Date.now() - heartbeatStaleMinutes * 60 * 1000).toISOString();

    try {
      const { data: sessions, error } = await this.supabase
        .from('agent_sessions')
        .select('agent_id, context_tokens, max_context, last_activity, status')
        .or(`last_activity.lt.${staleThreshold},status.eq.error`);

      if (error) throw error;

      for (const session of sessions || []) {
        const contextUtilization = session.max_context > 0 
          ? session.context_tokens / session.max_context 
          : 0;

        if (contextUtilization > contextThreshold) {
          stuckAgents.push({
            agent_id: session.agent_id,
            reason: `High context utilization: ${Math.round(contextUtilization * 100)}%`,
            severity: contextUtilization > 0.95 ? 'high' : 'medium'
          });
        } else if (session.last_activity < staleThreshold) {
          stuckAgents.push({
            agent_id: session.agent_id,
            reason: `Stale heartbeat: ${session.last_activity}`,
            severity: 'high'
          });
        } else if (session.status === 'error') {
          stuckAgents.push({
            agent_id: session.agent_id,
            reason: 'Agent in error state',
            severity: 'high'
          });
        }
      }
    } catch (error) {
      console.error('[BoostRestart] Error getting stuck agents:', error);
    }

    return stuckAgents;
  }

  /**
   * Perform a wave restart on multiple agents
   */
  async restartWave(
    agentIds: string[],
    config: BoostRestartConfig = {}
  ): Promise<{ results: BoostRestartResult[]; summary: { total: number; success: number; failed: number } }> {
    const results: BoostRestartResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    console.log(`[BoostRestart] Starting wave restart for ${agentIds.length} agents`);

    const batchSize = 3;
    for (let i = 0; i < agentIds.length; i += batchSize) {
      const batch = agentIds.slice(i, i + batchSize);
      console.log(`[BoostRestart] Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);

      const batchResults = await Promise.all(
        batch.map(agentId => this.restartAgent(agentId, config))
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      if (i + batchSize < agentIds.length) {
        await this.delay(2000);
      }
    }

    console.log(`[BoostRestart] Wave restart complete: ${successCount} success, ${failedCount} failed`);

    return {
      results,
      summary: {
        total: agentIds.length,
        success: successCount,
        failed: failedCount
      }
    };
  }

  /**
   * Restart all stuck agents automatically
   */
  async restartAllStuck(
    config: BoostRestartConfig & { autoDetect?: boolean } = {}
  ): Promise<{ results: BoostRestartResult[]; stuckAgents: string[]; summary: { total: number; success: number; failed: number } }> {
    const { autoDetect = true } = config;

    let agentIds: string[] = [];

    if (autoDetect) {
      const stuck = await this.getStuckAgents();
      agentIds = stuck.map(a => a.agent_id);
      console.log(`[BoostRestart] Auto-detected ${agentIds.length} stuck agents: ${agentIds.join(', ')}`);
    }

    if (agentIds.length === 0) {
      return {
        results: [],
        stuckAgents: [],
        summary: { total: 0, success: 0, failed: 0 }
      };
    }

    const waveResult = await this.restartWave(agentIds, config);

    return {
      results: waveResult.results,
      stuckAgents: agentIds,
      summary: waveResult.summary
    };
  }

  // Private helper methods

  private async capturePreRestartState(agentId: string): Promise<SessionState> {
    const { data: session, error } = await this.supabase
      .from('agent_sessions')
      .select('*')
      .eq('agent_id', agentId)
      .order('last_activity', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && session) {
      return {
        session_id: session.id || `${agentId}-session`,
        context_tokens: session.context_tokens || 0,
        max_context: session.max_context || 262000,
        status: session.status || 'unknown',
        last_activity: session.last_activity || new Date().toISOString(),
        agent_version: session.agent_version,
        model: session.model
      };
    }

    const { data: heartbeat, error: hbError } = await this.supabase
      .from('worker_heartbeats')
      .select('*')
      .eq('worker_id', agentId)
      .order('last_heartbeat_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!hbError && heartbeat) {
      const metadata = heartbeat.metadata || {};
      return {
        session_id: `${agentId}-${heartbeat.last_heartbeat_at}`,
        context_tokens: metadata.context_tokens_used || metadata.context_tokens || 0,
        max_context: metadata.max_context_tokens || metadata.max_context || 262000,
        status: 'active',
        last_activity: heartbeat.last_heartbeat_at,
        agent_version: metadata.agent_version,
        model: metadata.model
      };
    }

    return {
      session_id: `${agentId}-${Date.now()}`,
      context_tokens: 0,
      max_context: 262000,
      status: 'unknown',
      last_activity: new Date().toISOString()
    };
  }

  private async createRestartSnapshot(
    agentId: string, 
    preState: SessionState,
    reason: string
  ): Promise<{ id: string }> {
    const snapshot = await buildAndCaptureSnapshot(agentId, {
      task: {
        id: `restart-${Date.now()}`,
        title: `Boost Restart: ${reason}`,
        status: 'in_progress',
        priority: 'high'
      },
      execution_payload: {
        execution_id: `boost-restart-${Date.now()}`,
        status: 'restarting',
        retry_count: 0,
        max_attempts: 1,
        payload: {
          pre_session_id: preState.session_id,
          pre_context_size: preState.context_tokens,
          restart_reason: reason,
          initiated_at: new Date().toISOString()
        }
      },
      additional_context: {
        restart_type: 'boost',
        pre_state: preState,
        reason
      }
    });

    return { id: snapshot.id! };
  }

  private async createRestartLog(
    agentId: string,
    preState: SessionState,
    initiatedBy: string,
    reason: string
  ): Promise<string> {
    const logId = randomUUID();
    
    await this.supabase.from('boost_restart_logs').insert({
      id: logId,
      agent_id: agentId,
      pre_session_id: preState.session_id,
      pre_context_size: preState.context_tokens,
      status: 'in_progress',
      initiated_by: initiatedBy,
      reason,
      started_at: new Date().toISOString()
    });

    return logId;
  }

  private async updateRestartLog(
    logId: string,
    status: string,
    result: BoostRestartResult,
    errorMessage?: string
  ): Promise<void> {
    await this.supabase.from('boost_restart_logs').update({
      status,
      post_session_id: result.post_session_id,
      post_context_size: result.post_context_size,
      heartbeat_verified: result.heartbeat_verified,
      lock_reacquired: result.lock_reacquired,
      rollback_applied: result.rollback_applied,
      completed_at: new Date().toISOString(),
      error_message: errorMessage || null,
      result_details: result.details || {}
    }).eq('id', logId);
  }

  private async terminateSession(
    agentId: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Method 1: Try to terminate via OpenClaw API
      try {
        const response = await fetch(`${process.env.OPENCLAW_GATEWAY_URL}/sessions/${sessionId}/terminate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`
          },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          return { success: true };
        }
      } catch (apiError) {
        console.log('[BoostRestart] OpenClaw terminate API not available, using fallback');
      }

      // Method 2: Mark session as terminated in database
      await this.supabase.from('agent_sessions').update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: 'boost_restart'
      }).eq('agent_id', agentId);

      // Method 3: Trigger wake event to force session refresh
      try {
        await fetch(`${process.env.OPENCLAW_GATEWAY_URL}/cron/wake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`
          },
          body: JSON.stringify({
            sessionTarget: 'main',
            event: 'boost_restart_wake',
            agentId
          }),
          signal: AbortSignal.timeout(5000)
        });
      } catch (wakeError) {
        // Non-critical, continue
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async waitForFreshSession(
    agentId: string,
    timeoutMs: number
  ): Promise<SessionState | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check for new heartbeat from agent
        const { data: heartbeat, error } = await this.supabase
          .from('worker_heartbeats')
          .select('*')
          .eq('worker_id', agentId)
          .order('last_heartbeat_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && heartbeat) {
          const heartbeatTime = new Date(heartbeat.last_heartbeat_at).getTime();
          const isFresh = heartbeatTime > startTime;
          
          if (isFresh) {
            const metadata = heartbeat.metadata || {};
            return {
              session_id: `${agentId}-${heartbeat.last_heartbeat_at}`,
              context_tokens: metadata.context_tokens_used || metadata.context_tokens || 0,
              max_context: metadata.max_context_tokens || metadata.max_context || 262000,
              status: 'active',
              last_activity: heartbeat.last_heartbeat_at,
              agent_version: metadata.agent_version,
              model: metadata.model
            };
          }
        }

        // Also check agent_sessions
        const { data: session, error: sessionError } = await this.supabase
          .from('agent_sessions')
          .select('*')
          .eq('agent_id', agentId)
          .order('last_activity', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sessionError && session) {
          const sessionTime = new Date(session.last_activity).getTime();
          if (sessionTime > startTime) {
            return {
              session_id: session.id,
              context_tokens: session.context_tokens || 0,
              max_context: session.max_context || 262000,
              status: session.status,
              last_activity: session.last_activity,
              agent_version: session.agent_version,
              model: session.model
            };
          }
        }
      } catch (error) {
        console.error('[BoostRestart] Error polling for fresh session:', error);
      }

      await this.delay(HEARTBEAT_POLL_INTERVAL_MS);
    }

    return null;
  }

  private async waitForLockAcquisition(
    agentId: string,
    timeoutMs: number
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to acquire execution lease
        const { data: lease, error } = await this.supabase
          .from('execution_leases')
          .insert({
            agent_id: agentId,
            acquired_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 300000).toISOString(), // 5 min lease
            lock_type: 'boost_restart'
          })
          .select()
          .single();

        if (!error && lease) {
          return true;
        }

        // Check if we got the lock
        const { data: existing } = await this.supabase
          .from('execution_leases')
          .select('*')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (existing && existing.agent_id === agentId) {
          return true;
        }
      } catch (error) {
        console.error('[BoostRestart] Error acquiring lock:', error);
      }

      await this.delay(1000);
    }

    return false;
  }

  private async rollbackRestart(
    agentId: string,
    preState: SessionState,
    snapshotId: string | null
  ): Promise<void> {
    console.log(`[BoostRestart] Rolling back restart for ${agentId}`);
    
    try {
      // Restore session status
      await this.supabase.from('agent_sessions').update({
        status: preState.status === 'terminated' ? 'active' : preState.status,
        rollback_applied: true,
        rollback_at: new Date().toISOString(),
        rollback_snapshot_id: snapshotId
      }).eq('agent_id', agentId);

      // Clear any stuck leases
      await this.supabase.from('execution_leases')
        .delete()
        .eq('agent_id', agentId)
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('[BoostRestart] Rollback failed:', error);
      throw error;
    }
  }

  private async cleanupOldSessions(
    agentId: string,
    currentSessionId: string
  ): Promise<void> {
    try {
      // Mark old sessions as archived
      await this.supabase.from('agent_sessions').update({
        status: 'archived',
        archived_at: new Date().toISOString()
      })
        .eq('agent_id', agentId)
        .neq('id', currentSessionId);
    } catch (error) {
      console.error('[BoostRestart] Cleanup error:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const boostRestartService = new BoostRestartService();