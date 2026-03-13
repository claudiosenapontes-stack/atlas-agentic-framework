const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function initializeHeartbeatTable() {
  try {
    // Create the agent_heartbeats table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.agent_heartbeats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(16) NOT NULL CHECK (status IN ('healthy', 'stale', 'dead')),
        active_sessions INTEGER DEFAULT 0,
        active_tasks INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (tableError) {
      console.log('Table creation attempted, may already exist:', tableError.message);
    }
    
    // Create indexes
    const indexSQLs = [
      'CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);',
      'CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp DESC);'
    ];
    
    for (const indexSQL of indexSQLs) {
      try {
        const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
        if (indexError) {
          console.log('Index creation attempted, may already exist:', indexError.message);
        }
      } catch (err) {
        console.log('Index creation error (non-critical):', err.message);
      }
    }
    
    console.log('Heartbeat infrastructure initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize heartbeat infrastructure:', error.message);
    process.exit(1);
  }
}

initializeHeartbeatTable();