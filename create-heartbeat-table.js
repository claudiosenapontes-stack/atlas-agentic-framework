/**
 * Create agent_heartbeats table
 * ATLAS-FLEET-HEARTBEAT-CRON-502
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukuicfswabcaioszcunb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvczJjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createHeartbeatTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS agent_heartbeats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      context_size INT,
      active_sessions INT,
      active_tasks INT,
      model_used TEXT,
      status TEXT NOT NULL DEFAULT 'unknown'
    );

    CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON agent_heartbeats(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON agent_heartbeats(timestamp DESC);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: createTableSQL });
    
    if (error) {
      console.error('Error creating table:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ agent_heartbeats table created successfully');
    return { success: true };
    
  } catch (err) {
    console.error('Failed to create table:', err);
    return { success: false, error: err.message };
  }
}

// Run directly
if (require.main === module) {
  createHeartbeatTable().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { createHeartbeatTable };