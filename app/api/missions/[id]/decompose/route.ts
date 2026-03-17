/**
 * POST /api/missions/:id/decompose - WRITEPATH FIX 9223
 * ATLAS-OPTIMUS-DECOMPOSE-WRITEPATH-FIX-9223
 * FRESH DEPLOY AFTER PURGE
 * 
 * BUILD: DECOMPOSE-WRITEPATH-9223-FRESH
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 5000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 200;
const BUILD_MARKER = 'DECOMPOSE-WRITEPATH-9223-FRESH';

interface TaskDef {
  title?: string;
  description?: string;
  task_type?: string;
  assigned_agent_id?: string;
  owner_agent?: string;
}

async function withDbRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: any;
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timeout`)), DB_TIMEOUT_MS)
      );
      return await Promise.race([fn(), timeoutPromise]) as T;
    } catch (err) {
      lastError = err;
      if (i < RETRY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function resolveOwnerId(supabase: any, agentId: string): Promise<string> {
  try {
    const agent = await withDbRetry(async () => {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('name', agentId.toLowerCase())
        .maybeSingle();
      return data;
    }, 'resolve_owner');
    return agent?.id || agentId.toLowerCase();
  } catch {
    return agentId.toLowerCase();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = randomUUID().slice(0, 8);
  const missionId = params.id;
  
  try {
    const body = await request.json() as { tasks?: TaskDef[] };
    const { tasks: taskDefs } = body;
    
    if (!taskDefs || !Array.isArray(taskDefs) || taskDefs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'tasks array required',
        build_marker: BUILD_MARKER,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
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
        build_marker: BUILD_MARKER,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    // Process tasks sequentially to avoid race conditions
    const payloads = [];
    for (const def of taskDefs) {
      const agentInput = def.assigned_agent_id || def.owner_agent;
      if (!agentInput) {
        return NextResponse.json({
          success: false,
          error: `Task "${def.title || 'Untitled'}" missing assigned_agent_id or owner_agent`,
          build_marker: BUILD_MARKER,
          requestId: rid,
          duration: Date.now() - startTime
        }, { status: 400 });
      }
      
      const normalizedAgentId = agentInput.toLowerCase().trim();
      const owner_id = await resolveOwnerId(supabase, normalizedAgentId);
      
      payloads.push({
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled Task',
        description: def.description || null,
        task_type: (def.task_type || 'implementation').toLowerCase(),
        status: 'pending',
        priority: (def.priority || mission.priority || 'medium').toLowerCase(),
        assigned_agent_id: normalizedAgentId,
        owner_id,
        mission_id: missionId,
        company_id: mission.company_id,
        metadata: { source: BUILD_MARKER },
        created_at: timestamp,
        updated_at: timestamp
      });
    }
    
    const created = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payloads)
        .select('id,title,status,assigned_agent_id,owner_id,mission_id');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // Update mission phase
    if (mission.phase === 'planning') {
      withDbRetry(() => 
        supabase.from('missions').update({
          phase: 'execution',
          status: 'active',
          updated_at: timestamp
        }).eq('id', missionId),
        'update_mission'
      ).catch(() => {});
    }
    
    return NextResponse.json({
      success: true,
      mission: {
        id: missionId,
        phase: 'execution',
        status: 'active',
        child_task_count: created.length
      },
      tasks: created.map((t: any) => ({
        id: t.id,
        title: t.title,
        assigned_agent_id: t.assigned_agent_id,
        owner_id: t.owner_id,
        mission_id: t.mission_id
      })),
      build_marker: BUILD_MARKER,
      requestId: rid,
      duration: Date.now() - startTime,
      timestamp
    });
    
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      build_marker: BUILD_MARKER,
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
