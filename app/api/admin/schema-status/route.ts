/**
 * ATLAS-ADMIN SQL EXECUTION API
 * Temporary route to execute schema migrations
 * ATLAS-OPTIMUS-EO-CALENDAR-SCHEMA-FIX-002
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

// Secret key for admin operations (should match env)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'atlas-admin-2026';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { secret, operation } = body;
    
    // Validate secret
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', timestamp },
        { status: 401 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    if (operation === 'add_calendar_event_id') {
      // Execute the migration using raw SQL
      const { error } = await (supabase as any)
        .from('_sql_execute')
        .select('*')
        .eq('query', 'ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT')
        .single();
      
      // Alternative: Try to insert with the new column and catch error
      try {
        // Test if column exists by trying to select it
        const { error: testError } = await (supabase as any)
          .from('executive_events')
          .select('calendar_event_id')
          .limit(1);
        
        if (testError && testError.message.includes('calendar_event_id')) {
          // Column doesn't exist - we need to add it via direct SQL
          // Since we can't execute raw SQL easily, let's use a workaround
          // by creating the column through the metadata API
          
          return NextResponse.json({
            success: false,
            error: 'Column does not exist. Use Supabase Dashboard SQL Editor to run: ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;',
            code: 'COLUMN_MISSING',
            timestamp,
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'calendar_event_id column exists',
          timestamp,
        });
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          error: e.message,
          timestamp,
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown operation',
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    });
  }
}

// GET to check column status
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if column exists
    const { data, error } = await (supabase as any)
      .from('executive_events')
      .select('calendar_event_id')
      .limit(1);
    
    if (error && error.message.includes('calendar_event_id')) {
      return NextResponse.json({
        success: false,
        column_exists: false,
        error: 'calendar_event_id column does not exist',
        sql_to_run: 'ALTER TABLE executive_events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT; CREATE INDEX IF NOT EXISTS idx_executive_events_calendar_event_id ON executive_events(calendar_event_id) WHERE calendar_event_id IS NOT NULL;',
        timestamp,
      });
    }
    
    return NextResponse.json({
      success: true,
      column_exists: true,
      sample: data,
      timestamp,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp,
    });
  }
}
