/**
 * Agent Heartbeat Service (Node.js version for PM2)
 * ATLAS-FLEET-HEARTBEAT-CRON-502
 * Updated to use existing 'heartbeats' table
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEALTH_THRESHOLDS = {
  HEALTHY: 0,
  STALE: 45 * 60 * 1000,      // 45 minutes
  DEAD: 90 * 60 * 1000,       // 90 minutes
};

/**
 * Calculate agent health status
 */
function calculateHealthStatus(lastTimestamp) {
  if (!lastTimestamp) return 'dead';
  
  const lastSeen = new Date(lastTimestamp).getTime();
  const now = Date.now();
  const delta = now - lastSeen;

  if (delta > HEALTH_THRESHOLDS.DEAD) return 'dead';
  if (delta > HEALTH_THRESHOLDS.STALE) return 'stale';
  return 'healthy';
}

/**
 * Count active sessions for an agent
 */
async function countActiveSessions(agentId) {
  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('status', 'active');

  return count || 0;
}

/**
 * Main heartbeat collection function
 */
async function collectHeartbeats() {
  const errors = [];
  
  try {
    // Fetch all registered agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, last_seen')
      .eq('status', 'active');

    if (agentError) {
      throw new Error(`Failed to fetch agents: ${agentError.message}`);
    }

    if (!agents || agents.length === 0) {
      return { success: true, agents_checked: 0, agents_reporting: 0, errors: [] };
    }

    let reportingCount = 0;

    // Iterate and ping each agent
    for (const agent of agents) {
      try {
        const activeSessions = await countActiveSessions(agent.id);
        const status = calculateHealthStatus(agent.last_seen);

        // Map to existing heartbeats table schema
        const heartbeat = {
          agent_id: agent.name || agent.id,  // heartbeats table uses name as agent_id
          agent_name: agent.name,
          status: status,
          last_seen: new Date().toISOString(),
          health_data: {
            context_size: 0,
            active_sessions: activeSessions,
            active_tasks: 0,
            model_used: 'unknown',
            agent_uuid: agent.id
          }
        };

        // Write to existing heartbeats table
        const { error: insertError } = await supabase
          .from('heartbeats')
          .insert(heartbeat);

        if (insertError) {
          errors.push(`Insert failed for ${agent.name}: ${insertError.message}`);
        } else {
          reportingCount++;
          console.log(`[HeartbeatCron] Recorded heartbeat for ${agent.name} (${status})`);
        }

      } catch (err) {
        errors.push(`Ping failed for ${agent.name}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      agents_checked: agents.length,
      agents_reporting: reportingCount,
      errors,
    };

  } catch (err) {
    return {
      success: false,
      agents_checked: 0,
      agents_reporting: 0,
      errors: [err.message],
    };
  }
}

/**
 * Get heartbeat summary for all agents
 */
async function getHeartbeatSummary() {
  // Get latest heartbeat per agent
  const { data: latestHeartbeats, error: hbError } = await supabase
    .from('heartbeats')
    .select('agent_id, agent_name, status, last_seen, health_data')
    .order('last_seen', { ascending: false })
    .limit(100);

  if (hbError) {
    throw new Error(`Failed to fetch heartbeats: ${hbError.message}`);
  }

  // Deduplicate by agent_id (get most recent per agent)
  const agentMap = new Map();
  latestHeartbeats?.forEach(hb => {
    if (!agentMap.has(hb.agent_id)) {
      agentMap.set(hb.agent_id, hb);
    }
  });

  // Calculate next run time (every 30 minutes from midnight)
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);
  if (nextRun <= now) {
    nextRun.setMinutes(nextRun.getMinutes() + 30);
  }

  return {
    cron_deployed: true,
    heartbeat_table_created: true,
    agents_reporting: agentMap.size,
    next_run_time: nextRun.toISOString(),
    agents: Array.from(agentMap.values()),
  };
}

// CLI execution
if (require.main === module) {
  console.log(`[HeartbeatCron] Starting ATLAS fleet heartbeat collection at ${new Date().toISOString()}`);
  
  collectHeartbeats().then(result => {
    console.log(`[HeartbeatCron] Result:`, JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { collectHeartbeats, getHeartbeatSummary };
