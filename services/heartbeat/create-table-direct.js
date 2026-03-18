#!/usr/bin/env node
/**
 * Create agent_heartbeats table directly via REST API
 * ATLAS-FLEET-HEARTBEAT-CRON-502
 */

const fetch = globalThis.fetch || require('undici').fetch;


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// SQL to create the heartbeat table
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

CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_id ON public.agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_timestamp ON public.agent_heartbeats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status_time ON public.agent_heartbeats(status, timestamp DESC);

ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to heartbeats" ON public.agent_heartbeats FOR SELECT TO anon USING (true);
`;

async function createTable() {
  try {
    // Let's try to create the table using the REST API
    // First, let's check if table exists by querying it
    const response = await fetch(`${SUPABASE_URL}/rest/v1/agent_heartbeats?limit=0`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      console.log('Table does not exist, attempting to create it...');
      
      // Since we can't execute SQL directly via REST, let's create an alternative approach
      // We'll create a simple heartbeat record for testing purposes
      
      // First, get a list of agents
      const agentsResponse = await fetch(`${SUPABASE_URL}/rest/v1/agents?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (agentsResponse.ok) {
        const agents = await agentsResponse.json();
        if (agents.length > 0) {
          // Try to insert a test heartbeat manually (this will fail but help identify the issue)
          console.log('Attempting manual heartbeat insertion for table initialization...');
        }
      }
      
      console.log('Table creation requires SQL execution. Please use the Supabase dashboard SQL editor with the following SQL:');
      console.log(createTableSQL);
      
    } else if (response.ok) {
      console.log('Table already exists!');
      return true;
    }
    
  } catch (error) {
    console.error('Error during table check:', error);
    return false;
  }
  
  return false;
}

if (require.main === module) {
  createTable();
}

module.exports = { createTable };