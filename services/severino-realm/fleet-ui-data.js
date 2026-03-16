/**
 * ATLAS-FLEET-UI-DATA-FINALIZE-1287
 * Fleet Page Live Data Payload Service
 * Returns hydrated agent cards with all required fields
 */

const { createClient } = require('@supabase/supabase-js');

class FleetUIDataService {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  /**
   * Get live fleet data payload for UI
   * Returns fully hydrated agent cards
   */
  async getFleetDataPayload() {
    console.log('[FleetUI] Generating live fleet data payload');

    // Get all agents from worker_heartbeats
    const { data: agents, error } = await this.supabase
      .from('worker_heartbeats')
      .select(`
        worker_id,
        status,
        current_task_id,
        current_execution_id,
        context_usage_pct,
        efficiency_state,
        restart_recommended,
        last_heartbeat_at,
        session_started_at,
        metadata,
        updated_at
      `);

    if (error) {
      console.error('[FleetUI] Error fetching agents:', error);
      return { agents: [], error: error.message };
    }

    // Hydrate each agent card with additional data
    const hydratedAgents = await Promise.all(
      (agents || []).map(async (agent) => {
        return this.hydrateAgentCard(agent);
      })
    );

    return {
      agents: hydratedAgents,
      generated_at: new Date().toISOString(),
      count: hydratedAgents.length
    };
  }

  /**
   * Hydrate a single agent card with all required fields
   */
  async hydrateAgentCard(agent) {
    const now = Date.now();
    const workerId = agent.worker_id;

    // Calculate session age in minutes
    const sessionAge = agent.session_started_at
      ? Math.floor((now - new Date(agent.session_started_at).getTime()) / 60000)
      : 0;

    // Calculate responsiveness (seconds since last heartbeat)
    const lastHeartbeat = agent.last_heartbeat_at
      ? new Date(agent.last_heartbeat_at).getTime()
      : 0;
    const responsivenessSeconds = lastHeartbeat
      ? Math.floor((now - lastHeartbeat) / 1000)
      : null;

    // Determine heartbeat status
    let heartbeatStatus = 'unknown';
    if (responsivenessSeconds === null) {
      heartbeatStatus = 'never';
    } else if (responsivenessSeconds < 10) {
      heartbeatStatus = 'live';
    } else if (responsivenessSeconds < 30) {
      heartbeatStatus = 'recent';
    } else if (responsivenessSeconds < 120) {
      heartbeatStatus = 'stale';
    } else {
      heartbeatStatus = 'expired';
    }

    // Get current task details
    let currentTask = null;
    if (agent.current_task_id) {
      const { data: task } = await this.supabase
        .from('tasks')
        .select('title, description, status')
        .eq('id', agent.current_task_id)
        .single();
      currentTask = task ? {
        id: agent.current_task_id,
        title: task.title,
        status: task.status
      } : { id: agent.current_task_id, title: 'Unknown Task', status: 'unknown' };
    }

    // Get last execution details
    let lastExecution = null;
    if (agent.current_execution_id) {
      const { data: execution } = await this.supabase
        .from('executions')
        .select('status, progress_pct, started_at, completed_at')
        .eq('id', agent.current_execution_id)
        .single();
      lastExecution = execution ? {
        id: agent.current_execution_id,
        status: execution.status,
        progress: execution.progress_pct,
        started_at: execution.started_at,
        completed_at: execution.completed_at
      } : null;
    }

    // Get last restart info
    let lastRestart = null;
    try {
      const { data: restarts } = await this.supabase
        .from('agent_restarts')
        .select('initiated_at, restart_status, reason, restarted_by')
        .eq('agent_id', workerId)
        .order('initiated_at', { ascending: false })
        .limit(1);

      if (restarts && restarts.length > 0) {
        const restart = restarts[0];
        lastRestart = {
          at: restart.initiated_at,
          status: restart.restart_status,
          reason: restart.reason,
          by: restart.restarted_by
        };
      }
    } catch (e) {
      // Table may not exist yet
      lastRestart = null;
    }

    // Build the agent card payload
    return {
      agent_id: workerId,
      status: agent.status || 'unknown',
      current_task: currentTask,
      responsiveness: {
        seconds_ago: responsivenessSeconds,
        status: heartbeatStatus,
        last_heartbeat: agent.last_heartbeat_at
      },
      context_usage: {
        percentage: agent.context_usage_pct || 0,
        state: this.getContextUsageState(agent.context_usage_pct)
      },
      heartbeat_status: heartbeatStatus,
      efficiency_state: agent.efficiency_state || 'unknown',
      last_execution: lastExecution,
      session_age: {
        minutes: sessionAge,
        formatted: this.formatDuration(sessionAge)
      },
      last_restart: lastRestart,
      restart_recommended: agent.restart_recommended || false,
      updated_at: agent.updated_at
    };
  }

