#!/usr/bin/env node
/**
 * OpenClaw → Atlas Sync Service
 * 
 * Modified to consume data via OpenClaw CLI instead of non-existent HTTP routes.
 * Run as a cron job every 1-5 minutes for near real-time sync.
 */

const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Agent configuration mapping
const AGENT_CONFIG = {
  henry: { displayName: 'Henry', role: 'CEO', emoji: '👔' },
  harvey: { displayName: 'Harvey', role: 'Finance', emoji: '💰' },
  einstein: { displayName: 'Einstein', role: 'Research', emoji: '🔬' },
  sophia: { displayName: 'Sophia', role: 'Marketing', emoji: '📈' },
  severino: { displayName: 'Severino', role: 'Operations', emoji: '⚙️' },
  olivia: { displayName: 'Olivia', role: 'Executive Assistant', emoji: '🗂️' },
  optimus: { displayName: 'Optimus', role: 'Tech Lead', emoji: '🧰' },
  prime: { displayName: 'Prime', role: 'Senior Dev', emoji: '🏗️' },
  'optimus-prime': { displayName: 'Prime', role: 'Senior Dev', emoji: '🏗️' },
};

function readJsonFromCLI(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    // the CLI outputs JSON format when explicitly requested
    return JSON.parse(out);
  } catch (err) {
    // console.error(`Error running command: ${cmd}`, err.message);
    // If output exists and failed to parse it, throw up
    if (err.stdout) {
       try { return JSON.parse(err.stdout); } catch (e) {}
    }
    throw err;
  }
}

async function supabaseRequest(table, method, data = null, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };
  
  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);
  
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// Sync agent sessions
async function syncAgents() {
  console.log('📡 Syncing agents...');
  
  try {
    const healthData = readJsonFromCLI('openclaw gateway call health');
    const agents = healthData.agents || [];
    
    for (const agent of agents) {
      const agentId = agent.agentId;
      if (!agentId) continue;
      
      const config = AGENT_CONFIG[agentId.toLowerCase()] || { 
        displayName: agent.name || agentId, 
        role: 'Agent',
        emoji: '🤖'
      };
      
      // Determine current task/session from recent sessions
      let currentTask = 'Active session';
      let lastSeen = new Date().toISOString();
      if (agent.sessions && agent.sessions.recent && agent.sessions.recent.length > 0) {
        currentTask = agent.sessions.recent[0].key;
        lastSeen = new Date(agent.sessions.recent[0].updatedAt).toISOString()
      }

      const agentData = {
        name: agentId.toLowerCase(),
        display_name: config.displayName,
        role: config.role,
        status: 'active',
        current_task: currentTask,
        last_seen: lastSeen,
        updated_at: new Date().toISOString(),
      };
      
      // Upsert agent
      const existing = await supabaseRequest('agents', 'GET', null, `?name=eq.${agentId.toLowerCase()}`);
      
      if (existing && existing.length > 0) {
        await supabaseRequest('agents', 'PATCH', agentData, `?name=eq.${agentId.toLowerCase()}`);
      } else {
        await supabaseRequest('agents', 'POST', { ...agentData, created_at: new Date().toISOString() });
      }
    }
    
    console.log(`✅ Synced ${agents.length} agents`);
  } catch (error) {
    console.error('❌ Agent sync failed:', error.message);
  }
}

// Sync cron jobs as tasks
async function syncTasks() {
  console.log('📋 Syncing tasks...');
  
  try {
    const cronData = readJsonFromCLI('openclaw cron list --json');
    const jobs = cronData.jobs || [];
    
    for (const job of jobs) {
      const agentId = job.agentId || 'system';
      
      // Determine priority
      const highPriority = ['henry', 'severino', 'sophia'];
      const priority = highPriority.includes(agentId.toLowerCase()) ? 'high' : 'medium';
      
      // Determine status
      let status = 'planned';
      if (!job.enabled) status = 'blocked';
      else if (job.state?.lastRunStatus === 'ok') status = 'completed';
      else if (job.state?.lastRunStatus === 'error') status = 'blocked';
      else if (job.state?.lastRunStatus === 'running') status = 'in_progress';
      
      // Format schedule
      let schedule = 'Unknown';
      if (job.schedule?.kind === 'cron') {
        const expr = job.schedule.expr;
        if (expr === '0 7 * * *') schedule = 'Daily at 7:00 AM';
        else if (expr === '0 8 * * *') schedule = 'Daily at 8:00 AM';
        else if (expr === '0 14 * * *') schedule = 'Daily at 2:00 PM';
        else if (expr === '0 18 * * *') schedule = 'Daily at 6:00 PM';
        else if (expr === '0 20 * * 0') schedule = 'Sunday at 8:00 PM';
        else if (expr === '0 17 * * 5') schedule = 'Friday at 5:00 PM';
        else schedule = expr;
      } else if (job.schedule?.kind === 'every') {
        const ms = job.schedule.everyMs;
        if (ms < 60000) schedule = `Every ${ms / 1000}s`;
        else if (ms < 3600000) schedule = `Every ${Math.round(ms / 60000)}min`;
        else schedule = `Every ${Math.round(ms / 3600000)}h`;
      }
      
      const taskData = {
        id: job.id,
        title: job.name || 'Unnamed Task',
        description: (job.payload?.message || '').substring(0, 500),
        priority,
        status,
        assigned_agent_id: agentId,
        schedule,
        next_run_at: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
        last_run_at: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      
      // Check if task exists
      const existing = await supabaseRequest('tasks', 'GET', null, `?id=eq.${job.id}`);
      
      if (existing && existing.length > 0) {
        await supabaseRequest('tasks', 'PATCH', taskData, `?id=eq.${job.id}`);
      } else {
        await supabaseRequest('tasks', 'POST', { 
          ...taskData, 
          created_at: new Date(job.createdAtMs).toISOString() 
        });
      }
    }
    
    console.log(`✅ Synced ${jobs.length} tasks`);
  } catch (error) {
    console.error('❌ Task sync failed:', error.message);
  }
}

// Main sync function
async function sync() {
  console.log('\n🔄 OpenClaw → Atlas Sync Started');
  console.log('================================');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Check OpenClaw health using CLI
    const health = readJsonFromCLI('openclaw gateway call health');
    console.log('✅ OpenClaw Gateway CLI:', health.ok ? 'online' : 'offline');
    
    await syncAgents();
    await syncTasks();
    
    console.log('\n✨ Sync completed successfully');
  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    process.exit(1);
  }
}

// Run sync
sync();
