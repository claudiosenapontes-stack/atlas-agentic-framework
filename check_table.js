const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ukuicfswabcaioszcunb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdWljZnN3YWJjYWlvc3pjdW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyMDk0OSwiZXhwIjoyMDg2Njk2OTQ5fQ._f08mua6hD2ln4PLV7xw5bC_z7JF-5pSqjDXEwwcTxg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    // Try to insert a test record - this will fail if table doesn't exist
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        calendar_event_id: 'test-123',
        summary: 'Test Event',
        start_time: new Date().toISOString(),
        calendar_id: 'primary'
      });

    if (insertError) {
      console.log('Table likely does not exist:', insertError.message);
      console.log('Please create the table via Supabase Dashboard SQL Editor with:');
      console.log(`
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id TEXT UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'confirmed',
  html_link TEXT,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_event_id ON calendar_events(calendar_event_id);
      `);
    } else {
      console.log('Table exists and test insert succeeded');
      // Clean up test record
      await supabase.from('calendar_events').delete().eq('calendar_event_id', 'test-123');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

createTable();
