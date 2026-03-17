/**
 * POST /api/missions/:id/decompose - INTEGRITY FIX
 * ATLAS-OPTIMUS-DECOMPOSE-INTEGRITY-FIX-9217
 * 
 * Fixes:
 * - owner_id now resolves to agent UUID (not 'unassigned')
 * - mission_id now persists correctly
 * - Deterministic fallback: agent name -> UUID lookup -> name lowercase
 * 
 * - FORCE NODEJS RUNTIME
 * - 5s DB timeout with retry
 * - BUILD: 9217-INTEGRITY-FIX
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

// DB retry wrapper
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

/**
 * Resolve owner_id from agent name
 * POLICY: 
 * 1. Look up agents table by name
 * 2. If found, use agent.id
 * 3. If not found, fallback to lowercase agent name
 * 4. Never return 'unassigned' if agent name was provided
 */
async function resolveOwnerId(supabase: any, agentName: string): Promise<string> {
  const normalizedName = agentName.toLowerCase().trim();
  
  // Skip lookup for empty/unassigned (should not happen with validation)
  if (!normalizedName || normalizedName === 'unassigned') {
    return 'unassigned';
  }
  
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
    
    // POLICY: If agent found, use UUID; else use normalized name as fallback
    return agent?.id || normalizedName;
  } catch (err) {
    // On any error, fallback to normalized name (never 'unassigned')
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
    // Parse body
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
    
    // Resolve owner_ids for all unique agents
    const ownerIdMap = new Map<string, string>();
    for (const def of taskDefs) {
      // PRIORITY: assigned_agent_id > owner_agent > null
      const agentInput = def.assigned_agent_id || def.owner_agent;
      
      if (!agentInput) {
        return NextResponse.json({
          success: false,
          error: `Task "${def.title || 'Untitled'}" missing assigned_agent_id or owner_agent`,
          requestId: rid,
          duration: Date.now() - startTime
        }, { status: 400 });
      }
      
      const normalizedKey = agentInput.toLowerCase().trim();
      if (!ownerIdMap.has(normalizedKey)) {
        const resolvedId = await resolveOwnerId(supabase, agentInput);
        ownerIdMap.set(normalizedKey, resolvedId);
      }
    }
    
    // Build insert payloads with GUARANTEED non-null values
    const payloads = taskDefs.map((def: TaskDef, idx: number) => {
      // Get agent identifier (already validated above)
      const agentInput = (def.assigned_agent_id || def.owner_agent)!.toLowerCase().trim();
      
      // Look up resolved owner_id from map
      const ownerId = ownerIdMap.get(agentInput);
      
      if (!ownerId) {
        throw new Error(`Failed to resolve owner_id for agent: ${agentInput}`);
      }
      
      // CRITICAL: These must NEVER be null/undefined
      const payload = {
        id: randomUUID(),
        title: def.title?.trim() || 'Untitled Task',
        description: def.description || null,
        status: def.status || 'pending',
        priority: def.priority || mission.priority || 'medium',
        company_id: mission.company_id,
        task_type: def.task_type || 'implementation',
        assigned_agent_id: agentInput,  // GUARANTEED: validated above
        owner_id: ownerId,               // GUARANTEED: resolved from map
        mission_id: missionId,           // GUARANTEED: from URL param
        metadata: { 
          mission_id: missionId, 
          source: 'decompose',
          created_at: timestamp
        },
        created_at: timestamp,
        updated_at: timestamp
      };
      
      return payload;
    });
    
    // Insert tasks with full field selection
    const created = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payloads)
        .select('id,title,status,assigned_agent_id,owner_id,mission_id,created_at');
      if (error) throw error;
      return data || [];
    }, 'insert_tasks');
    
    // Verify insert integrity (post-insert check)
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
      
      withDbRetry(() => supabase.from('mission_tasks').insert(links), 'insert_links')
        .catch(() => {}); // Non-blocking
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
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      mission: {
        id: missionId,
        phase: 'execution',
        status: 'active',
        child_task_count: created.length
      },
      tasks: verifiedTasks,
      requestId: rid,
      duration,
      timestamp
    });
    
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isTimeout = err.message?.includes('timeout');
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - retry' : err.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
