/**
 * ATLAS-9924: Tasks API with Mission Filter Support
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const missionId = searchParams.get('mission_id');
    const status = searchParams.get('status');
    const assignedAgentId = searchParams.get('assigned_agent_id');
    
    const supabase = getSupabaseAdmin();
    
    // Build query
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (missionId) {
      query = query.eq('mission_id', missionId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (assignedAgentId) {
      query = query.eq('assigned_agent_id', assignedAgentId);
    }
    
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      tasks: data || [],
      count,
      filters: { missionId, status, assignedAgentId },
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    const taskData = {
      id: body.id || crypto.randomUUID(),
      title: body.title,
      description: body.description || null,
      mission_id: body.mission_id || null,
      assigned_agent_id: body.assigned_agent_id || null,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      task_type: body.task_type || 'implementation',
      task_order: body.task_order || 0,
      owner_id: body.owner_id || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update mission child_task_count
    if (body.mission_id) {
      await supabase.rpc('increment_task_count', { mission_uuid: body.mission_id });
    }
    
    return NextResponse.json({
      success: true,
      task,
      duration: Date.now() - startTime
    }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
