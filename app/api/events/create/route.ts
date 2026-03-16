/**
 * ATLAS-EVENTS-CREATE API
 * ATLAS-EXECUTIVE-OPS-SCHEMA-001
 * 
 * POST /api/events/create
 * Create new executive events
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
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
      agenda,
      prep_required = false,
      priority = 'normal',
      visibility = 'private',
      created_by,
    } = body;
    
    // Validation
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'title is required', timestamp },
        { status: 400 }
      );
    }
    
    if (!start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'start_time and end_time are required', timestamp },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Create event
    const { data: event, error } = await (supabase as any)
      .from('executive_events')
      .insert({
        title,
        description,
        event_type,
        start_time,
        end_time,
        timezone,
        owner_id,
        owner_email,
        company_id,
        attendees,
        attendee_count: attendees.length,
        location,
        is_virtual,
        meet_link,
        zoom_link,
        agenda,
        prep_required,
        priority,
        visibility,
        created_by,
        status: 'confirmed',
        sync_source: 'manual',
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Events Create] Insert error:', error);
      throw error;
    }
    
    // Create prep task if required
    let prepTask = null;
    if (prep_required) {
      const { data: task, error: taskError } = await (supabase as any)
        .from('tasks')
        .insert({
          title: `Prep for: ${title}`,
          description: `Prepare for ${event_type} on ${start_time}`,
          status: 'pending',
          assignee_id: owner_id,
          due_at: new Date(new Date(start_time).getTime() - 24 * 60 * 60 * 1000).toISOString(), // Due 1 day before
          company_id,
          created_by,
        })
        .select()
        .single();
      
      if (!taskError && task) {
        prepTask = task;
        
        // Update event with prep task ID
        await (supabase as any)
          .from('executive_events')
          .update({ prep_task_id: task.id })
          .eq('id', event.id);
      }
    }
    
    return NextResponse.json({
      success: true,
      event,
      prep_task: prepTask,
      message: `Event created successfully${prep_required ? ' with prep task' : ''}`,
      timestamp,
    });
    
  } catch (error) {
    console.error('[Events Create] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create event',
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
    const company_id = searchParams.get('company_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('executive_events')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(limit);
    
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('[Events Create] List error:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      timestamp,
    });
    
  } catch (error) {
    console.error('[Events Create] List error:', error);
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
