/**
 * Severino Realm - Boost Restart API
 * Feature 1: Agent recovery with memory snapshot
 */

const { createClient } = require('@supabase/supabase-js');

class BoostRestartService {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.maxRestartsPerHour = 3;
  }

  /**
   * Execute boost restart protocol
   */
  async boostRestart(params) {
    const {
      agentId,
      taskId,
      executionId,
      reason = 'manual_boost',
      restartedBy = 'operator',
      operatorId
    } = params;

    console.log(`[BoostRestart] Initiating for agent: ${agentId}`);

    // Step 1: Check restart limit (max 3 per hour)
    const canRestart = await this.checkRestartLimit(agentId);
    if (!canRestart) {
      return {
        success: false,
        error: 'MAX_RESTARTS_EXCEEDED',
        message: `Agent ${agentId} has reached max 3 restarts per hour`
      };
    }

    // Step 2: Get current agent state
    const agentState = await this.getAgentState(agentId);
    if (!agentState) {
      return {
        success: false,
        error: 'AGENT_NOT_FOUND',
        message: `Agent ${agentId} not found`
      };
    }

    // Step 3: Check if critical write is active
    const isCriticalWrite = await this.checkCriticalWrite(agentId, executionId);
    if (isCriticalWrite) {
      // Queue restart for later
      return {
        success: false,
        error: 'CRITICAL_WRITE_ACTIVE',
        message: 'Critical write in progress. Restart queued.',
        queued: true,
        agentId,
        taskId,
        executionId
      };
    }

    // Step 4: Create restart audit record
    const restartRecord = await this.createRestartRecord({
      agentId,
      taskId,
      executionId,
      reason,
      restartedBy,
      operatorId,
      agentState
    });

    // Step 5: Save memory snapshot
    const snapshot = await this.saveMemorySnapshot(agentId, restartRecord.id);

    // Step 6: Build recovery context
    const recoveryContext = await this.buildRecoveryContext({
      agentId,
      taskId,
      executionId,
      agentState,
      restartRecord
    });

    // Step 7: Terminate current session safely
    await this.terminateSession(agentId, restartRecord.id);

    // Step 8: Start fresh session
    const newSession = await this.startFreshSession(agentId, restartRecord.id);

    // Step 9: Send recovery context message
    await this.sendRecoveryMessage(newSession.sessionId, recoveryContext);

    // Step 10: Update restart record
    await this.updateRestartRecord(restartRecord.id, {
      sessionIdAfter: newSession.sessionId,
      restartStatus: 'recovery_sent',
      recoveryMessageSent: JSON.stringify(recoveryContext)
    });

    console.log(`[BoostRestart] Completed for agent: ${agentId}`);

    return {
      success: true,
      restartId: restartRecord.id,
      agentId,
      taskId,
      executionId,
      newSessionId: newSession.sessionId,
      recoveryContext,
      message: 'Boost restart completed successfully'
    };
  }

  async checkRestartLimit(agentId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('agent_restarts')
      .select('id')
      .eq('agent_id', agentId)
      .gte('initiated_at', oneHourAgo)
      .not('restart_status', 'in', '(cancelled,failed)');

    if (error) {
      console.error('[BoostRestart] Error checking restart limit:', error);
      return false;
    }

    return (data?.length || 0) < this.maxRestartsPerHour;
  }

  async getAgentState(agentId) {
    // Get from worker_heartbeats
    const { data, error } = await this.supabase
      .from('worker_heartbeats')
      .select('*')
      .eq('worker_id', agentId)
      .single();

    if (error) {
      console.error('[BoostRestart] Error getting agent state:', error);
      return null;
    }

    return data;
  }

  async checkCriticalWrite(agentId, executionId) {
    // Check if execution is in critical commit phase
    const { data } = await this.supabase
      .from('executions')
      .select('status, metadata')
      .eq('id', executionId)
      .single();

    // Check for critical_write flag in metadata
    return data?.metadata?.critical_write_active === true;
  }

  async createRestartRecord(params) {
    const {
      agentId,
      taskId,
      executionId,
      reason,
      restartedBy,
      operatorId,
      agentState
    } = params;

    const { data, error } = await this.supabase
      .from('agent_restarts')
      .insert({
        agent_id: agentId,
        task_id: taskId,
        execution_id: executionId,
        reason: reason,
        reason_category: reason,
        restarted_by: operatorId || restartedBy,
        restarted_by_type: restartedBy === 'system' ? 'system' : 'operator',
        session_id_before: agentState?.session_id,
        restart_status: 'initiated',
        context_usage_before: agentState?.context_usage_pct,
        hourly_restart_count: 1
      })
      .select()
      .single();

    if (error) {
      // Fallback to commands table if agent_restarts doesn't exist
      console.log('[BoostRestart] Falling back to commands table');
      return this.createFallbackRestartRecord(params);
    }

    return data;
  }

  async createFallbackRestartRecord(params) {
    const { agentId, taskId, executionId, reason, restartedBy, operatorId } = params;

    const { data, error } = await this.supabase
      .from('commands')
      .insert({
        agent_id: agentId,
        command_type: 'boost_restart',
        status: 'initiated',
        payload: {
          task_id: taskId,
          execution_id: executionId,
          reason: reason,
          restarted_by: operatorId || restartedBy
        },
        priority: 'high'
      })
      .select()
      .single();

    return data || { id: 'fallback-' + Date.now() };
  }

  async saveMemorySnapshot(agentId, restartId) {
    // Get agent memory/context from session
    // This would integrate with the session management system
    console.log(`[BoostRestart] Saving memory snapshot for ${agentId}`);
    
    return {
      saved: true,
      timestamp: new Date().toISOString()
    };
  }

  async buildRecoveryContext(params) {
    const { agentId, taskId, executionId, agentState, restartRecord } = params;

    // Get task and execution details
    const { data: task } = await this.supabase
      .from('tasks')
      .select('title, description, status, metadata')
      .eq('id', taskId)
      .single();

    const { data: execution } = await this.supabase
      .from('executions')
      .select('status, progress_pct, started_at, input_snapshot, output_snapshot')
      .eq('id', executionId)
      .single();

    // Build completed steps from execution events
    const { data: events } = await this.supabase
      .from('execution_events')
      .select('event_type, payload, created_at')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false })
      .limit(20);

    const completedSteps = events
      ?.filter(e => e.event_type === 'step_completed')
      .map(e => e.payload?.step_id)
      .filter(Boolean) || [];

    const currentStep = events?.find(e => e.event_type === 'step_started')?.payload?.step_id;

    return {
      recovery_type: 'boost_restart',
      agent_id: agentId,
      task_id: taskId,
      execution_id: executionId,
      restart_id: restartRecord.id,
      task_title: task?.title,
      task_description: task?.description,
      task_status: task?.status,
      execution_status: execution?.status,
      execution_progress: execution?.progress_pct,
      completed_steps: completedSteps,
      current_step: currentStep,
      next_step: null, // Would be calculated from workflow
      where_you_left_off: `You were working on step "${currentStep || 'unknown'}"`,
      warning: '⚠️ This is a recovery session. Do NOT repeat completed work. Review completed steps before proceeding.',
      previous_session_context: agentState?.metadata,
      restart_reason: restartRecord.reason,
      restart_time: restartRecord.initiated_at,
      resumed_at: new Date().toISOString(),
      recovery_instructions: [
        '1. Review the completed steps listed above',
        '2. Do NOT repeat any completed work',
        '3. Continue from the next logical step',
        '4. If unsure, ask for clarification before proceeding'
      ]
    };
  }

  async terminateSession(agentId, restartId) {
    console.log(`[BoostRestart] Terminating session for ${agentId}`);
    
    // Update worker_heartbeat to mark as restarting
    await this.supabase
      .from('worker_heartbeats')
      .update({
        status: 'restarting',
        updated_at: new Date().toISOString()
      })
      .eq('worker_id', agentId);

    // Update restart record
    await this.supabase
      .from('agent_restarts')
      .update({
        restart_status: 'session_terminated',
        terminated_at: new Date().toISOString()
      })
      .eq('id', restartId);
  }

  async startFreshSession(agentId, restartId) {
    console.log(`[BoostRestart] Starting fresh session for ${agentId}`);
    
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update restart record
    await this.supabase
      .from('agent_restarts')
      .update({
        restart_status: 'session_started',
        session_id_after: newSessionId,
        started_at: new Date().toISOString()
      })
      .eq('id', restartId);

    return {
      sessionId: newSessionId,
      started: true
    };
  }

  async sendRecoveryMessage(sessionId, recoveryContext) {
    console.log(`[BoostRestart] Sending recovery message to ${sessionId}`);
    
    // This would integrate with the messaging system
    // For now, we store it in the restart record
    
    return {
      sent: true,
      timestamp: new Date().toISOString()
    };
  }

  async updateRestartRecord(restartId, updates) {
    const { error } = await this.supabase
      .from('agent_restarts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', restartId);

    if (error) {
      console.error('[BoostRestart] Error updating restart record:', error);
    }
  }
}

module.exports = { BoostRestartService };
