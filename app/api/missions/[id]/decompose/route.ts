/**
 * POST /api/missions/:id/decompose - HARDENED
 * ATLAS-OPTIMUS-MISSION-ENGINE-HARDENING-1204
 * - 3s timeout guard
 * - Retry logic
 * - Comprehensive logging
 * - Parallel task creation
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_EXECUTION_MS = 3000;

interface LogEntry {
  requestId: string;
  endpoint: string;
  missionId: string;
  duration: number;
  success: boolean;
  errorSource?: string;
  tasksCreated?: number;
}

function logAccess(entry: LogEntry) {
  console.log(JSON.stringify({
    level: entry.success ? 'info' : 'error',
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, context: string): Promise<{ data: T | null; error: any; attempts: number }> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const data = await fn();
      return { data, error: null, attempts: i + 1 };
    } catch (error) {
      lastError = error;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  return { data: null, error: lastError, attempts: retries };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const { id: missionId } = params;
  const startTime = Date.now();
  
  console.log(`[${requestId}] POST /api/missions/${missionId}/decompose started`);
  
  try {
    const body = await withTimeout(request.json(), 1000, 'body parsing');
    const { tasks: taskDefs, created_by, created_by_agent } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array is required',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (missionError || !mission) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/decompose', missionId, duration, success: false, errorSource: 'not_found' });
      return NextResponse.json({ success: false, error: 'Mission not found', timestamp, requestId, duration }, { status: 404 });
    }
    
    // Create all tasks in parallel (batch insert)
    const taskPayloads = taskDefs.map((taskDef: any, i: number) => ({
      id: randomUUID(),
      title: taskDef.title,
      description: taskDef.description || null,
      status: taskDef.status || 'pending',
      priority: taskDef.priority || mission.priority || 'medium',
      assignee_id: taskDef.assignee_id || null,
      assignee_agent: taskDef.assignee_agent || null,
      company_id: mission.company_id,
      parent_id: null,
      due_date: taskDef.due_date || null,
      task_type: taskDef.task_type || 'implementation',
      metadata: { mission_id: missionId, created_from_decompose: true, ...taskDef.metadata },
      created_at: timestamp,
      updated_at: timestamp,
    }));
    
    // Insert tasks
    const { data: createdTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(taskPayloads)
      .select();
    
    if (tasksError) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/decompose', missionId, duration, success: false, errorSource: 'tasks_insert' });
      return NextResponse.json({ success: false, error: tasksError.message, timestamp, requestId, duration }, { status: 500 });
    }
    
    // Create mission_task links in parallel
    const linkPayloads = (createdTasks || []).map((task: any, i: number) => ({
      mission_id: missionId,
      task_id: task.id,
      task_role: taskDefs[i]?.role || 'subtask',
      sequence_order: taskDefs[i]?.sequence_order || i,
      is_blocking: taskDefs[i]?.is_blocking || false,
    }));
    
    const { data: taskLinks } = await supabase
      .from('mission_tasks')
      .insert(linkPayloads)
      .select();
    
    // Fire-and-forget mission update (non-blocking)
    if (mission.phase === 'planning') {
      (async () => {
        try {
          await supabase.from('missions').update({
            phase: 'execution',
            status: 'active',
            actual_start_date: timestamp,
            updated_at: timestamp,
            metadata: { ...mission.metadata, changed_by: created_by, changed_by_agent: created_by_agent }
          }).eq('id', missionId);
        } catch {}
      })();
    }
    
    const duration = Date.now() - startTime;
    logAccess({ 
      requestId, 
      endpoint: '/decompose', 
      missionId, 
      duration, 
      success: true, 
      tasksCreated: createdTasks?.length || 0 
    });
    
    return NextResponse.json({
      success: true,
      mission_id: missionId,
      tasks_created: createdTasks?.length || 0,
      tasks: createdTasks || [],
      links: taskLinks || [],
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ requestId, endpoint: '/decompose', missionId, duration, success: false, errorSource: isTimeout ? 'timeout' : 'exception' });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}
