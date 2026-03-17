/**
 * POST /api/missions/:id/reopen - RAIL-HARDENED v2
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard (ALL DB calls wrapped)
 * - 2 retries with 150ms backoff (ALL DB calls)
 * - Structured logging (requestId, duration, errorSource)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const rid = requestId();
  const missionId = params.id;
  
  try {
    const body = await withTimeout(request.json(), 1000);
    const { reopen_reason, reopened_by, new_phase = 'execution' } = body;
    
    if (!reopen_reason) {
      return NextResponse.json({
        success: false,
        error: 'reopen_reason is required',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    
    // WRAPPED: Get mission with retry+timeout
    const missionResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .select('id,status,phase,evidence_bundle')
          .eq('id', missionId)
          .is('deleted_at', null)
          .single(),
        3000
      )
    );
    
    if (!missionResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Mission not found',
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 404 });
    }
    
    if (missionResult.data.status !== 'closed' && missionResult.data.status !== 'cancelled') {
      return NextResponse.json({
        success: false,
        error: `Cannot reopen mission with status: ${missionResult.data.status}`,
        requestId: rid,
        duration: Date.now() - startTime
      }, { status: 400 });
    }
    
    // WRAPPED: Update mission with retry+timeout
    const updateResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .update({
            status: 'active',
            phase: new_phase,
            actual_end_date: null,
            evidence_bundle: {
              ...missionResult.data.evidence_bundle,
              reopen: {
                reopened_at: timestamp,
                reopened_by,
                reason: reopen_reason,
                previous_status: missionResult.data.status
              }
            },
            updated_at: timestamp
          })
          .eq('id', missionId)
          .select('id,status,phase')
          .single(),
        3000
      )
    );
    
    if (updateResult.error) throw updateResult.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/reopen',
      requestId: rid,
      missionId,
      duration,
      success: true
    }));
    
    return NextResponse.json({
      success: true,
      mission: updateResult.data,
      requestId: rid,
      duration
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message === 'timeout';
    console.log(JSON.stringify({
      level: 'error',
      endpoint: 'POST /api/missions/:id/reopen',
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