  /**
   * Get context usage state
   */
  getContextUsageState(percentage) {
    if (!percentage) return 'unknown';
    if (percentage < 50) return 'healthy';
    if (percentage < 70) return 'elevated';
    if (percentage < 85) return 'high';
    return 'critical';
  }

  /**
   * Format duration in minutes to human readable
   */
  formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  }

  /**
   * Get Boost Restart action state model for an agent
   */
  async getBoostRestartStateModel(agentId) {
    console.log(`[FleetUI] Getting boost restart state for ${agentId}`);

    // Check for active restart
    let activeRestart = null;
    try {
      const { data: restarts } = await this.supabase
        .from('agent_restarts')
        .select('id, restart_status, initiated_at, snapshot_saved_at, terminated_at, started_at, resumed_at, failed_at')
        .eq('agent_id', agentId)
        .in('restart_status', ['initiated', 'snapshot_saved', 'session_terminated', 'session_started', 'recovery_sent'])
        .order('initiated_at', { ascending: false })
        .limit(1);

      if (restarts && restarts.length > 0) {
        activeRestart = restarts[0];
      }
    } catch (e) {
      // Table may not exist
    }

    // Map database status to UI state model
    if (!activeRestart) {
      return {
        state: 'idle',
        display: 'Idle',
        can_restart: true,
        progress: null,
        restart_id: null
      };
    }

    const status = activeRestart.restart_status;
    const stateMap = {
      'initiated': {
        state: 'snapshot_saved',
        display: 'Saving Snapshot...',
        can_restart: false,
        progress: 20
      },
      'snapshot_saved': {
        state: 'snapshot_saved',
        display: 'Snapshot Saved',
        can_restart: false,
        progress: 40
      },
      'session_terminated': {
        state: 'restarting',
        display: 'Restarting...',
        can_restart: false,
        progress: 60
      },
      'session_started': {
        state: 'restarting',
        display: 'Session Started',
        can_restart: false,
        progress: 70
      },
      'recovery_sent': {
        state: 'context_restored',
        display: 'Context Restored',
        can_restart: false,
        progress: 90
      },
      'resumed': {
        state: 'resumed',
        display: 'Resumed',
        can_restart: true,
        progress: 100
      },
      'failed': {
        state: 'failed',
        display: 'Failed',
        can_restart: true,
        progress: null,
        error: true
      },
      'cancelled': {
        state: 'failed',
        display: 'Cancelled',
        can_restart: true,
        progress: null,
        error: true
      }
    };

    const mapped = stateMap[status] || {
      state: 'idle',
      display: 'Unknown',
      can_restart: true,
      progress: null
    };

    return {
      ...mapped,
      restart_id: activeRestart.id,
      initiated_at: activeRestart.initiated_at,
      completed_at: activeRestart.resumed_at || activeRestart.failed_at
    };
  }

  /**
   * Get all boost restart states for fleet
   */
  async getAllBoostRestartStates() {
    const { data: agents } = await this.supabase
      .from('worker_heartbeats')
      .select('worker_id');

    const states = {};
    for (const agent of agents || []) {
      states[agent.worker_id] = await this.getBoostRestartStateModel(agent.worker_id);
    }

    return states;
  }
}

module.exports = { FleetUIDataService };
