const { createClient } = require('@supabase/supabase-js');

const url = 'https://ukuicfswabcaioszcunb.supabase.co';
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addColumn() {
  try {
    // Try using the pg_execute function if available
    const { data, error } = await supabase.rpc('pg_execute', {
      query: 'ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT'
    });
    
    if (error) {
      console.error('RPC error:', error);
      
      // Alternative: Try exec_sql
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT'
      });
      
      if (error2) {
        console.error('exec_sql error:', error2);
        process.exit(1);
      }
      
      console.log('Success with exec_sql:', data2);
    } else {
      console.log('Success:', data);
    }
  } catch (e) {
    console.error('Exception:', e);
    process.exit(1);
  }
}

addColumn();
