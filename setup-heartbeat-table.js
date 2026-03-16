const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createHeartbeatTable() {
  try {
    console.log('Creating agent_heartbeats table...');
    
    // Execute the SQL to create the table
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Create agent_heartbeats table for ATLAS fleet monitoring
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
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    
    console.log('✅ agent_heartbeats table created successfully');
  } catch (err) {
    console.error('Error:', err);
  }
}

createHeartbeatTable();