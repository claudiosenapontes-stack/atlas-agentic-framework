/**
 * Severino Realm - Fleet Commands Service
 * Feature 4: Global control actions for fleet management
 */

const { createClient } = require('@supabase/supabase-js');
const { BoostRestartService } = require('./boost-restart');
const { AgentEfficiencyService } = require('./efficiency-detection');

class FleetCommandsService {
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.boostService = new BoostRestartService(config);
    this.efficiencyService = new AgentEfficiencyService(config);
  }

  /**
   * Command 1: Run Fleet Audit
   */
  async runFleetAudit(options = {}) {
    const { dryRun = false, initiatedBy = 'system' } = options;
    console.log(`[FleetCommand] Running fleet audit (dryRun: ${dryRun})`);

    const commandId = await this.createCommandRecord({
      commandType: 'fleet_audit',
      initiatedBy,
      dryRun,
      parameters: options
    });

    try {
      const auditResults = {
        timestamp: new Date().toISOString(),
        agents: {},
        issues: [],
        recommendations: []
      };

      // Get all agents
      const { data: agents } = await this.supabase
        .from('worker_heartbeats')
        .select('*');

      auditResults.agents.total = agents?.length || 0;
      auditResults.agents.online = agents?.filter(a => a.status === 'active').length || 0;
      auditResults.agents.stale = agents?.filter(a => a.status === 'stale').length || 0;
      auditResults.agents.expired = agents?.filter(a => a.status === 'expired').length || 0;

      // Check efficiency
      const efficiencySummary = await this.efficiencyService.getFleetEfficiencySummary();
      auditResults.agents.efficiency = efficiencySummary;

      await this.updateCommandRecord(commandId, {
        status: 'completed',
        agentsAffected: agents?.length || 0,
        resultSummary: auditResults
      });

      return {
        success: true,
        commandId,
        dryRun,
        audit: auditResults
      };

    } catch (error) {
      await this.updateCommandRecord(commandId, {
        status: 'failed',
        errorLog: error.message
      });
      return { success: false, commandId, error: error.message };
    }
  }

  /**
   * Command 2: Pause All Agents
   */
  async pauseAllAgents(options = {}) {
    const { dryRun = false, initiatedBy = 'system' } = options;
    console.log(`[FleetCommand] Pausing all agents (dryRun: ${dryRun})`);

    const commandId = await this.createCommandRecord({
      commandType: 'pause_all_agents',
      initiatedBy,
      dryRun,
      parameters: options
    });

    const results = { paused: [], failed: [], skipped: [] };

    try {
      const { data: agents } = await this.supabase
        .from('worker_heartbeats')
        .select('worker_id')
        .eq('status', 'active');

      for (const agent of agents || []) {
        if (dryRun) {
          results.paused.push(agent.worker_id);
          continue;
        }

        const { error } = await this.supabase
          .from('worker_heartbeats')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('worker_id', agent.worker_id);

        if (error) results.failed.push({ agentId: agent.worker_id, error: error.message });
        else results.paused.push(agent.worker_id);
      }

      await this.updateCommandRecord(commandId, {
        status: 'completed',
        agentsAffected: agents?.length || 0,
        agentsSuccess: results.paused.length,
        resultSummary: results
      });

      return { success: true, commandId, dryRun, results };

    } catch (error) {
      await this.updateCommandRecord(commandId, { status: 'failed', errorLog: error.message });
      return { success: false, commandId, error: error.message };
    }
  }

  /**
   * Command 3: Resume All Agents
   */
  async resumeAllAgents(options = {}) {
    const { dryRun = false, initiatedBy = 'system' } = options;
    console.log(`[FleetCommand] Resuming all agents (dryRun: ${dryRun})`);

    const commandId = await this.createCommandRecord({
      commandType: 'resume_all_agents',
      initiatedBy,
      dryRun,
      parameters: options
    });

    const results = { resumed: [], failed: [] };

    try {
      const { data: agents } = await this.supabase
        .from('worker_heartbeats')
        .select('worker_id')
        .eq('status', 'paused');

      for (const agent of agents || []) {
        if (dryRun) {
          results.resumed.push(agent.worker_id);
          continue;
        }

        const { error } = await this.supabase
          .from('worker_heartbeats')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('worker_id', agent.worker_id);

        if (error) results.failed.push({ agentId: agent.worker_id, error: error.message });
        else results.resumed.push(agent.worker_id);
      }

      await this.updateCommandRecord(commandId, {
        status: 'completed',
        agentsAffected: agents?.length || 0,
        agentsSuccess: results.resumed.length,
        resultSummary: results
      });

      return { success: true, commandId, dryRun, results };

    } catch (error) {
      await this.updateCommandRecord(commandId, { status: 'failed', errorLog: error.message });
      return { success: false, commandId, error: error.message };
    }
  }

  /**
   * Command 4: Boost Restart All Stuck Agents
   */
  async boostRestartStuckAgents(options = {}) {
    const { dryRun = false, initiatedBy = 'system' } = options;
    console.log(`[FleetCommand] Boost restarting stuck agents (dryRun: ${dryRun})`);

    const commandId = await this.createCommandRecord({
      commandType: 'boost_restart_stuck',
      initiatedBy,
      dryRun,
      parameters: options
    });

    const results = { restarted: [], failed: [], skipped: [], dryRunList: [] };

    try {
      const { data: stuckAgents } = await this.supabase
        .from('worker_heartbeats')
        .select('worker_id, current_task_id, current_execution_id')
        .or('status.eq.stale,status.eq.expired');

      for (const agent of stuckAgents || []) {
        if (dryRun) {
          results.dryRunList.push(agent.worker_id);
          continue;
        }

        try {
          const restartResult = await this.boostService.boostRestart({
            agentId: agent.worker_id,
            taskId: agent.current_task_id,
            executionId: agent.current_execution_id,
            reason: 'fleet_command_stuck_restart',
            restartedBy: 'system'
          });

          if (restartResult.success) {
            results.restarted.push({ agentId: agent.worker_id, restartId: restartResult.restartId });
          } else if (restartResult.queued) {
            results.skipped.push({ agentId: agent.worker_id, reason: 'queued' });
          } else {
            results.failed.push({ agentId: agent.worker_id, error: restartResult.error });
          }
        } catch (error) {
          results.failed.push({ agentId: agent.worker_id, error: error.message });
        }
      }

      await this.updateCommandRecord(commandId, {
        status: 'completed',
        agentsAffected: stuckAgents?.length || 0,
        agentsSuccess: results.restarted.length,
        resultSummary: results
      });

      return { success: true, commandId, dryRun, results };

    } catch (error) {
      await this.updateCommandRecord(commandId, { status: 'failed', errorLog: error.message });
      return { success: false, commandId, error: error.message };
    }
  }

  async createCommandRecord(params) {
    const { commandType, initiatedBy, dryRun, parameters } = params;
    const { data } = await this.supabase
      .from('fleet_commands')
      .insert({
        command_type: commandType,
        initiated_by: initiatedBy,
        dry_run: dryRun,
        parameters: parameters,
        status: 'running'
      })
      .select()
      .single();
    return data?.id || `fleet-${Date.now()}`;
  }

  async updateCommandRecord(commandId, updates) {
    await this.supabase
      .from('fleet_commands')
      .update({ ...updates, completed_at: new Date().toISOString() })
      .eq('id', commandId);
  }
}

module.exports = { FleetCommandsService };
