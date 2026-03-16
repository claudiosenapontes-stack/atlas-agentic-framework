/**
 * ATLAS-CALENDAR-SYNC API
 * ATLAS-EXECUTIVE-OPS-SCHEMA-001
 * 
 * POST /api/calendar/sync
 * Sync calendar events from Google Calendar to Atlas
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const { 
      owner_id, 
      owner_email, 
      sync_direction = 'pull', 
      days_back = 7, 
      days_forward = 30,
      calendar_id = 'primary'
    } = body;
    
    if (!owner_id) {
      return NextResponse.json(
        { success: false, error: 'owner_id is required', timestamp },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // TODO: Implement actual Google Calendar sync when OAuth is ready
    // For now, return sync status and fetch existing events from Atlas
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days_back);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days_forward);
    
    // Fetch existing executive events for this owner
    const { data: existingEvents, error: fetchError } = await (supabase as any)
      .from('executive_events')
      .select('*')
      .eq('owner_id', owner_id)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time', { ascending: true });
    
    if (fetchError) {
      console.error('[Calendar Sync] Fetch error:', fetchError);
      throw fetchError;
    }
    
    // Check for Google Calendar integration
    const hasGoogleCalendar = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    
    return NextResponse.json({
      success: true,
      sync_status: hasGoogleCalendar ? 'ready' : 'auth_pending',
      sync_direction,
      owner_id,
      owner_email,
      window: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        days_back,
        days_forward,
      },
      events_synced: 0,
      events_found: existingEvents?.length || 0,
      existing_events: existingEvents || [],
      message: hasGoogleCalendar 
        ? 'Google Calendar sync ready. Use /api/calendar/sync/execute for full sync.'
        : 'Google Calendar not configured. Events stored in Atlas only.',
      timestamp,
    });
    
  } catch (error) {
    console.error('[Calendar Sync] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync calendar',
        timestamp,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const owner_id = searchParams.get('owner_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('executive_events')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    if (from) {
      query = query.gte('start_time', from);
    }
    
    if (to) {
      query = query.lte('end_time', to);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('[Calendar Sync] Get error:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      timestamp,
    });
    
  } catch (error) {
    console.error('[Calendar Sync] Get error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        timestamp,
      },
      { status: 500 }
    );
  }
}
