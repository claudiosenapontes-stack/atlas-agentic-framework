/**
 * ATLAS-MEETINGS-INGEST API
 * ATLAS-EXECUTIVE-OPS-SCHEMA-001
 * 
 * POST /api/meetings/ingest
 * Ingest meeting records (notes, transcripts, recordings)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();
    const {
      event_id,
      record_type,
      content,
      content_json = {},
      source = 'manual',
      source_url,
      processed_by,
      key_points = [],
      decisions = [],
      action_items = [],
      sentiment,
      duration_seconds,
      language = 'en',
    } = body;
    
    // Validation
    if (!event_id) {
      return NextResponse.json(
        { success: false, error: 'event_id is required', timestamp },
        { status: 400 }
      );
    }
    
    if (!record_type || !['notes', 'transcript', 'recording', 'summary', 'action_items'].includes(record_type)) {
      return NextResponse.json(
        { success: false, error: 'record_type must be one of: notes, transcript, recording, summary, action_items', timestamp },
        { status: 400 }
      );
    }
    
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'content is required', timestamp },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Verify event exists
    const { data: event, error: eventError } = await (supabase as any)
      .from('executive_events')
      .select('id, title')
      .eq('id', event_id)
      .single();
    
    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found', timestamp },
        { status: 404 }
      );
    }
    
    // Create meeting record
    const { data: record, error: recordError } = await (supabase as any)
      .from('meeting_records')
      .insert({
        event_id,
        record_type,
        content,
        content_json,
        source,
        source_url,
        processed_by,
        processing_status: 'completed',
        key_points,
        decisions,
        action_items,
        sentiment,
        duration_seconds,
        language,
      })
      .select()
      .single();
    
    if (recordError) {
      console.error('[Meetings Ingest] Record error:', recordError);
      throw recordError;
    }
    
    // Create decisions from extracted decisions
    const createdDecisions = [];
    for (const decision of decisions) {
      const { data: decisionRecord, error: decisionError } = await (supabase as any)
        .from('meeting_decisions')
        .insert({
          event_id,
          record_id: record.id,
          decision: typeof decision === 'string' ? decision : decision.text,
          context: typeof decision === 'object' ? decision.context : null,
          category: typeof decision === 'object' ? decision.category : 'other',
          priority: typeof decision === 'object' ? decision.priority : 'normal',
          status: 'proposed',
          extracted_by: processed_by,
        })
        .select()
        .single();
      
      if (!decisionError && decisionRecord) {
        createdDecisions.push(decisionRecord);
      }
    }
    
    // Create tasks from action items
    const createdTasks = [];
    for (const item of action_items) {
      const taskTitle = typeof item === 'string' ? item : item.title;
      const assigneeId = typeof item === 'object' ? item.assignee_id : null;
      const dueDate = typeof item === 'object' ? item.due_date : null;
      const priority = typeof item === 'object' ? item.priority : 'normal';
      
      const { data: task, error: taskError } = await (supabase as any)
        .from('tasks')
        .insert({
          title: taskTitle,
          description: `Action item from meeting: ${event.title}`,
          status: 'pending',
          assignee_id: assigneeId,
          due_at: dueDate,
          priority,
          created_by: processed_by,
        })
        .select()
        .single();
      
      if (!taskError && task) {
        createdTasks.push(task);
        
        // Link task to meeting
        await (supabase as any)
          .from('meeting_tasks')
          .insert({
            event_id,
            task_id: task.id,
            record_id: record.id,
            extracted_from_transcript: source === 'plaud' || record_type === 'transcript',
            assigned_by: processed_by,
            priority_at_creation: priority,
            due_date_at_creation: dueDate,
          });
      }
    }
    
    return NextResponse.json({
      success: true,
      record,
      decisions_created: createdDecisions.length,
      decisions: createdDecisions,
      tasks_created: createdTasks.length,
      tasks: createdTasks,
      message: `Meeting record ingested: ${record_type}`,
      timestamp,
    });
    
  } catch (error) {
    console.error('[Meetings Ingest] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to ingest meeting',
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
    const event_id = searchParams.get('event_id');
    const record_type = searchParams.get('record_type');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('meeting_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (event_id) {
      query = query.eq('event_id', event_id);
    }
    
    if (record_type) {
      query = query.eq('record_type', record_type);
    }
    
    const { data: records, error } = await query;
    
    if (error) {
      console.error('[Meetings Ingest] Get error:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      records: records || [],
      count: records?.length || 0,
      timestamp,
    });
    
  } catch (error) {
    console.error('[Meetings Ingest] Get error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch records',
        timestamp,
      },
      { status: 500 }
    );
  }
}
