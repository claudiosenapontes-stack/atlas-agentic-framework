/**
 * ATLAS-TASKS API v2 - RAIL-HARDENED
 * ATLAS-OPTIMUS-TASK-ENGINE-CLOSEOUT-5002
 * 
 * GET/POST /api/tasks
 * - FORCE NODEJS RUNTIME
 * - 3s timeout guard
 * - 2 retries with 150ms backoff
 * - VERIFY after insert
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

// POST /api/tasks - Create with verification
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  const timestamp = new Date().toISOString();
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const { title, description, task_type, assigned_agent_id, priority = 'medium', mission_id } = body;
    
    // Validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    if (!assigned_agent_id) {
      return NextResponse.json({
        success: false,
        error: 'assigned_agent_id is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
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
    
    // Insert task with retry+timeout
    const insertResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('tasks')
          .insert({
            id: taskId,
            title: title.trim(),
            description: description || null,
            task_type: task_type.toLowerCase(),
            status: 'pending',
            priority: priority.toLowerCase(),
            assigned_agent_id: assigned_agent_id.toLowerCase(),
            mission_id: mission_id || null,
            claimed_at: null,
            execution_result: null,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .select(),
        3000
      )
    );
    
    if (insertResult.error) throw insertResult.error;
    
    // VERIFY: Immediately select the task back
    const verifyResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single(),
        3000
      )
    );
    
    if (verifyResult.error || !verifyResult.data) {
      throw new Error('Task verification failed after insert');
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/tasks',
      requestId: rid,
      taskId,
      duration,
      verified: true,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      task: verifyResult.data,
      verified: true,
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
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/tasks',
      requestId: rid,
      duration,
      count: result.data?.length || 0,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      tasks: result.data || [],
      count: result.data?.length || 0,
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
