/**
 * ATLAS-TASKS API - Executive Ops Write Path
 * ATLAS-SOPHIA-EO-WRITE-API-FIX-001
 * 
 * GET/POST /api/tasks
 * Manage tasks with Executive Ops integration
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

// Valid Atlas agents for task assignment
const VALID_AGENTS = [
  'henry', 'severino', 'olivia', 'sophia', 
  'harvey', 'einstein', 'optimus', 'optimus-prime'
];

// Valid task types for Executive Ops (Olivia payload contract)
const VALID_TASK_TYPES = [
  'event_creation',
  'task_creation', 
  'generate_briefing',
  'delegated_assignment',
  'follow_up',
  'implementation',
  'review',
  'approval',
  'research',
  'coordination',
  'analysis'
];

// Map Olivia payload types to database-valid task types
const TASK_TYPE_MAP: Record<string, string> = {
  'event_creation': 'implementation',
  'task_creation': 'implementation',
  'generate_briefing': 'implementation',
  'delegated_assignment': 'implementation',
  'follow_up': 'implementation',
  'review': 'review',
  'approval': 'approval',
  'research': 'research',
  'coordination': 'coordination',
  'analysis': 'analysis',
};

// POST - Create new task (Executive Ops write path)
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
    
    // Extract fields from Olivia payload contract
    const {
      title,
      description,
      task_type,
      assigned_agent_id,
      priority = 'medium',
      company_id,
      parent_task_id,
      command_id,
      execution_id,
      metadata = {},
      realm,
      source,
      initiator,
    } = body;
    
    // Validation 1: title required
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'title is required and must be a non-empty string', timestamp },
        { status: 400 }
      );
    }
    
    // Validation 2: task_type required and valid
    if (!task_type) {
      return NextResponse.json(
        { success: false, error: 'task_type is required', timestamp },
        { status: 400 }
      );
    }
    
    if (!VALID_TASK_TYPES.includes(task_type.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid task_type. Must be one of: ${VALID_TASK_TYPES.join(', ')}`, 
          timestamp 
        },
        { status: 400 }
      );
    }
    
    // Validation 3: assigned_agent_id required and valid
    if (!assigned_agent_id) {
      return NextResponse.json(
        { success: false, error: 'assigned_agent_id is required', timestamp },
        { status: 400 }
      );
    }
    
    if (!VALID_AGENTS.includes(assigned_agent_id.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid assigned_agent_id. Must be one of: ${VALID_AGENTS.join(', ')}`, 
          timestamp 
        },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Map task type to database-valid value
    const dbTaskType = TASK_TYPE_MAP[task_type.toLowerCase()] || 'implementation';
    
    // Generate UUID
    const taskId = randomUUID();
    
    // Build task record with Executive Ops realm
    const taskRecord = {
      id: taskId,
      title: title.trim(),
      description: description || null,
      task_type: dbTaskType,
      status: 'pending',
      priority: priority.toLowerCase(),
      assigned_agent_id: assigned_agent_id.toLowerCase(),
      company_id: company_id || null,
      parent_task_id: parent_task_id || null,
      command_id: command_id || null,
      execution_id: execution_id || null,
      task_order: 9999,
      metadata: {
        ...metadata,
        realm: realm || 'executive-ops',
        source: source || 'api',
        initiator: initiator || 'unknown',
        original_task_type: task_type,
        created_via: 'ATLAS-SOPHIA-EO-WRITE-API-FIX-001',
        created_at: timestamp,
      },
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Insert task into database
    let task;
    try {
      const { data, error: insertError } = await (supabase as any)
        .from('tasks')
        .insert(taskRecord)
        .select()
        .single();
      
      if (insertError) {
        console.error('[Tasks POST] DB insert error:', insertError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Database error: ${insertError.message}`,
            code: insertError.code,
            timestamp,
          },
          { status: 500 }
        );
      }
      
      task = data;
    } catch (dbError: any) {
      console.error('[Tasks POST] DB exception:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database exception: ${dbError.message}`,
          timestamp,
        },
        { status: 500 }
      );
    }
    
    // Return explicit JSON response per requirements
    return NextResponse.json({
      success: true,
      id: task.id,
      status: "created",
      task: {
        id: task.id,
        title: task.title,
        task_type: task_type,
        db_task_type: task.task_type,
        status: task.status,
        priority: task.priority,
        assigned_agent_id: task.assigned_agent_id,
        created_at: task.created_at,
      },
      timestamp,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Tasks POST] Unexpected error:', error);
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

// GET - List tasks
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assigned_agent_id = searchParams.get('assigned_agent_id');
    const company_id = searchParams.get('company_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const supabase = getSupabaseAdmin();
    
    let query = (supabase as any)
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (assigned_agent_id) {
      query = query.eq('assigned_agent_id', assigned_agent_id.toLowerCase());
    }
    
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Tasks GET] Query error:', error);
      return NextResponse.json({
        success: true,
        tasks: [],
        count: 0,
        timestamp,
        source: 'tasks',
        error: `Query error: ${error.message}`,
      });
    }
    
    return NextResponse.json({
      success: true,
      tasks: data || [],
      count: data?.length || 0,
      timestamp,
      source: 'tasks',
    });
    
  } catch (error: any) {
    console.error('[Tasks GET] Error:', error);
    return NextResponse.json({
      success: true,
      tasks: [],
      count: 0,
      timestamp,
      source: 'tasks',
      error: error.message,
    });
  }
}
