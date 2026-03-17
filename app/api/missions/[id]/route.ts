/**
 * ATLAS-MISSION API v1 - RAIL-HARDENED
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * 
 * GET/PUT/DELETE /api/missions/:id
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard
 * - 2 retries with 150ms backoff
 * - Structured logging (requestId, duration, errorSource)
 * - NO DEMO FALLBACK
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const withTimeout = (promise: Promise<any>, ms = 3000) => {
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

// GET /api/missions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const supabase = getSupabaseAdmin();
    
    const result = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .is('deleted_at', null)
          .single(),
        3000
      )
    );
    
    if (!result.data) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'GET /api/missions/:id',
      requestId: rid,
      missionId,
      duration,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: result.data,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'GET /api/missions/:id',
      requestId: rid,
      missionId,
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

// PUT /api/missions/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const supabase = getSupabaseAdmin();
    
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phase !== undefined) updateData.phase = body.phase;
    if (body.priority !== undefined) updateData.priority = body.priority;
    
    const result = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .update(updateData)
          .eq('id', missionId)
          .is('deleted_at', null)
          .select()
          .single(),
        3000
      )
    );
    
    if (result.error) throw result.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'PUT /api/missions/:id',
      requestId: rid,
      missionId,
      duration,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: result.data,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'PUT /api/missions/:id',
      requestId: rid,
      missionId,
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

// DELETE /api/missions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    const result = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .update({ deleted_at: timestamp, updated_at: timestamp })
          .eq('id', missionId)
          .is('deleted_at', null),
        3000
      )
    );
    
    if (result.error) throw result.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'DELETE /api/missions/:id',
      requestId: rid,
      missionId,
      duration,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Mission deleted',
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'DELETE /api/missions/:id',
      requestId: rid,
      missionId,
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
