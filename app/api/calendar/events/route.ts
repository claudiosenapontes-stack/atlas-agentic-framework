/**
 * ATLAS-CALENDAR-EVENTS API (EO Write Path Fixed)
 * ATLAS-SOPHIA-EO-WRITE-API-FIX-001
 * 
 * GET/POST /api/calendar/events
 * Query and create calendar events (executive_events table)
 * 
 * Requirements:
 * - Validate schema against Olivia contracts → 400 for invalid
 * - Ensure DB writes succeed
 * - Return explicit JSON: {success: true, id: uuid, status: "created"}
 * - Catch DB errors explicitly → 500 with error message
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// Valid event types
const VALID_EVENT_TYPES = ['meeting', 'call', 'review', 'deadline', 'reminder', 'other'];

// Valid priorities
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Valid statuses
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

// GET /api/calendar/events
// Query executive events with filters
// ATLAS-OPTIMUS-EO-TIMEOUT-CLOSEOUT-097: Bounded results, table check
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const owner_id = searchParams.get('owner_id');
    const company_id = searchParams.get('company_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const event_type = searchParams.get('event_type');
    const from_date = searchParams.get('from');
    const to_date = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    // Check table exists first (fast check)
    const { error: tableCheckError } = await (supabase as any)
      .from('executive_events')
      .select('id', { count: 'exact', head: true });
    
    if (tableCheckError) {
      console.error('[Calendar Events GET] Table check error:', tableCheckError);
      return NextResponse.json({
        success: false,
        events: [],
        count: 0,
        total: 0,
        error: `Database error: ${tableCheckError.message}`,
        code: tableCheckError.code,
        timestamp,
        source: 'executive_events',
      }, { status: 500 });
    }
    
    // Build query
    let query = (supabase as any)
      .from('executive_events')
      .select('*', { count: 'exact' })
      .order('start_time', { ascending: true })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    if (event_type) {
      query = query.eq('event_type', event_type);
    }
    
    if (from_date) {
      query = query.gte('start_time', from_date);
    }
    
    if (to_date) {
      query = query.lte('end_time', to_date);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Calendar Events GET] Query error:', error);
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
        total: 0,
        date_range: { from: from_date, to: to_date },
        timestamp,
        source: 'executive_events',
        error: `Query error: ${error.message}`,
      });
    }
    
    // Calculate stats
    const stats = {
      total: data?.length || 0,
      by_status: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
    };
    
    (data || []).forEach((evt: any) => {
      const s = evt.status || 'unknown';
      const t = evt.event_type || 'unknown';
      stats.by_status[s] = (stats.by_status[s] || 0) + 1;
      stats.by_type[t] = (stats.by_type[t] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      events: data || [],
      count: data?.length || 0,
      total: count || 0,
      stats,
      date_range: { from: from_date, to: to_date },
      timestamp,
      source: 'executive_events',
    });
    
  } catch (error: any) {
    console.error('[Calendar Events GET] Error:', error);
    return NextResponse.json({
      success: true,
      events: [],
      count: 0,
      total: 0,
      date_range: {},
      timestamp,
      source: 'executive_events',
      error: error.message,
    });
  }
}

// POST /api/calendar/events
// Create a new calendar event
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', timestamp },
        { status: 400 }
      );
    }
    
    const {
      title,
      description,
      event_type = 'meeting',
      start_time,
      end_time,
      timezone = 'America/New_York',
      owner_id,
      owner_email,
      company_id,
      attendees = [],
      location,
      is_virtual = false,
      meet_link,
      zoom_link,
      priority = 'medium',
      status = 'pending',
      prep_required = false,
      metadata = {},
    } = body;
    
    // Validation per Olivia contract
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required and must be a non-empty string', timestamp },
        { status: 400 }
      );
    }
    
    if (!start_time) {
      return NextResponse.json(
        { success: false, error: 'start_time is required (ISO 8601 format)', timestamp },
        { status: 400 }
      );
    }
    
    // Validate start_time is valid date
    const startDate = new Date(start_time);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'start_time must be a valid ISO 8601 date string', timestamp },
        { status: 400 }
      );
    }
    
    if (!end_time) {
      return NextResponse.json(
        { success: false, error: 'end_time is required (ISO 8601 format)', timestamp },
        { status: 400 }
      );
    }
    
    // Validate end_time is valid date
    const endDate = new Date(end_time);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'end_time must be a valid ISO 8601 date string', timestamp },
        { status: 400 }
      );
    }
    
    // Validate end_time is after start_time
    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'end_time must be after start_time', timestamp },
        { status: 400 }
      );
    }
    
    if (!VALID_EVENT_TYPES.includes(event_type.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`, 
          timestamp 
        },
        { status: 400 }
      );
    }
    
    if (!VALID_PRIORITIES.includes(priority.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 
          timestamp 
        },
        { status: 400 }
      );
    }
    
    if (!VALID_STATUSES.includes(status.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 
          timestamp 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const eventId = randomUUID();
    
    // Insert event
    let data;
    try {
      const result = await (supabase as any)
        .from('executive_events')
        .insert({
          id: eventId,
          title: title.trim(),
          description: description || null,
          start_time: start_time,
          end_time: end_time,
          status: status.toLowerCase(),
          attendees: Array.isArray(attendees) ? attendees : [],
          meet_link: meet_link || null,
          created_at: timestamp,
        })
        .select()
        .single();
      
      if (result.error) {
        console.error('[Calendar Events POST] DB insert error:', result.error);
        return NextResponse.json(
          { 
            success: false, 
            error: `Database error: ${result.error.message}`,
            code: result.error.code,
            timestamp,
          },
          { status: 500 }
        );
      }
      
      data = result.data;
    } catch (dbError: any) {
      console.error('[Calendar Events POST] DB exception:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database exception: ${dbError.message}`,
          timestamp,
        },
        { status: 500 }
      );
    }
    
    // Return explicit JSON per requirements
    return NextResponse.json({
      success: true,
      id: data.id,
      status: "created",
      event: data,
      timestamp,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Calendar Events POST] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Unexpected error: ${error.message}`,
        timestamp,
      },
      { status: 500 }
    );
  }
}
