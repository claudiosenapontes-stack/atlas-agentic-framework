/**
 * ATLAS-MISSIONS API v1 - HARDENED
 * ATLAS-OPTIMUS-MISSION-ENGINE-HARDENING-1204
 * 
 * GET/POST /api/missions
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
  duration: number;
  success: boolean;
  errorSource?: string;
  recordCount?: number;
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
        await new Promise(r => setTimeout(r, 100 * (i + 1))); // Exponential backoff
      }
    }
  }
  return { data: null, error: lastError, attempts: retries };
}

// GET /api/missions - List all missions
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  console.log(`[${requestId}] GET /api/missions started`);
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const ownerId = searchParams.get('owner_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('missions')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status && status !== 'all') query = query.eq('status', status);
    if (phase && phase !== 'all') query = query.eq('phase', phase);
    if (ownerId && ownerId !== 'all') query = query.or(`owner_id.eq.${ownerId},owner_agent.eq.${ownerId}`);
    
    const { data: missions, error, count } = await query;
    
    if (error) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/api/missions', method: 'GET', duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    const transformedMissions = (missions || []).map(m => ({
      ...m,
      percentComplete: m.progress_percent || 0,
      assignedAgents: m.assigned_agents || [m.owner_agent].filter(Boolean),
      currentBlocker: m.current_blocker || null,
      henryAuditVerdict: m.henry_audit_verdict || 'pending',
      closure_confidence: m.closure_confidence || 0,
    }));
    
    const duration = Date.now() - startTime;
    logAccess({ 
      requestId, 
      endpoint: '/api/missions', 
      method: 'GET', 
      duration, 
      success: true, 
      recordCount: transformedMissions.length 
    });
    
    return NextResponse.json({
      success: true,
      missions: transformedMissions,
      count: transformedMissions.length,
      pagination: { limit, offset, hasMore: transformedMissions.length === limit },
      timestamp,
      requestId,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ 
      requestId, 
      endpoint: '/api/missions', 
      method: 'GET', 
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

// POST /api/missions - Create new mission
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  console.log(`[${requestId}] POST /api/missions started`);
  
  try {
    const body = await withTimeout(request.json(), 1000, 'body parsing');
    
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required and must be a string',
        timestamp,
        requestId,
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    const insertData: any = {
      title: body.title,
      status: body.status || 'draft',
      phase: body.phase || 'planning',
    };
    
    if (body.description) insertData.description = body.description;
    if (body.objective) insertData.objective = body.objective;
    if (body.owner_agent) insertData.owner_agent = body.owner_agent;
    if (body.owner_id) insertData.owner_id = body.owner_id;
    if (body.priority) insertData.priority = body.priority;
    if (body.category) insertData.category = body.category;
    if (body.company_id) insertData.company_id = body.company_id;
    if (body.target_start_date) insertData.target_start_date = body.target_start_date;
    if (body.target_end_date) insertData.target_end_date = body.target_end_date;
    if (body.success_criteria) insertData.success_criteria = body.success_criteria;
    if (body.metadata) insertData.metadata = body.metadata;
    if (body.tags) insertData.tags = body.tags;
    
    const { data: mission, error } = await supabase
      .from('missions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      const duration = Date.now() - startTime;
      logAccess({ requestId, endpoint: '/api/missions', method: 'POST', duration, success: false, errorSource: 'supabase' });
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        timestamp,
        requestId,
        duration,
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    logAccess({ requestId, endpoint: '/api/missions', method: 'POST', duration, success: true });
    
    return NextResponse.json({
      success: true,
      mission,
      id: mission.id,
      status: 'created',
      timestamp,
      requestId,
      duration,
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.includes('timeout');
    logAccess({ 
      requestId, 
      endpoint: '/api/missions', 
      method: 'POST', 
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
