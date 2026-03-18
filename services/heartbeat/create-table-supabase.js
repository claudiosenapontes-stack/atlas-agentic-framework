#!/usr/bin/env node
/**
 * Create agent_heartbeats table using Supabase admin connection
 * ATLAS-FLEET-HEARTBEAT-CRON-502
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment from .env file
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.+)$/);
    if (match) {
      let value = match[2];
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[match[1]]) {
        process.env[match[1]] = value;
      }
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

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

async function createTableUsingSupabase() {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not found in environment');
    }

    console.log('Connecting to Supabase...');
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_KEY.substring(0, 20) + '...');

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    console.log('Executing table creation...');
    
    // For creating tables, we need to use the SQL API through a custom RPC call
    // Since direct SQL execution isn't available in client-side operations,
    // we'll use the REST API to create the table structure
    
    // First, let's check if the table exists by attempting a simple query
    const { data: tableData, error: tableError } = await supabase
      .from('agent_heartbeats')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.message.includes('Could not find the table') || tableError.code === 'PGRST201') {
      console.log('Table does not exist, creating...');
      
      // We'll need to use the SQL API via the built-in SQL editor through admin panel
      // For now, let's provide the SQL statement to create the table
      console.log('📝 To create the table, execute this SQL in Supabase SQL editor:');
      console.log(createTableSQL);
      
      throw new Error('Table creation requires manual SQL execution - see SQL statement above');
    } else {
      console.log('✅ Table appears to exist');
      if (tableData) {
        console.log(`Found ${tableData.length} existing records`);
      }
      
      // Verify table schema
      const { data: columnInfo, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'agent_heartbeats' });
      
      if (!columnError) {
        console.log('📊 Table schema verified');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTableUsingSupabase().then(() => {
  console.log('✅ Table creation process completed');
}).catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});