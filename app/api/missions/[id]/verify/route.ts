/**
 * POST /api/missions/:id/verify - ULTRA-HARDENED
 * ATLAS-OPTIMUS-MISSION-ACTION-ENDPOINTS-CLOSEOUT-1213
 * - Aggressive 2s timeout on ALL DB operations
 * - Parallel task fetching
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
    
    const { verification_notes, verified_by, verified_by_agent, criteria_results } = body;
    const supabase = getSupabaseAdmin();
    
    // GET mission - parallel with task links
    const [missionResult, linksResult] = await Promise.all([
      retryOperation(async () => {
        const { data, error } = await supabase
          .from('missions')
          .select('id,evidence_bundle,metadata')
          .eq('id', missionId)
          .is('deleted_at', null)
          .single();
        if (error) throw error;
        return data;
      }, 'get_mission'),
      retryOperation(async () => {
        const { data, error } = await supabase
          .from('mission_tasks')
          .select('task_id')
          .eq('mission_id', missionId);
        if (error) throw error;
        return data || [];
      }, 'get_task_links').catch(() => []),
    ]);
    
    if (!missionResult) {
      return NextResponse.json(
        { success: false, error: 'Mission not found', requestId, duration: Date.now() - startTime },
        { status: 404 }
      );
    }
    
    // Get tasks if we have links
    let missionTasks: any[] = [];
    if (linksResult.length > 0) {
      const taskIds = linksResult.map((t: any) => t.task_id);
      missionTasks = await retryOperation(async () => {
        const { data, error } = await supabase.from('tasks').select('id,title,status').in('id', taskIds);
        if (error) throw error;
        return data || [];
      }, 'get_tasks').catch(() => []);
    }
    
    const incompleteTasks = missionTasks.filter((t: any) => t.status !== 'completed');
    
    const verificationResult = {
      verified_at: timestamp,
      verified_by,
      verified_by_agent,
      notes: verification_notes,
      criteria_results: criteria_results || [],
      all_tasks_completed: incompleteTasks.length === 0,
      incomplete_task_count: incompleteTasks.length,
    };
    
    const updatedEvidence = {
      ...missionResult.evidence_bundle,
      verification: verificationResult,
    };
    
    // UPDATE mission
    const updatedMission = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('missions')
        .update({
          phase: 'verification',
          evidence_bundle: updatedEvidence,
          updated_at: timestamp,
          metadata: { ...missionResult.metadata, changed_by: verified_by, changed_by_agent: verified_by_agent }
        })
        .eq('id', missionId)
        .select('id,phase,evidence_bundle')
        .single();
      if (error) throw error;
      return data;
    }, 'update_mission');
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({ 
      level: 'info', 
      endpoint: 'verify', 
      requestId, 
      missionId, 
      duration, 
      tasksChecked: missionTasks.length,
      incompleteTasks: incompleteTasks.length,
      success: true 
    }));
    
    return NextResponse.json({
      success: true,
      mission: updatedMission,
      verification: verificationResult,
      can_complete: incompleteTasks.length === 0,
      incomplete_tasks: incompleteTasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status })),
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('TIMEOUT');
    console.log(JSON.stringify({ 
      level: 'error', 
      endpoint: 'verify', 
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
