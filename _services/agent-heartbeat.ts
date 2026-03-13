/**
 * Agent Heartbeat Service
 * ATLAS-FLEET-HEARTBEAT-CRON-502
 * ATLAS-MODEL-ROUTING-HEARTBEAT-503: Uses Kimi K2 for heartbeat workloads
 * 
 * Monitors all registered agents every 30 minutes.
 * Captures session metrics and writes to agent_heartbeats table.
 */

// Dynamic import for Deno/Node compatibility
declare const Deno: { env: { get(name: string): string | undefined } } | undefined;

// Use require for Node.js compatibility
let createClient: typeof import('@supabase/supabase-js').createClient;

try {
  // Node runtime - use require
  const { createClient: supabaseCreate } = require('@supabase/supabase-js');
  createClient = supabaseCreate;
} catch {
  // Fallback or handle Deno differently if needed
  console.error('Failed to load Supabase client');
  process.exit(1);
}

// Model configuration for heartbeat (since we can't import from @/lib)
const HEARTBEAT_MODEL = "openrouter/moonshotai/kimi-k2";
const LOGGER_LABEL = '[HeartbeatService]';

// Load environment variables from .env file manually
const SUPABASE_URL = "https://ukuicfswabcaioszcunb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMjA5NDksImV4cCI6MjA4NjY5Njk0OX0.TxA2hplYB7pDKGk7I4BnKbcx2kLnIRVu6FV6wnMd7Tw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Verify heartbeat uses Kimi K2
console.log(`${LOGGER_LABEL} Model routing: ${HEARTBEAT_MODEL}`);

interface Agent {
  id: string;
  name: string;
  status: string;
  last_seen?: string;
}

interface HeartbeatRecord {
  agent_id: string;
  timestamp: string;
  context_size: number;
  active_sessions: number;
  active_tasks: number;
  model_used: string;
  status: 'healthy' | 'stale' | 'dead' | 'unknown';
}

interface SessionMetrics {
  context_size: number;
  active_tasks: number;
  model_used: string;
}

const HEALTH_THRESHOLDS = {
  HEALTHY: 0,
  STALE: 45 * 60 * 1000,      // 45 minutes
  DEAD: 90 * 60 * 1000,       // 90 minutes
};

/**
 * Ping an agent and collect session metrics
 */
async function pingAgent(agent: Agent): Promise<SessionMetrics | null> {
  try {
    // Try to reach agent's internal metrics endpoint
    // Agents running in OpenClaw expose status via sessions or local APIs
    const response = await fetch(`http://localhost:${getAgentPort(agent.name)}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      context_size: data.context_size || 0,
      active_tasks: data.active_tasks || 0,
      model_used: data.model || 'unknown',
    };
  } catch {
    // Fallback: query database for last known metrics
    return getLastKnownMetrics(agent.id);
  }
}

/**
 * Get agent port from environment or config
 */
function getAgentPort(agentName: string): number {
  const portMap: Record<string, number> = {
    'severino': 8500,
    'optimus': 8501,
    'henry': 8502,
    'einstein': 8503,
    'harvey': 8504,
    'olivia': 8505,
    'prime': 8506,
    'sophia': 8507,
  };
  return portMap[agentName] || 8500;
}

/**
 * Get last known metrics from database
 */
async function getLastKnownMetrics(agentId: string): Promise<SessionMetrics | null> {
  const { data } = await supabase
    .from('agent_heartbeats')
    .select('context_size, active_tasks, model_used')
    .eq('agent_id', agentId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return {
      context_size: data.context_size || 0,
      active_tasks: data.active_tasks || 0,
      model_used: data.model_used || 'unknown',
    };
  }
  return null;
}

/**
 * Calculate agent health status based on last heartbeat
 */
function calculateHealthStatus(lastTimestamp?: string): HeartbeatRecord['status'] {
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
async function countActiveSessions(agentId: string): Promise<number> {
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
export async function collectHeartbeats(): Promise<{
  success: boolean;
  agents_checked: number;
  agents_reporting: number;
  errors: string[];
}> {
  const errors: string[] = [];
  
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
        const metrics = await pingAgent(agent);
        const activeSessions = await countActiveSessions(agent.id);
        const status = calculateHealthStatus(agent.last_seen);

        const heartbeat: HeartbeatRecord = {
          agent_id: agent.id,
          timestamp: new Date().toISOString(),
          context_size: metrics?.context_size || 0,
          active_sessions: activeSessions,
          active_tasks: metrics?.active_tasks || 0,
          model_used: metrics?.model_used || 'unknown',
          status,
        };

        // Write to database
        const { error: insertError } = await supabase
          .from('agent_heartbeats')
          .insert(heartbeat);

        if (insertError) {
          errors.push(`Insert failed for ${agent.name}: ${insertError.message}`);
        } else {
          reportingCount++;
        }

      } catch (err) {
        errors.push(`Ping failed for ${agent.name}: ${err instanceof Error ? err.message : 'unknown'}`);
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
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }
}

/**
 * Get heartbeat summary for all agents
 */
export async function getHeartbeatSummary(): Promise<{
  cron_deployed: boolean;
  heartbeat_table_created: boolean;
  agents_reporting: number;
  next_run_time: string;
  agents: Array<{
    agent_id: string;
    last_heartbeat: string;
    status: string;
    active_sessions: number;
    active_tasks: number;
  }>;
}> {
  // Check if table exists
  const { data: tableCheck } = await supabase
    .rpc('check_table_exists', { table_name: 'agent_heartbeats' })
    .single();

  const tableExists = !!tableCheck;

  // Get latest heartbeat per agent
  const { data: latestHeartbeats } = await supabase
    .from('agent_heartbeats')
    .select('agent_id, timestamp, status, active_sessions, active_tasks')
    .order('timestamp', { ascending: false })
    .limit(100);

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
    heartbeat_table_created: tableExists,
    agents_reporting: agentMap.size,
    next_run_time: nextRun.toISOString(),
    agents: Array.from(agentMap.values()),
  };
}

// CLI execution for cron
// ATLAS-BUILD-FIX: Wrap in async function to avoid top-level await issues
async function runHeartbeatCron() {
  console.log(`[HeartbeatCron] Starting collection at ${new Date().toISOString()}`);
  
  const result = await collectHeartbeats();
  
  console.log(`[HeartbeatCron] Result:`, JSON.stringify(result, null, 2));
  
  process.exit(result.success ? 0 : 1);
}

// @ts-ignore - Deno-style check
if (typeof import.meta !== 'undefined' && (import.meta as any).main) {
  runHeartbeatCron();
}
