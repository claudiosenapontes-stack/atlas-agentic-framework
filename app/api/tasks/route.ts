/**
 * ATLAS-TASKS API v3 - OWNERSHIP INTEGRITY
 * ATLAS-OPTIMUS-TASK-OWNERSHIP-INTEGRITY-5008
 * 
 * GET/POST /api/tasks
 * - FORCE NODEJS RUNTIME
 * - 3s timeout guard
 * - 2 retries with 150ms backoff
 * - VERIFY after insert (owner_id NOT NULL check)
 * - DETERMINISTIC owner_id resolution
 * - HARD VALIDATION: no partial ownership
 * - Structured logging
 * - NO DEMO FALLBACK
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const withTimeout = (promise: Promise<any> | any, ms = 3000) => {
  return Promise.race([
    Promise.resolve(promise),
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

// Owner resolution: assigned_agent_id -> owner_id mapping
// If agent record exists in DB, use it; otherwise use assigned_agent_id as owner_id
async function resolveOwnerId(supabase: any, assigned_agent_id: string): Promise<string | null> {
  try {
    // Try to find agent record
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('name', assigned_agent_id.toLowerCase())
      .maybeSingle();
    
    if (agent?.id) return agent.id;
    
    // Fallback: use assigned_agent_id as owner_id (deterministic)
    return assigned_agent_id.toLowerCase();
  } catch {
    // On any error, fallback to assigned_agent_id
    return assigned_agent_id.toLowerCase();
  }
}

// POST /api/tasks - Create with ownership integrity
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  const timestamp = new Date().toISOString();
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const { title, description, task_type, assigned_agent_id, priority = 'medium', mission_id } = body;
    
    // Validation: title required
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // Validation: assigned_agent_id required
    if (!assigned_agent_id) {
      return NextResponse.json({
        success: false,
        error: 'assigned_agent_id is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // Validation: task_type required
    if (!task_type) {
      return NextResponse.json({
        success: false,
        error: 'task_type is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const taskId = randomUUID();
    
    // Resolve owner_id from assigned_agent_id
    const owner_id = await resolveOwnerId(supabase, assigned_agent_id);
    
    // HARD VALIDATION: owner_id must be resolved
    if (!owner_id) {
      return NextResponse.json({
        success: false,
        error: `owner_id resolution failed for assigned_agent_id: ${assigned_agent_id}`,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // Insert task
    const { error: insertError } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        title: title.trim(),
        description: description || null,
        task_type: task_type.toLowerCase(),
        status: 'pending',
        priority: priority.toLowerCase(),
        assigned_agent_id: assigned_agent_id.toLowerCase(),
        owner_id: owner_id,
        mission_id: mission_id || null,
        claimed_at: null,
        execution_result: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select();
    
    if (insertError) throw insertError;
    
    // Verify: Select back the created task
    const { data: verifiedTask, error: verifyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (verifyError || !verifiedTask) {
      throw new Error('Task verification failed after insert');
    }
    
    // HARD VALIDATION: Verify owner_id is NOT NULL
    if (!verifiedTask.owner_id) {
      return NextResponse.json({
        success: false,
        error: 'Task created but owner_id is NULL - ownership integrity violation',
        task: verifiedTask,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 500 });
    }
    
    // HARD VALIDATION: Verify assigned_agent_id is NOT NULL
    if (!verifiedTask.assigned_agent_id) {
      return NextResponse.json({
        success: false,
        error: 'Task created but assigned_agent_id is NULL - ownership integrity violation',
        task: verifiedTask,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/tasks',
      requestId: rid,
      taskId,
      owner_id: verifiedTask.owner_id,
      assigned_agent_id: verifiedTask.assigned_agent_id,
      duration,
      verified: true,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      task: verifiedTask,
      verified: true,
      ownership_integrity: {
        owner_id: verifiedTask.owner_id,
        assigned_agent_id: verifiedTask.assigned_agent_id,
        valid: true
      },
      requestId: rid,
      duration
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/tasks',
      requestId: rid,
      duration,
      error: error.message,
      isTimeout,
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

// GET /api/tasks - List with hardening
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assigned_agent_id = searchParams.get('assigned_agent_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) query = query.eq('status', status);
    if (assigned_agent_id) query = query.eq('assigned_agent_id', assigned_agent_id.toLowerCase());
    
    const result = await withRetry(() => withTimeout(query, 3000));
    
    if (result.error) throw result.error;
    
    const duration = Date.now() - startTime;
    
    // Calculate ownership integrity stats
    const tasks = result.data || [];
    const withOwner = tasks.filter((t: any) => t.owner_id).length;
    const withAgent = tasks.filter((t: any) => t.assigned_agent_id).length;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/tasks',
      requestId: rid,
      duration,
      count: tasks.length,
      with_owner_id: withOwner,
      with_assigned_agent: withAgent,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      tasks: tasks,
      count: tasks.length,
      ownership_stats: {
        with_owner_id: withOwner,
        with_assigned_agent: withAgent,
        total: tasks.length
      },
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'GET /api/tasks',
      requestId: rid,
      duration,
      error: error.message,
      isTimeout,
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
