/**
 * POST /api/missions/:id/verify - RAIL-HARDENED
 * ATLAS-OPTIMUS-RAIL-HARDENING-FINAL-3001
 * - FORCE NODEJS RUNTIME (NO EDGE)
 * - 3s global timeout guard
 * - 2 retries with 150ms backoff
 * - SIMPLE queries only (NO HEAVY JOINS)
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
    const { verification_notes, verified_by } = body;
    
    const supabase = getSupabaseAdmin();
    
    // SIMPLE: Get mission only
    const missionResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .select('id,evidence_bundle')
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
    
    // Update with verification
    const updatedEvidence = {
      ...missionResult.data.evidence_bundle,
      verification: {
        verified_at: new Date().toISOString(),
        verified_by,
        notes: verification_notes
      }
    };
    
    const updateResult = await withRetry(() =>
      withTimeout(
        supabase
          .from('missions')
          .update({
            phase: 'verification',
            evidence_bundle: updatedEvidence,
            updated_at: new Date().toISOString()
          })
          .eq('id', missionId)
          .select('id,phase,evidence_bundle')
          .single(),
        3000
      )
    );
    
    if (updateResult.error) throw updateResult.error;
    
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: 'info',
      endpoint: 'POST /api/missions/:id/verify',
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
      endpoint: 'POST /api/missions/:id/verify',
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
