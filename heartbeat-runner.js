const { createClient } = require('@supabase/supabase-js');

// Simple heartbeat runner - no complex routing for now
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function collectHeartbeats() {
  const errors = [];
  
  console.log(`[HeartbeatCron] Starting collection at ${new Date().toISOString()}`);
  
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
      console.log('No active agents found');
      return { success: true, agents_checked: 0, agents_reporting: 0, errors: [] };
    }

    let reportingCount = 0;
    console.log(`Found ${agents.length} active agents`);

    // Iterate and create heartbeat records
    for (const agent of agents) {
      try {
        // Simple health check based on last_seen timestamp
        const now = new Date();
        const lastSeen = agent.last_seen ? new Date(agent.last_seen) : now;
        const timeDiff = now.getTime() - lastSeen.getTime();
        
        let status = 'healthy';
        if (timeDiff > 90 * 60 * 1000) status = 'dead'; // 90 minutes
        else if (timeDiff > 45 * 60 * 1000) status = 'stale'; // 45 minutes

        const heartbeat = {
          agent_id: agent.id,
          timestamp: now.toISOString(),
          context_size: 0, // Will be populated when agents expose metrics
          active_sessions: 0, // Will be populated when agents expose metrics  
          active_tasks: 0, // Will be populated when agents expose metrics
          model_used: 'unknown',
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
          console.log(`Heartbeat recorded for ${agent.name} - ${status}`);
        }

      } catch (err) {
        errors.push(`Ping failed for ${agent.name}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    const result = {
      success: errors.length === 0,
      agents_checked: agents.length,
      agents_reporting: reportingCount,
      errors,
    };
    
    console.log(`[HeartbeatCron] Result:`, JSON.stringify(result, null, 2));
    return result;

  } catch (err) {
    const result = {
      success: false,
      agents_checked: 0,
      agents_reporting: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
    console.error(`[HeartbeatCron] Result:`, JSON.stringify(result, null, 2));
    return result;
  }
}

// Run the heartbeat collection
collectHeartbeats().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});