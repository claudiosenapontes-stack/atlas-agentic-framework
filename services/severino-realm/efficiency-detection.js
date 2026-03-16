/**
 * Severino Realm - Agent Efficiency Detection Service
 * Feature 3: Backend logic to classify agent efficiency
 */

const { createClient } = require('@supabase/supabase-js');

class AgentEfficiencyService {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Thresholds for efficiency classification
    this.thresholds = {
      contextUsage: {
        healthy: 50,
        warning: 70,
        degraded: 85,
        critical: 95
      },
      responseLatency: {
        healthy: 2000,   // 2s
        warning: 5000,   // 5s
        degraded: 10000, // 10s
        critical: 30000  // 30s
      },
      sessionAge: {
        healthy: 30,     // 30 min
        warning: 60,     // 1 hour
        degraded: 120,   // 2 hours
        critical: 240    // 4 hours
      },
      stalledTasks: {
        healthy: 0,
        warning: 1,
        degraded: 3,
        critical: 5
      },
      heartbeatFreshness: {
        healthy: 10,     // 10s
        warning: 30,     // 30s
        degraded: 60,    // 1 min
        critical: 120    // 2 min
      }
    };
  }

  /**
   * Calculate efficiency metrics for an agent
   */
  async calculateEfficiency(agentId) {
    console.log(`[Efficiency] Calculating for agent: ${agentId}`);

    // Gather signals
    const signals = await this.gatherSignals(agentId);
    
    // Calculate derived state
    const state = this.deriveEfficiencyState(signals);
    
    // Determine if restart recommended
    const restartRecommended = this.isRestartRecommended(state, signals);
    
    // Store metrics
    await this.storeEfficiencyMetrics(agentId, signals, state, restartRecommended);
    
    return {
      agentId,
      timestamp: new Date().toISOString(),
      signals,
      state,
      restartRecommended,
      factors: state.factors
    };
  }

  /**
   * Gather all efficiency signals for an agent
   */
  async gatherSignals(agentId) {
    const signals = {
      contextUsage: 0,
      responseLatency: 0,
      sessionAge: 0,
      stalledTasks: 0,
      heartbeatFreshness: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      consecutiveErrors: 0
    };

    // 1. Get agent heartbeat data
    const { data: heartbeat } = await this.supabase
      .from('worker_heartbeats')
      .select('*')
      .eq('worker_id', agentId)
      .single();

    if (heartbeat) {
      // Calculate context usage (if available)
      signals.contextUsage = heartbeat.context_usage_pct || 
        this.estimateContextUsage(heartbeat);
      
      // Calculate session age
      const sessionStart = new Date(heartbeat.session_started_at || heartbeat.created_at);
      signals.sessionAge = Math.floor((Date.now() - sessionStart.getTime()) / 60000);
      
      // Calculate heartbeat freshness
      const lastHeartbeat = new Date(heartbeat.last_heartbeat_at || heartbeat.updated_at);
      signals.heartbeatFreshness = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000);
      
      // Memory usage if available
      signals.memoryUsage = heartbeat.memory_usage_mb || 0;
      signals.cpuUsage = heartbeat.cpu_usage_pct || 0;
    }

    // 2. Get recent execution attempts for latency calculation
    const { data: attempts } = await this.supabase
      .from('execution_attempts')
      .select('created_at, completed_at, error_message')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (attempts && attempts.length > 0) {
      // Calculate average response latency
      const latencies = attempts
        .filter(a => a.completed_at)
        .map(a => {
          const start = new Date(a.created_at);
          const end = new Date(a.completed_at);
          return end.getTime() - start.getTime();
        });
      
      signals.responseLatency = latencies.length > 0 
        ? Math.floor(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      
      // Count consecutive errors
      let errorCount = 0;
      for (const attempt of attempts) {
        if (attempt.error_message) {
          errorCount++;
        } else {
          break;
        }
      }
      signals.consecutiveErrors = errorCount;
    }

    // 3. Count stalled tasks
    const { data: stalled } = await this.supabase
      .from('executions')
      .select('id', { count: 'exact' })
      .eq('status', 'running')
      .eq('lease_owner', agentId)
      .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    signals.stalledTasks = stalled?.length || 0;

    return signals;
  }

  /**
   * Estimate context usage based on session age and activity
   */
  estimateContextUsage(heartbeat) {
    // Fallback estimation if context_usage_pct not available
    const sessionAge = heartbeat.session_started_at 
      ? (Date.now() - new Date(heartbeat.session_started_at).getTime()) / 60000
      : 0;
    
    // Rough estimate: 10% per 15 minutes of session
    return Math.min(95, Math.floor(sessionAge / 15) * 10);
  }

  /**
   * Derive efficiency state from signals
   */
  deriveEfficiencyState(signals) {
    const factors = [];
    let worstState = 'healthy';
    const statePriority = ['healthy', 'warning', 'degraded', 'restart_recommended', 'critical'];

    // Check context usage
    if (signals.contextUsage >= this.thresholds.contextUsage.critical) {
      factors.push({ factor: 'context_usage', severity: 'critical', value: signals.contextUsage });
      worstState = 'critical';
    } else if (signals.contextUsage >= this.thresholds.contextUsage.degraded) {
      factors.push({ factor: 'context_usage', severity: 'degraded', value: signals.contextUsage });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    } else if (signals.contextUsage >= this.thresholds.contextUsage.warning) {
      factors.push({ factor: 'context_usage', severity: 'warning', value: signals.contextUsage });
      if (statePriority.indexOf('warning') > statePriority.indexOf(worstState)) {
        worstState = 'warning';
      }
    }

    // Check response latency
    if (signals.responseLatency >= this.thresholds.responseLatency.critical) {
      factors.push({ factor: 'response_latency', severity: 'critical', value: signals.responseLatency });
      worstState = 'critical';
    } else if (signals.responseLatency >= this.thresholds.responseLatency.degraded) {
      factors.push({ factor: 'response_latency', severity: 'degraded', value: signals.responseLatency });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    } else if (signals.responseLatency >= this.thresholds.responseLatency.warning) {
      factors.push({ factor: 'response_latency', severity: 'warning', value: signals.responseLatency });
      if (statePriority.indexOf('warning') > statePriority.indexOf(worstState)) {
        worstState = 'warning';
      }
    }

    // Check session age
    if (signals.sessionAge >= this.thresholds.sessionAge.critical) {
      factors.push({ factor: 'session_age', severity: 'critical', value: signals.sessionAge });
      worstState = 'critical';
    } else if (signals.sessionAge >= this.thresholds.sessionAge.degraded) {
      factors.push({ factor: 'session_age', severity: 'degraded', value: signals.sessionAge });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    } else if (signals.sessionAge >= this.thresholds.sessionAge.warning) {
      factors.push({ factor: 'session_age', severity: 'warning', value: signals.sessionAge });
      if (statePriority.indexOf('warning') > statePriority.indexOf(worstState)) {
        worstState = 'warning';
      }
    }

    // Check stalled tasks
    if (signals.stalledTasks >= this.thresholds.stalledTasks.critical) {
      factors.push({ factor: 'stalled_tasks', severity: 'critical', value: signals.stalledTasks });
      worstState = 'critical';
    } else if (signals.stalledTasks >= this.thresholds.stalledTasks.degraded) {
      factors.push({ factor: 'stalled_tasks', severity: 'degraded', value: signals.stalledTasks });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    } else if (signals.stalledTasks >= this.thresholds.stalledTasks.warning) {
      factors.push({ factor: 'stalled_tasks', severity: 'warning', value: signals.stalledTasks });
      if (statePriority.indexOf('warning') > statePriority.indexOf(worstState)) {
        worstState = 'warning';
      }
    }

    // Check heartbeat freshness
    if (signals.heartbeatFreshness >= this.thresholds.heartbeatFreshness.critical) {
      factors.push({ factor: 'heartbeat_stale', severity: 'critical', value: signals.heartbeatFreshness });
      worstState = 'critical';
    } else if (signals.heartbeatFreshness >= this.thresholds.heartbeatFreshness.degraded) {
      factors.push({ factor: 'heartbeat_stale', severity: 'degraded', value: signals.heartbeatFreshness });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    }

    // Check consecutive errors
    if (signals.consecutiveErrors >= 3) {
      factors.push({ factor: 'consecutive_errors', severity: 'critical', value: signals.consecutiveErrors });
      worstState = 'critical';
    } else if (signals.consecutiveErrors >= 2) {
      factors.push({ factor: 'consecutive_errors', severity: 'degraded', value: signals.consecutiveErrors });
      if (statePriority.indexOf('degraded') > statePriority.indexOf(worstState)) {
        worstState = 'degraded';
      }
    }

    return {
      state: worstState,
      factors: factors
    };
  }

  /**
   * Determine if restart is recommended based on state
   */
  isRestartRecommended(state, signals) {
    // Restart recommended if:
    // 1. Context usage > 70%
    // 2. OR Response latency > threshold (5s)
    // 3. OR Session age > threshold (1 hour)
    // 4. OR Stalled tasks detected
    // 5. OR State is degraded/critical

    if (state.state === 'critical') {
      return true;
    }

    if (state.state === 'degraded') {
      return true;
    }

    if (signals.contextUsage >= this.thresholds.contextUsage.warning) {
      return true;
    }

    if (signals.responseLatency >= this.thresholds.responseLatency.warning) {
      return true;
    }

    if (signals.sessionAge >= this.thresholds.sessionAge.warning) {
      return true;
    }

    if (signals.stalledTasks >= this.thresholds.stalledTasks.warning) {
      return true;
    }

    return false;
  }

  /**
   * Store efficiency metrics in database
   */
  async storeEfficiencyMetrics(agentId, signals, state, restartRecommended) {
    // Get current task/execution
    const { data: heartbeat } = await this.supabase
      .from('worker_heartbeats')
      .select('current_task_id, current_execution_id, session_id')
      .eq('worker_id', agentId)
      .single();

    const metrics = {
      agent_id: agentId,
      session_id: heartbeat?.session_id,
      context_usage_pct: signals.contextUsage,
      response_latency_ms: signals.responseLatency,
      session_age_minutes: signals.sessionAge,
      heartbeat_freshness_sec: signals.heartbeatFreshness,
      stalled_task_count: signals.stalledTasks,
      consecutive_errors: signals.consecutiveErrors,
      memory_usage_mb: signals.memoryUsage,
      cpu_usage_pct: signals.cpuUsage,
      efficiency_state: state.state,
      state_factors: state.factors,
      current_task_id: heartbeat?.current_task_id,
      current_execution_id: heartbeat?.current_execution_id,
      measured_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('agent_efficiency_metrics')
      .insert(metrics);

    if (error) {
      console.error('[Efficiency] Error storing metrics:', error);
    }

    // Also update worker_heartbeat with current efficiency state
    await this.supabase
      .from('worker_heartbeats')
      .update({
        efficiency_state: state.state,
        restart_recommended: restartRecommended,
        updated_at: new Date().toISOString()
      })
      .eq('worker_id', agentId);
  }

  /**
   * Get efficiency summary for all agents
   */
  async getFleetEfficiencySummary() {
    const { data: agents } = await this.supabase
      .from('worker_heartbeats')
      .select('worker_id, efficiency_state, restart_recommended, status');

    if (!agents) {
      return {
        total: 0,
        healthy: 0,
        warning: 0,
        degraded: 0,
        critical: 0,
        restartRecommended: 0
      };
    }

    const summary = {
      total: agents.length,
      healthy: agents.filter(a => a.efficiency_state === 'healthy').length,
      warning: agents.filter(a => a.efficiency_state === 'warning').length,
      degraded: agents.filter(a => a.efficiency_state === 'degraded').length,
      critical: agents.filter(a => a.efficiency_state === 'critical').length,
      restartRecommended: agents.filter(a => a.restart_recommended).length,
      agentsNeedingRestart: agents
        .filter(a => a.restart_recommended)
        .map(a => a.worker_id)
    };

    return summary;
  }

  /**
   * Run efficiency scan on all agents
   */
  async runFleetEfficiencyScan() {
    console.log('[Efficiency] Running fleet-wide efficiency scan');

    const { data: agents } = await this.supabase
      .from('worker_heartbeats')
      .select('worker_id')
      .eq('status', 'active');

    const results = [];
    for (const agent of agents || []) {
      const result = await this.calculateEfficiency(agent.worker_id);
      results.push(result);
    }

    return {
      scannedAt: new Date().toISOString(),
      agentsScanned: results.length,
      results: results,
      summary: await this.getFleetEfficiencySummary()
    };
  }
}

module.exports = { AgentEfficiencyService };
