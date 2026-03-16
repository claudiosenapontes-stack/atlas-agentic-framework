import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Script to add calendar_event_id column to executive_events
async function addCalendarEventIdColumn() {
  const supabase = getSupabaseAdmin();
  
  try {
    // Try to add column using raw SQL
    const { data, error } = await (supabase as any).rpc('exec_sql', {
      sql: 'ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT'
    });
    
    if (error) {
      console.error('Error adding column:', error);
      return;
    }
    
    console.log('Column added successfully:', data);
  } catch (e) {
    console.error('Exception:', e);
  }
}

addCalendarEventIdColumn();
