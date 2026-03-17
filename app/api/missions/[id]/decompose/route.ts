/**
 * POST /api/missions/:id/decompose - RAIL-HARDENED
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard
 * - 2 retries with 150ms backoff
 * - Structured logging (requestId, duration, errorSource)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const withTimeout = (promise: Promise<any>, ms = 3000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("timeout")), ms)
    )
  ]);
};

async function withRetry(fn: () => Promise<any>, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 150 * (i + 1)));
    }
  }
}

const requestId = () => randomUUID().slice(0, 8);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const { tasks: taskDefs } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // Get mission
    const missionResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .select('id,phase,priority,company_id')
          .eq('id', missionId)
          .is('deleted_at', null)
          .single(),
        3000
      )
    );
    
    if (!missionResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    const mission = missionResult.data;
    
    // Prepare task payloads
    const taskPayloads = taskDefs.map((taskDef: any) => ({
      id: randomUUID(),
      title: taskDef.title,
      description: taskDef.description || null,
      status: taskDef.status || 'pending',
      priority: taskDef.priority || mission.priority || 'medium',
      company_id: mission.company_id,
      task_type: taskDef.task_type || 'implementation',
      metadata: { mission_id: missionId },
      created_at: timestamp,
      updated_at: timestamp,
    }));
    
    // Insert tasks
    const tasksResult = await withRetry(() =>
      withTimeout(
        supabase.from('tasks').insert(taskPayloads).select('id,title,status'),
        3000
      )
    );
    
    if (tasksResult.error) throw tasksResult.error;
    
    // Create mission_task links
    const createdTasks = tasksResult.data || [];
    if (createdTasks.length > 0) {
      const linkPayloads = createdTasks.map((task: any, i: number) => ({
        mission_id: missionId,
        task_id: task.id,
        task_role: taskDefs[i]?.role || 'subtask',
        sequence_order: i,
        is_blocking: taskDefs[i]?.is_blocking || false,
      }));
      
      // Fire-and-forget links
      supabase.from('mission_tasks').insert(linkPayloads).then(() => {}).catch(() => {});
    }
    
    // Fire-and-forget mission update
    if (mission.phase === 'planning') {
      supabase.from('missions').update({
        phase: 'execution',
        status: 'active',
        actual_start_date: timestamp,
        updated_at: timestamp
      }).eq('id', missionId).then(() => {}).catch(() => {});
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
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
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
      missionId,
      duration,
      errorSource: isTimeout ? 'timeout' : 'exception',
      success: false
    }));
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      requestId: rid,
      duration
    }, { status: isTimeout ? 504 : 500 });
  }
}
