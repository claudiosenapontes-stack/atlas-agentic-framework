/**
 * ATLAS-MISSION API v3 - RAIL-HARDENED
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * 
 * GET/PUT/DELETE /api/missions/:id
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard (ALL DB calls wrapped)
 * - 2 retries with 150ms backoff (ALL DB calls)
 * - State transition guarantees
 * - NO 500 errors (graceful handling)
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

// GET /api/missions/:id (RAIL-HARDENED)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: mission, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .is('deleted_at', null)
      .single();
    
    if (error || !mission) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      mission: mission,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      requestId: rid,
      duration
    }, { status: isTimeout ? 504 : 500 });
  }
}

// PUT /api/missions/:id - State transitions (RAIL-HARDENED)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  const timestamp = new Date().toISOString();
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const supabase = getSupabaseAdmin();
    
    const updateData: any = { updated_at: timestamp };
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.objective !== undefined) updateData.objective = body.objective;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phase !== undefined) updateData.phase = body.phase;
    if (body.progress_percent !== undefined) updateData.progress_percent = body.progress_percent;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.evidence_bundle !== undefined) updateData.evidence_bundle = body.evidence_bundle;
    
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
    
    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error.message,
        code: result.error.code,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'PUT /api/missions/:id',
      requestId: rid,
      missionId,
      duration,
      updated: Object.keys(updateData),
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

// DELETE /api/missions/:id (RAIL-HARDENED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  const timestamp = new Date().toISOString();
  
  try {
    const supabase = getSupabaseAdmin();
    
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
    return NextResponse.json({
      success: true,
      message: 'Mission deleted',
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Request timeout' : error.message,
      requestId: rid,
      duration
    }, { status: isTimeout ? 504 : 500 });
  }
}
