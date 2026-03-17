/**
 * ATLAS-MISSION API v1 - HARDENED
 * ATLAS-OPTIMUS-MISSION-ENGINE-HARDENING-1204
 * 
 * GET/PUT/DELETE /api/missions/:id
 * - 3s timeout guard
 * - Retry logic (2 attempts)
 * - Comprehensive logging
 * - Parallelized safe calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_EXECUTION_MS = 3000;
const VALID_STATUSES = ['draft', 'requested', 'decomposed', 'executing', 'remediating', 'verifying', 'blocked', 'closed', 'cancelled'];
const VALID_PHASES = ['planning', 'execution', 'verification', 'closure'];

interface LogEntry {
  requestId: string;
  endpoint: string;
  method: string;
  missionId: string;
  duration: number;
  success: boolean;
  errorSource?: string;
}

function logAccess(entry: LogEntry) {
  console.log(JSON.stringify({
    level: entry.success ? 'info' : 'error',
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 2, 
  context: string
): Promise<{ data: T | null; error: any; attempts: number }> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const data = await fn();
      return { data, error: null, attempts: i + 1 };
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
      }
    }
  }
  return { data: null, error: lastError, attempts: retries };
}

// GET /api/missions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  const startTime = Date.now();
  
  console.log(`[${requestId}] GET /api/missions/${missionId} started`);
  
  try {
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('include_tasks') === 'true';
    
    const supabase = getSupabaseAdmin();
    
    const query = includeTasks
      ? supabase.from('missions').select(`*, mission_tasks(task_id, tasks(*))`).eq('id', missionId).is('deleted_at', null).single()
      : supabase.from('missions').select('*').eq('id', missionId).is('deleted_at', null).single();
    
    const result = await withTimeout(
      query,
      MAX_EXECUTION_MS,
      'Supabase GET single'
    ) as { data: any; error: any };
    const { data: mission, error } = result;
    
    if (error || !mission) {
      const duration = Date.now() - startTime;
      const status = error?.code === 'PGRST116' ? 404 : 500;
      logAccess({ 
        requestId, 
        endpoint: '/api/missions/:id', 
        method: 'GET', 
        missionId,
        duration, 
        success: false, 
        errorSource: error?.code === 'PGRST116' ? 'not_found' : 'supabase' 
      });
      
      return NextResponse.json({
        success: false,
        error: error?.code === 'PGRST116' ? 'Mission not found' : (error?.message || 'Internal server error'),
        timestamp,
        requestId,
        duration,
      }, { status });
    }
    
    const transformedMission = {
      ...mission,
      percentComplete: mission.progress_percent || 0,
      assignedAgents: mission.assigned_agents || [mission.owner_agent].filter(Boolean),
      currentBlocker: mission.current_blocker,
      henryAuditVerdict: mission.henry_audit_verdict || 'pending',
      closure_confidence: mission.closure_confidence || 0,
    };
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/api/missions/:id', method: 'GET', missionId, duration, success: true });
    
    return NextResponse.json({
      success: true,
      mission: transformedMission,
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ 
      requestId, 
      endpoint: '/api/missions/:id', 
      method: 'GET', 
      missionId,
      duration, 
      success: false, 
      errorSource: isTimeout ? 'timeout' : 'exception' 
    });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}

// PUT /api/missions/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  const startTime = Date.now();
  
  console.log(`[${requestId}] PUT /api/missions/${missionId} started`);
  
  try {
    const body = await withTimeout(request.json(), 1000, 'body parsing');
    const supabase = getSupabaseAdmin();
    
    const updateData: any = { updated_at: timestamp };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.objective !== undefined) updateData.objective = body.objective;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phase !== undefined) updateData.phase = body.phase;
    if (body.owner_agent !== undefined) updateData.owner_agent = body.owner_agent;
    if (body.owner_id !== undefined) updateData.owner_id = body.owner_id;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.progress_percent !== undefined) updateData.progress_percent = body.progress_percent;
    if (body.closure_confidence !== undefined) updateData.closure_confidence = body.closure_confidence;
    if (body.current_blocker !== undefined) updateData.current_blocker = body.current_blocker;
    if (body.henry_audit_verdict !== undefined) updateData.henry_audit_verdict = body.henry_audit_verdict;
    if (body.target_start_date !== undefined) updateData.target_start_date = body.target_start_date;
    if (body.target_end_date !== undefined) updateData.target_end_date = body.target_end_date;
    if (body.actual_start_date !== undefined) updateData.actual_start_date = body.actual_start_date;
    if (body.actual_end_date !== undefined) updateData.actual_end_date = body.actual_end_date;
    if (body.success_criteria !== undefined) updateData.success_criteria = body.success_criteria;
    if (body.evidence_bundle !== undefined) updateData.evidence_bundle = body.evidence_bundle;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.tags !== undefined) updateData.tags = body.tags;
    
    if (body.status === 'active' && !body.actual_start_date) updateData.actual_start_date = timestamp;
    if ((body.status === 'closed' || body.status === 'completed') && !body.actual_end_date) updateData.actual_end_date = timestamp;
    
    const { data: mission, error } = await withTimeout(
      withRetry(() => 
        supabase.from('missions').update(updateData).eq('id', missionId).is('deleted_at', null).select().single(),
        2,
        'PUT mission'
      ).then(r => {
        if (r.error) throw r.error;
        return { data: r.data, error: null };
      }),
      MAX_EXECUTION_MS,
      'Supabase PUT'
    );
    
    if (error) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/api/missions/:id', method: 'PUT', missionId, duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    // Fire-and-forget status history (non-blocking)
    if (body.status) {
      supabase.from('mission_status_history').insert({
        mission_id: missionId,
        previous_status: mission.status,
        new_status: body.status,
        changed_by: body.changed_by || null,
        reason: body.status_change_reason || null,
      }).then(() => {}).catch(() => {});
    }
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/api/missions/:id', method: 'PUT', missionId, duration, success: true });
    
    return NextResponse.json({
      success: true,
      mission,
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ 
      requestId, 
      endpoint: '/api/missions/:id', 
      method: 'PUT', 
      missionId,
      duration, 
      success: false, 
      errorSource: isTimeout ? 'timeout' : 'exception' 
    });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}

// DELETE /api/missions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const missionId = params.id;
  const startTime = Date.now();
  
  console.log(`[${requestId}] DELETE /api/missions/${missionId} started`);
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { error } = await withTimeout(
      withRetry(() => 
        supabase.from('missions').update({ deleted_at: timestamp, updated_at: timestamp }).eq('id', missionId).is('deleted_at', null),
        2,
        'DELETE mission'
      ).then(r => {
        if (r.error) throw r.error;
        return { error: null };
      }),
      MAX_EXECUTION_MS,
      'Supabase DELETE'
    );
    
    if (error) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/api/missions/:id', method: 'DELETE', missionId, duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/api/missions/:id', method: 'DELETE', missionId, duration, success: true });
    
    return NextResponse.json({
      success: true,
      message: 'Mission deleted successfully',
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ 
      requestId, 
      endpoint: '/api/missions/:id', 
      method: 'DELETE', 
      missionId,
      duration, 
      success: false, 
      errorSource: isTimeout ? 'timeout' : 'exception' 
    });
    
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      timestamp,
      requestId,
      duration,
    }, { status: isTimeout ? 504 : 500 });
  }
}
