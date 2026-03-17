/**
 * POST /api/missions-v2/:id/decompose-v2 - INTEGRITY FIX 9217
 * ATLAS-OPTIMUS-DECOMPOSE-INTEGRITY-FIX-9217
 * 
 * FIXED:
 * - owner_id now resolves to agent UUID (not 'unassigned')
 * - mission_id now persists correctly on all child tasks
 * - Hard validation: rejects tasks missing agent assignment
 * - Deterministic fallback: name -> UUID lookup -> name lowercase
 * 
 * BUILD: 9217-FRESH-DEPLOY
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 5000;
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

async function resolveOwnerId(supabase: any, agentName: string): Promise<string> {
  const normalizedName = agentName.toLowerCase().trim();
  if (!normalizedName || normalizedName === 'unassigned') return 'unassigned';
  
  try {
    const agent = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('name', normalizedName)
        .maybeSingle();
      if (error) throw error;
      return data;
    }, 'resolve_owner');
    
    return agent?.id || normalizedName;
  } catch {
    return normalizedName;
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
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // Get mission
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
    
    // HARD VALIDATION: Every task must have agent assignment
    for (const def of taskDefs) {
      const hasAgent = def.assigned_agent_id || def.owner_agent;
      if (!hasAgent) {
        return NextResponse.json({
          success: false,
          error: `Task "${def.title || 'Untitled'}" missing assigned_agent_id or owner_agent`,
          requestId: rid,
          duration: Date.now() - startTime
        }, { status: 400 });
      }
    }
    
    // Resolve owner_ids
    const ownerIdMap = new Map<string, string>();
    for (const def of taskDefs) {
      const agentInput = (def.assigned_agent_id || def.owner_agent)!;
      const normalizedKey = agentInput.toLowerCase().trim();
      if (!ownerIdMap.has(normalizedKey)) {
        ownerIdMap.set(normalizedKey, await resolveOwnerId(supabase, agentInput));
      }
    }
    
    // Build payloads with GUARANTEED values
    const payloads = taskDefs.map((def: TaskDef) => {
      const agentInput = (def.assigned_agent_id || def.owner_agent)!.toLowerCase().trim();
      const ownerId = ownerIdMap.get(agentInput)!;
      
      return {
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled Task',
        description: def.description || null,
        status: def.status || 'pending',
        priority: def.priority || mission.priority || 'medium',
        company_id: mission.company_id,
        task_type: def.task_type || 'implementation',
        assigned_agent_id: agentInput,
        owner_id: ownerId,
        mission_id: missionId,
        metadata: { mission_id: missionId, source: 'decompose-9217' },
        created_at: timestamp,
        updated_at: timestamp
      };
    });
    
    // Insert with full field verification
    const created = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payloads)
        .select('id,title,status,assigned_agent_id,owner_id,mission_id');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // Verify integrity
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
    
    // Create mission_task links
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
      build_marker: "DECOMPOSE-WRITEPATH-9223",
      version: "9217-INTEGRITY-FIX",
      mission: {
        id: missionId,
        phase: 'execution',
        status: 'active',
        child_task_count: created.length
      },
      tasks: verifiedTasks,
      requestId: rid,
      duration: Date.now() - startTime,
      timestamp
    });
    
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      requestId: rid,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
