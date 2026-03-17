/**
 * POST /api/missions/:id/decompose - COLD-START OPTIMIZED
 * ATLAS-OPTIMUS-RAIL-COLDSTART-REMEDIATION-9201
 * 
 * - FORCE NODEJS RUNTIME
 * - DB-call-only retry (not whole handler)
 * - 5s timeout on first request (cold-start tolerant)
 * - Lazy Supabase client init
 * - BUILD: 9201-COLDSTART-FIX
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// COLD-START: Longer timeout for first request (connection establishment)
const DB_TIMEOUT_MS = 5000; // 5s for cold-start tolerance
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 200;

interface TaskDef {
  title?: string;
  description?: string;
  task_type?: string;
  assigned_agent_id?: string;
  owner_agent?: string;
  status?: string;
  priority?: string;
  role?: string;
  is_blocking?: boolean;
}

// Retry wrapper ONLY for DB operations (not whole handler)
async function withDbRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      // Add timeout to each attempt
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timeout`)), DB_TIMEOUT_MS)
      );
      return await Promise.race([fn(), timeoutPromise]) as T;
    } catch (err) {
      lastError = err;
      console.log(`[DB RETRY ${i+1}/${RETRY_ATTEMPTS}] ${operation}: ${err}`);
      if (i < RETRY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  try {
    // Parse body with timeout
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('body parse timeout')), 2000))
    ]) as { tasks?: TaskDef[] };
    
    const { tasks: taskDefs } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // LAZY: Initialize Supabase only when needed (after validation)
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // DB CALL 1: Get mission (with retry)
    const mission = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id,phase,priority,company_id')
        .eq('id', missionId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data;
    }, 'get_mission');
    
    if (!mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    // Build payloads with guaranteed non-null assigned_agent_id
    const payloads = taskDefs.map((def: TaskDef) => {
      const agentId = (def.assigned_agent_id || def.owner_agent || 'unassigned')
        .toLowerCase()
        .trim();
      
      return {
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled Task',
        description: def.description || null,
        status: def.status || 'pending',
        priority: def.priority || mission.priority || 'medium',
        company_id: mission.company_id,
        task_type: def.task_type || 'implementation',
        assigned_agent_id: agentId,
        owner_id: agentId,
        mission_id: missionId,
        metadata: { mission_id: missionId, source: 'decompose' },
        created_at: timestamp,
        updated_at: timestamp
      };
    });
    
    // DB CALL 2: Insert tasks (with retry)
    const created = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payloads)
        .select('id,title,status,assigned_agent_id,owner_id,mission_id');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // DB CALL 3: Create mission_task links (fire-and-forget with retry)
    if (created.length > 0) {
      const links = created.map((t: any, i: number) => ({
        mission_id: missionId,
        task_id: t.id,
        task_role: taskDefs[i]?.role || 'subtask',
        sequence_order: i,
        is_blocking: taskDefs[i]?.is_blocking || false
      }));
      
      // Non-blocking: don't await
      withDbRetry(() => supabase.from('mission_tasks').insert(links), 'insert_links')
        .catch(err => console.log('[LINKS ERROR]', err.message));
    }
    
    // DB CALL 4: Update mission phase (fire-and-forget with retry)
    if (mission.phase === 'planning') {
      withDbRetry(() => 
        supabase.from('missions').update({
          phase: 'execution',
          status: 'active',
          updated_at: timestamp
        }).eq('id', missionId),
        'update_mission'
      ).catch(err => console.log('[MISSION UPDATE ERROR]', err.message));
    }
    
    const duration = Date.now() - startTime;
    
    // Structured log
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
      missionId,
      duration,
      tasksCreated: created.length,
      coldStart: duration > 1000,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: {
        id: missionId,
        phase: 'execution',
        status: 'active',
        child_task_count: created.length
      },
      tasks: created,
      requestId: rid,
      duration,
      timestamp
    });
    
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isTimeout = err.message?.includes('timeout');
    
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions/:id/decompose',
      requestId: rid,
      missionId,
      duration,
      error: err.message,
      isTimeout,
      success: false
    }));
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - retry' : err.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
