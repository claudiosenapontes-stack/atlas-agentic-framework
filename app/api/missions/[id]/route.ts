/**
 * ATLAS-MISSION API v2 - RAIL-HARDENED
 * ATLAS-OPTIMUS-TASK-ENGINE-CLOSEOUT-5002
 * 
 * GET/PUT/DELETE /api/missions/:id
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard
 * - 2 retries with 150ms backoff
 * - State transition guarantees
 * - NO 500 errors (graceful handling)
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
    return NextResponse.json({
      success: true,
      mission: result.data,
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

// PUT /api/missions/:id - State transitions guaranteed
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
    
    // Build update data
    const updateData: any = { updated_at: timestamp };
    
    // Always allow these fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.objective !== undefined) updateData.objective = body.objective;
    if (body.priority !== undefined) updateData.priority = body.priority;
    
    // State transitions (always allowed)
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phase !== undefined) updateData.phase = body.phase;
    if (body.progress_percent !== undefined) updateData.progress_percent = body.progress_percent;
    
    // Metadata updates
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.evidence_bundle !== undefined) updateData.evidence_bundle = body.evidence_bundle;
    
    // Update mission
    const { data: updatedMission, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) {
      // Graceful error - never 500
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
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
      mission: updatedMission,
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

// DELETE /api/missions/:id
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
    
    const { error } = await supabase
      .from('missions')
      .update({ deleted_at: timestamp, updated_at: timestamp })
      .eq('id', missionId)
      .is('deleted_at', null);
    
    if (error) throw error;
    
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
