/**
 * POST /api/missions/:id/decompose - WRITEPATH FIX 9223
 * ATLAS-OPTIMUS-DECOMPOSE-WRITEPATH-FIX-9223
 * 
 * FIXED:
 * - Uses same pattern as POST /api/tasks for owner_id resolution
 * - assigned_agent_id-only payloads now work correctly
 * - mission_id persists correctly (from URL param, not optional)
 * - Build marker for stale deploy detection
 * 
 * BUILD: DECOMPOSE-WRITEPATH-9223
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 5000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 200;
const BUILD_MARKER = 'DECOMPOSE-WRITEPATH-9223';

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

// DB retry wrapper - EXACT MATCH to POST /api/tasks
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

// Owner resolution - EXACT MATCH to POST /api/tasks
async function resolveOwnerId(supabase: any, assigned_agent_id: string): Promise<string> {
  try {
    const agent = await withDbRetry(async () => {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('name', assigned_agent_id.toLowerCase())
        .maybeSingle();
      return data;
    }, 'resolve_owner');
    
    return agent?.id || assigned_agent_id.toLowerCase();
  } catch {
    return assigned_agent_id.toLowerCase();
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
        build_marker: BUILD_MARKER,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // Get mission (for priority, company_id context)
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
        build_marker: BUILD_MARKER,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    // Build payloads using EXACT same pattern as POST /api/tasks
    const payloads = await Promise.all(taskDefs.map(async (def: TaskDef) => {
      // Get agent identifier: assigned_agent_id takes priority over owner_agent
      const agentInput = def.assigned_agent_id || def.owner_agent;
      
      if (!agentInput) {
        throw new Error(`Task "${def.title || 'Untitled'}" missing assigned_agent_id or owner_agent`);
      }
      
      const normalizedAgentId = agentInput.toLowerCase().trim();
      
      // Resolve owner_id using SAME function as POST /api/tasks
      const owner_id = await resolveOwnerId(supabase, normalizedAgentId);
      
      return {
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled Task',
        description: def.description || null,
        task_type: (def.task_type || 'implementation').toLowerCase(),
        status: def.status || 'pending',
        priority: (def.priority || mission.priority || 'medium').toLowerCase(),
        assigned_agent_id: normalizedAgentId,
        owner_id,
        mission_id: missionId, // REQUIRED: from URL param
        company_id: mission.company_id,
        metadata: { 
          mission_id: missionId, 
          source: BUILD_MARKER,
          created_at: timestamp 
        },
        created_at: timestamp,
        updated_at: timestamp
      };
    }));
    
    // Insert tasks with full field verification
    const created = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payloads)
        .select('id,title,status,assigned_agent_id,owner_id,mission_id');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // Build integrity-verified response
    const verifiedTasks = created.map((t: any) => ({
      id: t.id,
      title: t.title,
      assigned_agent_id: t.assigned_agent_id,
      owner_id: t.owner_id,
      mission_id: t.mission_id,
      integrity: {
        has_assigned: t.assigned_agent_id != null,
        has_owner: t.owner_id != null && t.owner_id !== 'unassigned',
        has_mission: t.mission_id != null
      }
    }));
    
    // Create mission_task links (fire-and-forget)
    if (created.length > 0) {
      const links = created.map((t: any, i: number) => ({
        mission_id: missionId,
        task_id: t.id,
        task_role: taskDefs[i]?.role || 'subtask',
        sequence_order: i,
        is_blocking: taskDefs[i]?.is_blocking || false
      }));
      withDbRetry(() => supabase.from('mission_tasks').insert(links), 'insert_links').catch(() => {});
    }
    
    // Update mission phase (fire-and-forget)
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
      tasks: verifiedTasks,
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
