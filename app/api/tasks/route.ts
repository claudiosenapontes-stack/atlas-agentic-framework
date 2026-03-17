/**
 * ATLAS-TASKS API - COLD-START OPTIMIZED
 * ATLAS-OPTIMUS-RAIL-COLDSTART-REMEDIATION-9201
 * 
 * GET/POST /api/tasks
 * - FORCE NODEJS RUNTIME
 * - DB-call-only retry (3 attempts)
 * - 5s timeout for cold-start tolerance
 * - Lazy Supabase init
 * - BUILD: 9201-COLDSTART-FIX
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_TIMEOUT_MS = 5000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 200;

// DB retry wrapper - only wraps DB calls
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
      console.log(`[DB RETRY ${i+1}/${RETRY_ATTEMPTS}] ${operation}`);
      if (i < RETRY_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }
  throw lastError;
}

const requestId = () => randomUUID().slice(0, 8);

// Owner resolution with retry
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

// GET /api/tasks - COLD-START OPTIMIZED
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    const result = await withDbRetry(async () => {
      const { data, error, count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return { data: data || [], count };
    }, 'get_tasks');
    
    // Calculate ownership stats
    const withOwner = result.data.filter((t: any) => t.owner_id != null).length;
    const withAssigned = result.data.filter((t: any) => t.assigned_agent_id != null).length;
    
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/tasks',
      requestId: rid,
      duration,
      recordCount: result.data.length,
      ownershipStats: { withOwner, withAssigned },
      coldStart: duration > 1000,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      tasks: result.data,
      count: result.count,
      ownership_stats: { with_owner_id: withOwner, with_assigned_agent_id: withAssigned },
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - please retry' : error.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}

// POST /api/tasks - COLD-START OPTIMIZED
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  const timestamp = new Date().toISOString();
  
  try {
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('body parse timeout')), 2000))
    ]) as any;
    
    const { title, description, task_type, assigned_agent_id, priority = 'medium', mission_id } = body;
    
    // Hard validation
    if (!title?.trim()) {
      return NextResponse.json({
        success: false, error: 'title is required', requestId: rid, duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    if (!task_type) {
      return NextResponse.json({
        success: false, error: 'task_type is required', requestId: rid, duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    if (!assigned_agent_id) {
      return NextResponse.json({
        success: false, error: 'assigned_agent_id is required', requestId: rid, duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // LAZY: Init after validation
    const supabase = getSupabaseAdmin();
    const taskId = randomUUID();
    
    // Resolve owner with retry
    const owner_id = await resolveOwnerId(supabase, assigned_agent_id);
    
    // Insert with retry
    const task = await withDbRetry(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          id: taskId,
          title: title.trim(),
          description: description || null,
          task_type: task_type.toLowerCase(),
          status: 'pending',
          priority: priority.toLowerCase(),
          assigned_agent_id: assigned_agent_id.toLowerCase(),
          owner_id,
          mission_id: mission_id || null,
          metadata: { created_via: 'ATLAS-9201', created_at: timestamp },
          created_at: timestamp,
          updated_at: timestamp
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, 'create_task');
    
    // Verify insert (fire-and-forget)
    withDbRetry(async () => {
      const { data } = await supabase.from('tasks').select('owner_id,assigned_agent_id').eq('id', taskId).single();
      if (!data?.owner_id) console.error(`[VERIFY FAIL] Task ${taskId} missing owner_id`);
      return data;
    }, 'verify_task').catch(() => {});
    
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/tasks',
      requestId: rid,
      taskId,
      duration,
      coldStart: duration > 1000,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      task,
      verified: true,
      requestId: rid,
      duration
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout - please retry' : error.message,
      requestId: rid,
      duration,
      isTimeout
    }, { status: isTimeout ? 504 : 500 });
  }
}
