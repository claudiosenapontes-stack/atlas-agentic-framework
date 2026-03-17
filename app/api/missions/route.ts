/**
 * ATLAS-MISSIONS API - RAIL-HARDENED v2
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * 
 * GET/POST /api/missions
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard (ALL DB calls wrapped)
 * - 2 retries with 150ms backoff (ALL DB calls)
 * - Structured logging (requestId, duration)
 * - NO DEMO FALLBACK
 * - FAST HEALTH CHECK FORMAT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

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

// GET /api/missions - List all missions (RAIL-HARDENED)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = getSupabaseAdmin();
    
    // WRAPPED: withRetry + withTimeout
    const result = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .select('*', { count: 'exact' })
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        3000
      )
    );
    
    if (result.error) throw result.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/missions',
      requestId: rid,
      duration,
      recordCount: result.data?.length || 0,
      success: true
    }));
    
    // FAST HEALTH CHECK FORMAT
    return NextResponse.json({
      success: true,
      missions: result.data || [],
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'GET /api/missions',
      requestId: rid,
      duration,
      errorSource: isTimeout ? 'timeout' : 'supabase',
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

// POST /api/missions - Create new mission (RAIL-HARDENED)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const rid = requestId();
  
  try {
    const body = await withTimeout(request.json(), 1000);
    
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'title is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // WRAPPED: withRetry + withTimeout
    const result = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .insert({
            title: body.title,
            status: body.status || 'draft',
            phase: body.phase || 'planning',
            description: body.description || null,
            objective: body.objective || null,
            priority: body.priority || 'medium',
            owner_agent: body.owner_agent || request.headers.get('x-agent-id') || null,
            henry_audit_verdict: 'pending',
            closure_confidence: 0,
            blocked_reason: body.blocked_reason || null
          })
          .select()
          .single(),
        3000
      )
    );
    
    if (result.error) throw result.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions',
      requestId: rid,
      duration,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: result.data,
      requestId: rid,
      duration
    }, { status: 201 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions',
      requestId: rid,
      duration,
      errorSource: isTimeout ? 'timeout' : 'exception',
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
// INTEGRITY-9002 Tue Mar 17 00:40:50 EDT 2026
