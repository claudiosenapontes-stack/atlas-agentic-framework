const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndCreateTable() {
  try {
    // Try to query the agent_heartbeats table directly
    const { data, error } = await supabase
      .from('agent_heartbeats')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('relation does not exist')) {
        console.log('Table does not exist, need to create it')
        return { tableExists: false, createNeeded: true };
      }
      return { tableExists: false, error: error.message, createNeeded: true };
    }

    console.log('Table exists, data:', data);
    return { tableExists: true, data };

  } catch (err) {
    console.error('Unexpected error:', err);
    return { tableExists: false, error: err.message, createNeeded: true };
  }
}

async function createTableIfNeeded() {
  const check = await checkAndCreateTable();
  
  if (!check.tableExists) {
    console.log('Need to create agent_heartbeats table (requires direct SQL execution)');
    console.log('You may need to execute the SQL manually or contact the database administrator.');
    
    // Let's at least show what SQL needs to be executed
    const createTableSQL = `
-- Execute this SQL in the Supabase SQL editor or via psql:

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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status_time ON public.agent_heartbeats(status, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow CRUD operations on heartbeats (read-only for anon users)
CREATE POLICY "Allow read access to heartbeats" ON public.agent_heartbeats FOR SELECT TO anon USING (true);

-- Sample test row
-- INSERT INTO public.agent_heartbeats (agent_id, context_size, active_sessions, active_tasks, model_used, status)
-- SELECT id, 0, 0, 0, 'unknown', 'unknown' FROM public.agents LIMIT 1;
`;
    
    console.log('Required SQL:');
    console.log(createTableSQL);
    console.log('\nAlternatively, try using the Supabase CLI or admin panel to create the table.');
  }
  
  return check;
}

createTableIfNeeded().then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(result.tableExists ? 0 : 1);
});