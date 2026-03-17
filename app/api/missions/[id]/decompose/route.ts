/**
 * POST /api/missions/:id/decompose - ULTRA-HARDENED
 * ATLAS-OPTIMUS-MISSION-ACTION-ENDPOINTS-CLOSEOUT-1213
 * - Aggressive 2s timeout on ALL DB operations
 * - Minimal field selection
 * - Single batch insert, no sequential awaits
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 2000;
const MAX_RETRY = 2;

async function dbWithTimeout<T>(operation: () => Promise<T>, context: string): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`DB_TIMEOUT:${context}`)), DB_TIMEOUT_MS)
    )
  ]);
}

async function retryOperation<T>(operation: () => Promise<T>, context: string): Promise<T> {
  let lastError;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      return await dbWithTimeout(operation, context);
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRY - 1 && !(error instanceof Error && error.message.includes('TIMEOUT'))) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  }
  throw lastError;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  const startTime = Date.now();
  
  try {
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('BODY_TIMEOUT')), 500))
    ]) as any;
    
    const { tasks: taskDefs, created_by, created_by_agent } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tasks array required', requestId },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // GET mission - minimal fields
    const mission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,phase,priority,company_id,metadata')
        .eq('id', missionId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data;
    }, 'get_mission');
    
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found', requestId, duration: Date.now() - startTime },
        { status: 404 }
      );
    }
    
    // Prepare task payloads
    const taskPayloads = taskDefs.map((taskDef: any) => ({
      id: randomUUID(),
      title: taskDef.title,
      description: taskDef.description || null,
      status: taskDef.status || 'pending',
      priority: taskDef.priority || mission.priority || 'medium',
      assignee_id: taskDef.assignee_id || null,
      assignee_agent: taskDef.assignee_agent || null,
      company_id: mission.company_id,
      task_type: taskDef.task_type || 'implementation',
      metadata: { mission_id: missionId, created_from_decompose: true },
      created_at: timestamp,
      updated_at: timestamp,
    }));
    
    // Batch insert tasks with timeout
    const createdTasks = await retryOperation(async () => {
      const { data, error } = await supabase.from('tasks').insert(taskPayloads).select('id,title,status');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // Fire-and-forget links (non-blocking)
    const linkPayloads = createdTasks.map((task: any, i: number) => ({
      mission_id: missionId,
      task_id: task.id,
      task_role: taskDefs[i]?.role || 'subtask',
      sequence_order: taskDefs[i]?.sequence_order || i,
      is_blocking: taskDefs[i]?.is_blocking || false,
    }));
    supabase.from('mission_tasks').insert(linkPayloads).then(() => {}).catch(() => {});
    
    // Fire-and-forget mission update (non-blocking)
    if (mission.phase === 'planning') {
      supabase.from('missions').update({
        phase: 'execution',
        status: 'active',
        actual_start_date: timestamp,
        updated_at: timestamp,
        metadata: { ...mission.metadata, changed_by: created_by, changed_by_agent: created_by_agent }
      }).eq('id', missionId).then(() => {}).catch(() => {});
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({ 
      level: 'info', 
      endpoint: 'decompose', 
      requestId, 
      missionId, 
      duration, 
      tasksCreated: createdTasks.length,
      success: true 
    }));
    
    return NextResponse.json({
      success: true,
      mission_id: missionId,
      tasks_created: createdTasks.length,
      tasks: createdTasks,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('TIMEOUT');
    console.log(JSON.stringify({ 
      level: 'error', 
      endpoint: 'decompose', 
      requestId, 
      missionId, 
      duration, 
      error: error.message, 
      isTimeout 
    }));
    
    return NextResponse.json(
      { success: false, error: isTimeout ? 'Database timeout' : error.message, requestId, duration },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
