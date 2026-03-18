/**
 * ATLAS-9924: Missions API with Real Child Task Counts
 * Fixes the 0 child_task_count issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, withDbRetry } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestId = () => randomUUID().slice(0, 8);

// GET /api/missions - WITH REAL CHILD TASK COUNTS
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    // Get missions
    const { data: missions, error, count } = await supabase
      .from('missions')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    // Get actual task counts for each mission
    const missionIds = (missions || []).map(m => m.id);
    let taskCounts: Record<string, { total: number; completed: number }> = {};
    
    if (missionIds.length > 0) {
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('mission_id, status')
        .in('mission_id', missionIds);
      
      if (!taskError && tasks) {
        for (const t of tasks) {
          if (!taskCounts[t.mission_id]) {
            taskCounts[t.mission_id] = { total: 0, completed: 0 };
          }
          taskCounts[t.mission_id].total++;
          if (t.status === 'completed') {
            taskCounts[t.mission_id].completed++;
          }
        }
      }
    }
    
    // Merge counts into missions
    const missionsWithCounts = (missions || []).map(m => ({
      ...m,
      child_task_count: taskCounts[m.id]?.total || 0,
      completed_task_count: taskCounts[m.id]?.completed || 0
    }));
    
    return NextResponse.json({
      success: true,
      missions: missionsWithCounts,
      count,
      requestId: rid,
      duration: Date.now() - startTime
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// POST /api/missions - Create new mission
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    const missionData = {
      id: randomUUID(),
      title: body.title,
      description: body.description || null,
      objective: body.objective || null,
      status: body.status || 'draft',
      phase: body.phase || 'planning',
      priority: body.priority || 'medium',
      created_by: body.created_by || 'system',
      assigned_to: body.assigned_to || null,
      child_task_count: 0,
      completed_task_count: 0,
      progress_percent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: mission, error } = await supabase
      .from('missions')
      .insert(missionData)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      mission,
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 201 });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
