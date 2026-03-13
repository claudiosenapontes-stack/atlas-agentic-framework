const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createHeartbeatTable() {
  try {
    // First, check if the table exists
    const { data: tableExists, error: checkError } = await supabase
      .rpc('pg_table_is_visible', { table_name: 'agent_heartbeats' });

    if (checkError) {
      console.log('Table check error:', checkError);
    }

    // Create the agent_heartbeats table with proper schema
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.agent_heartbeats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        context_size INTEGER DEFAULT 0,
        active_sessions INTEGER DEFAULT 0,
        active_tasks INTEGER DEFAULT 0,
        model_used VARCHAR(100) DEFAULT 'unknown',
        status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'stale', 'dead', 'unknown')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status_time ON public.agent_heartbeats(status, timestamp DESC);
    `;

    // Execute table creation via RPC call
    console.log('Creating agent_heartbeats table...');
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql_query', {
      query: createTableSQL
    });

    if (createError) {
      console.error('Error creating table:', createError);
      return { success: false, error: createError.message };
    }

    console.log('Creating indexes...');
    const { data: indexResult, error: indexError } = await supabase.rpc('exec_sql_query', {
      query: createIndexesSQL
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
    }

    console.log('Agent heartbeats table created successfully!');
    return { success: true, message: 'Table created successfully' };

  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

// Execute the table creation
createHeartbeatTable().then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});