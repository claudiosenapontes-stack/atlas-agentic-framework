/**
 * ATLAS-FOLLOWUPS API (EO Write Path Fixed)
 * ATLAS-SOPHIA-EO-WRITE-API-FIX-001
 * 
 * GET/POST /api/followups
 * Query and create followup tasks
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

// Valid source types
const VALID_SOURCE_TYPES = ['meeting', 'event', 'manual', 'transcript'];

// Valid priorities
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Valid statuses
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

// GET /api/followups
// Query followup tasks
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const assignee_id = searchParams.get('assignee_id');
    const owner_id = searchParams.get('owner_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source_type = searchParams.get('source_type');
    const due_before = searchParams.get('due_before');
    const due_after = searchParams.get('due_after');
    const limit = parseInt(searchParams.get('limit') || '50');
    const include_completed = searchParams.get('include_completed') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    // Query meeting_tasks join to get followups from meetings
    let meetingTasksQuery = (supabase as any)
      .from('meeting_tasks')
      .select(`
        id,
        event_id,
        task_id,
        extracted_from_transcript,
        transcript_timestamp,
        context_quote,
        assigned_by,
        created_at,
        tasks:task_id (*),
        events:event_id (title, start_time, event_type)
      `)
      .limit(limit);
    
    // Query tasks that are prep tasks from executive_events
    let prepTasksQuery = (supabase as any)
      .from('executive_events')
      .select(`
        id,
        title,
        prep_task_id,
        prep_required,
        tasks:prep_task_id (*)
      `)
      .not('prep_task_id', 'is', null)
      .limit(limit);
    
    // Get all followups
    const { data: meetingTasks, error: meetingError } = await meetingTasksQuery;
    const { data: prepTasks, error: prepError } = await prepTasksQuery;
    
    if (meetingError) {
      console.error('[Followups GET] Meeting tasks query error:', meetingError);
    }
    
    if (prepError) {
      console.error('[Followups GET] Prep tasks query error:', prepError);
    }
    
    // Transform meeting tasks into followup format
    let followups: any[] = [];
    
    if (meetingTasks) {
      followups = meetingTasks.map((mt: any) => ({
        id: mt.task_id,
        followup_id: mt.id,
        source: 'meeting',
        source_id: mt.event_id,
        source_title: mt.events?.title || 'Unknown Meeting',
        source_time: mt.events?.start_time,
        source_type: mt.events?.event_type,
        ...mt.tasks,
        context_quote: mt.context_quote,
        extracted_from_transcript: mt.extracted_from_transcript,
        transcript_timestamp: mt.transcript_timestamp,
        meeting_task_created_at: mt.created_at,
      }));
    }
    
    // Add prep tasks
    if (prepTasks) {
      const prepFollowups = prepTasks.map((pt: any) => ({
        ...pt.tasks,
        id: pt.prep_task_id,
        source: 'event_prep',
        source_id: pt.id,
        source_title: pt.title,
        source_type: 'prep_required',
      }));
      followups = [...followups, ...prepFollowups];
    }
    
    // Apply filters
    if (assignee_id) {
      followups = followups.filter(f => f.assignee_id === assignee_id || f.assigned_to === assignee_id);
    }
    
    if (owner_id) {
      followups = followups.filter(f => f.owner_id === owner_id);
    }
    
    if (status) {
      followups = followups.filter(f => f.status === status);
    } else if (!include_completed) {
      followups = followups.filter(f => f.status !== 'completed' && f.status !== 'cancelled');
    }
    
    if (priority) {
      followups = followups.filter(f => f.priority === priority);
    }
    
    if (source_type) {
      followups = followups.filter(f => f.source === source_type);
    }
    
    if (due_before) {
      followups = followups.filter(f => f.due_at && f.due_at <= due_before);
    }
    
    if (due_after) {
      followups = followups.filter(f => f.due_at && f.due_at >= due_after);
    }
    
    // Sort by due date
    followups.sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
    
    // Calculate stats
    const stats = {
      total: followups.length,
      by_status: {} as Record<string, number>,
      overdue: followups.filter((f: any) => f.due_at && new Date(f.due_at) < new Date() && f.status !== 'completed').length,
    };
    
    followups.forEach((f: any) => {
      const s = f.status || 'unknown';
      stats.by_status[s] = (stats.by_status[s] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      followups,
      count: followups.length,
      stats,
      filters: {
        assignee_id,
        owner_id,
        status,
        priority,
        source_type,
        due_before,
        due_after,
        include_completed,
      },
      timestamp,
      source: 'meeting_tasks + executive_events prep_tasks',
    });
    
  } catch (error: any) {
    console.error('[Followups GET] Error:', error);
    return NextResponse.json({
      success: true,
      followups: [],
      count: 0,
      stats: { total: 0, by_status: {}, overdue: 0 },
      filters: {},
      timestamp,
      source: 'meeting_tasks + executive_events prep_tasks',
      error: error.message,
    });
  }
}

// POST /api/followups
// Create a followup task
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
      source_type,
      source_id,
      event_id,
      assigned_to,
      assignee_id,
      priority = 'medium',
      status = 'pending',
      due_date,
      due_at,
      context_quote,
      extracted_from_transcript,
      company_id,
      metadata = {},
    } = body;
    
    // Validation per Olivia contract
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required and must be a non-empty string', timestamp },
        { status: 400 }
      );
    }
    
    if (!source_type) {
      return NextResponse.json(
        { success: false, error: 'source_type is required', timestamp },
        { status: 400 }
      );
    }
    
    if (!VALID_SOURCE_TYPES.includes(source_type.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid source_type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}`, 
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
    
    // Validate due_date if provided
    const finalDueAt = due_at || due_date;
    if (finalDueAt) {
      const dueDate = new Date(finalDueAt);
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'due_date/due_at must be a valid ISO 8601 date string', timestamp },
          { status: 400 }
        );
      }
    }
    
    const supabase = getSupabaseAdmin();
    const taskId = randomUUID();
    
    // Insert task first
    let task;
    try {
      const taskResult = await (supabase as any)
        .from('tasks')
        .insert({
          id: taskId,
          title: title.trim(),
          description: description || null,
          task_type: 'implementation',  // ATLAS-OPTIMUS-EO-BLOCKER-FIXES-043: Use valid task_type from constraint
          status: status.toLowerCase(),
          priority: priority.toLowerCase(),
          assigned_agent_id: assigned_to || assignee_id || null,
          company_id: company_id || null,
          due_at: finalDueAt || null,
          metadata: {
            ...metadata,
            source_type,
            source_id: source_id || event_id || null,
            context_quote: context_quote || null,
            extracted_from_transcript: extracted_from_transcript || null,
            created_via: 'ATLAS-SOPHIA-EO-WRITE-API-FIX-001',
          },
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();
      
      if (taskResult.error) {
        console.error('[Followups POST] Task insert error:', taskResult.error);
        return NextResponse.json(
          { 
            success: false, 
            error: `Database error (tasks): ${taskResult.error.message}`,
            code: taskResult.error.code,
            timestamp,
          },
          { status: 500 }
        );
      }
      
      task = taskResult.data;
    } catch (dbError: any) {
      console.error('[Followups POST] Task DB exception:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database exception (tasks): ${dbError.message}`,
          timestamp,
        },
        { status: 500 }
      );
    }
    
    // ATLAS-OPTIMUS-EO-BLOCKER-FIXES-043: Create meeting_task link if event_id provided
    // Only create link if event_id exists and is valid in executive_events
    const finalEventId = event_id || source_id;
    if (finalEventId) {
      try {
        // First verify the event exists to avoid FK constraint violation
        const { data: eventExists, error: eventCheckError } = await (supabase as any)
          .from('executive_events')
          .select('id')
          .eq('id', finalEventId)
          .single();
        
        if (eventCheckError || !eventExists) {
          console.log(`[Followups POST] Event ${finalEventId} not found, skipping meeting_task link`);
        } else {
          // Event exists, create the link
          const linkResult = await (supabase as any)
            .from('meeting_tasks')
            .insert({
              id: randomUUID(),
              event_id: finalEventId,
              task_id: taskId,
              extracted_from_transcript: extracted_from_transcript || false,
              transcript_timestamp: extracted_from_transcript ? timestamp : null,
              context_quote: context_quote || null,
              assigned_by: assigned_to || assignee_id || null,
              created_at: timestamp,
            })
            .select()
            .single();
          
          if (linkResult.error) {
            // Non-fatal: log but don't fail the whole request
            console.log('[Followups POST] Meeting task link error (non-fatal):', linkResult.error);
          }
        }
      } catch (linkError: any) {
        console.log('[Followups POST] Meeting task link exception (non-fatal):', linkError);
      }
    }
    
    // Return explicit JSON per requirements
    return NextResponse.json({
      success: true,
      id: task.id,
      status: "created",
      followup: {
        ...task,
        source_type,
        source_id: source_id || event_id || null,
      },
      timestamp,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Followups POST] Unexpected error:', error);
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
